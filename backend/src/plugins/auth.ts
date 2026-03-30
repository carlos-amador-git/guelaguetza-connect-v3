import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  userId: string; // Alias for backward compatibility
  email: string;
  role: UserRole;
  bannedAt: Date | null;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Use JWT_ACCESS_SECRET or fallback to JWT_SECRET
const getSecret = (): Uint8Array => {
  console.log('[AUTH] getSecret called, checking env vars');
  console.log('[AUTH] JWT_ACCESS_SECRET set:', !!process.env.JWT_ACCESS_SECRET);
  console.log('[AUTH] JWT_SECRET set:', !!process.env.JWT_SECRET);
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    console.error('[AUTH] No JWT secret found!');
    throw new Error('JWT_ACCESS_SECRET or JWT_SECRET environment variable is required');
  }
  const encoded = new TextEncoder().encode(secret);
  console.log('[AUTH DEBUG] Secret length:', secret.length, 'Encoded length:', encoded.length);
  return encoded;
};

const authPlugin: FastifyPluginAsync = async (fastify) => {
  console.log('[AUTH PLUGIN] Registering authenticate decorator');
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('[AUTH] authenticate called for:', request.url);
    try {
      console.log('[AUTH] Inside try block, getting header');
      const authHeader = request.headers.authorization;
      console.log('[AUTH] Header:', authHeader ? 'present' : 'missing', authHeader?.substring(0, 20));
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Token requerido' });
      }

      const token = authHeader.substring(7);
      console.log('[AUTH] About to verify token, length:', token.length, 'secret env check:', !!process.env.JWT_SECRET);
      
      // Verify the JWT token using jose directly
      const { payload } = await jwtVerify(token, getSecret(), {
        algorithms: ['HS256'],
      });
      console.log('[AUTH] Token verified successfully');

      // Support both 'sub' (new tokens) and 'userId' (legacy tokens)
      const userId = (payload as any).sub || (payload as any).userId;
      if (!userId) {
        return reply.status(401).send({ error: 'Token inválido' });
      }

      // Validate token type
      if ((payload as any).type && (payload as any).type !== 'access') {
        return reply.status(401).send({ error: 'Token inválido: tipo incorrecto' });
      }

      // Fetch full user data including role
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, bannedAt: true },
      });

      if (!user) {
        return reply.status(401).send({ error: 'Usuario no encontrado' });
      }

      if (user.bannedAt) {
        return reply.status(403).send({ error: 'Tu cuenta ha sido suspendida' });
      }

      // Set request.user with full user data (include userId alias for backward compatibility)
      (request as unknown as { user: AuthUser }).user = {
        ...user,
        userId: user.id,
      };
    } catch (error: any) {
      console.error('[AUTH CATCH] Error:', error?.message, error?.stack);
      fastify.log.error('Auth error:', error?.message, error?.code, error?.cause);
      reply.status(401).send({ error: 'Token inválido o expirado', details: error?.message });
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
