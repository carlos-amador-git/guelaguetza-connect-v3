import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import websocket from '@fastify/websocket';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import redisPlugin from './plugins/redis.js';
import eventBusPlugin from './plugins/eventBus.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import sentryPlugin from './plugins/sentry.js';
import authRoutes from './routes/auth.js';
import storiesRoutes from './routes/stories.js';
import transportRoutes from './routes/transport.js';
import chatRoutes from './routes/chat.js';
import pushRoutes from './routes/push.js';
import socialRoutes from './routes/social.js';
import gamificationRoutes from './routes/gamification.js';
import notificationsRoutes from './routes/notifications.js';
import dmRoutes from './routes/dm.js';
import searchRoutes from './routes/search.js';
import eventsRoutes from './routes/events.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import communitiesRoutes from './routes/communities.js';
import bookingsRoutes from './routes/bookings.js';
import poiRoutes from './routes/poi.js';
import marketplaceRoutes from './routes/marketplace.js';
import uploadRoutes from './routes/upload.js';
import uploadLocalRoutes from './routes/upload-local.js';
import streamsRoutes from './routes/streams.js';
import arRoutes from './routes/ar.js';
import metricsRoutes from './routes/metrics.js';
import { ZodError } from 'zod';
import {
  httpRequestsTotal,
  httpRequestDuration,
  startTimerWithLabels,
} from './utils/metrics.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Set up Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });

  // Register response compression
  await app.register(compress, { global: true });

  // Register CORS
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGINS || 'https://guelaguetzaconnect.com').split(',')
      : true,
    credentials: true,
  });

  // Register multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  // Register cookie support for httpOnly refresh tokens
  const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
  if (!cookieSecret && process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET or JWT_SECRET environment variable required in production');
  }
  await app.register(cookie, {
    secret: cookieSecret || 'dev-cookie-secret',
  });

  // Register WebSocket support
  await app.register(websocket);

  // Serve uploaded files with permissive headers (from shared volume or local dir)
  const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/api/uploads/',
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  });

  // Redirect legacy /uploads/ URLs to /api/uploads/ for backwards compatibility
  app.get('/uploads/*', async (request, reply) => {
    const filename = (request.params as { '*': string })['*'];
    return reply.redirect(301, `/api/uploads/${filename}`);
  });

  // Register plugins
  await app.register(sentryPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(eventBusPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);

  // HTTP request metrics middleware
  app.addHook('onRequest', async (request, reply) => {
    // Store start time for duration tracking
    (request as any).metricsStartTime = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).metricsStartTime;
    if (startTime) {
      const endTime = process.hrtime.bigint();
      const durationNs = Number(endTime - startTime);
      const durationSeconds = durationNs / 1e9;

      // Normalize route for metrics (replace IDs with :id)
      const route = request.routeOptions?.url || request.url;
      const normalizedRoute = route
        .replace(/\/[a-f0-9-]{36}/gi, '/:id') // UUID
        .replace(/\/[a-z0-9]{24,25}/gi, '/:id') // CUID
        .replace(/\/\d+/g, '/:id'); // Numeric IDs

      // Record metrics
      httpRequestsTotal.inc({
        method: request.method,
        route: normalizedRoute,
        status_code: String(reply.statusCode),
      });

      httpRequestDuration.observe(
        { method: request.method, route: normalizedRoute },
        durationSeconds
      );
    }
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(storiesRoutes, { prefix: '/api/stories' });
  await app.register(transportRoutes, { prefix: '/api/transport' });
  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(pushRoutes, { prefix: '/api/push' });
  await app.register(socialRoutes, { prefix: '/api' });
  await app.register(gamificationRoutes, { prefix: '/api/gamification' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(dmRoutes, { prefix: '/api/dm' });
  await app.register(searchRoutes, { prefix: '/api/search' });
  await app.register(eventsRoutes, { prefix: '/api/events' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(communitiesRoutes, { prefix: '/api/communities' });
  await app.register(bookingsRoutes, { prefix: '/api/bookings' });
  await app.register(poiRoutes, { prefix: '/api/poi' });
  await app.register(marketplaceRoutes, { prefix: '/api/marketplace' });
  await app.register(uploadLocalRoutes, { prefix: '/api/upload' });
  await app.register(streamsRoutes, { prefix: '/api/streams' });
  await app.register(arRoutes, { prefix: '/api/ar' });

  // Metrics endpoint (no prefix, accessed as /metrics)
  await app.register(metricsRoutes);

  // Health check with DB and Redis status
  app.get('/health', async () => {
    const checks: Record<string, string> = {};

    // Check PostgreSQL
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Check Redis
    try {
      checks.redis = app.cache?.isReady() ? 'ok' : 'unavailable';
    } catch {
      checks.redis = 'error';
    }

    const allOk = Object.values(checks).every(v => v === 'ok' || v === 'unavailable');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'Guelaguetza Connect API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        stories: '/api/stories',
        transport: '/api/transport',
        chat: '/api/chat',
        push: '/api/push',
        social: '/api/users, /api/feed',
        gamification: '/api/gamification',
        notifications: '/api/notifications',
        dm: '/api/dm',
        search: '/api/search',
        events: '/api/events',
        analytics: '/api/analytics',
        admin: '/api/admin',
        communities: '/api/communities',
        bookings: '/api/bookings',
        poi: '/api/poi',
        marketplace: '/api/marketplace',
        upload: '/api/upload',
        streams: '/api/streams',
        ar: '/api/ar',
        metrics: '/metrics',
      },
    };
  });

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    app.log.error(error);

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: 'Error de validación',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message;

    return reply.status(statusCode).send({ error: message });
  });

  return app;
}
