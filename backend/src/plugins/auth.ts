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
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET or JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
};

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Token requerido' });
      }

      const token = authHeader.substring(7);
      
      // Verify the JWT token using jose directly
      const { payload } = await jwtVerify(token, getSecret(), {
        algorithms: ['HS256'],
      });

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
      fastify.log.error('Auth error:', error?.message, error?.code);
      reply.status(401).send({ error: 'Token inválido o expirado' });
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
