import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
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

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string };
    user: AuthUser;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  await fastify.register(fastifyJwt, {
    secret: JWT_SECRET,
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // First verify the JWT token
      const decoded = await request.jwtVerify<{ sub?: string; userId?: string }>();

      // Support both 'sub' (new tokens) and 'userId' (legacy tokens)
      const userId = decoded.sub || decoded.userId;
      if (!userId) {
        return reply.status(401).send({ error: 'Token inválido' });
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
      fastify.log.error('Auth error:', error?.message, error?.code);
      reply.status(401).send({ error: 'No autorizado' });
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
