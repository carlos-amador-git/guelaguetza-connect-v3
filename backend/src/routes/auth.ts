import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema.js';
import { AppError } from '../utils/errors.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const REFRESH_TOKEN_COOKIE = 'gc_refresh_token';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Schemas adicionales
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es requerido'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const resetPasswordSchema = z.object({
  userId: z.string().min(1, 'userId es requerido'),
  token: z.string().min(1, 'Token es requerido'),
  newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  /** Sets httpOnly cookie with refresh token */
  function setRefreshCookie(reply: any, refreshToken: string) {
    reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: IS_PRODUCTION ? 'strict' : 'lax',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  // Register - Devuelve tokens JWT modernos
  fastify.post('/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const result = await authService.register(data);

      setRefreshCookie(reply, result.tokens.refreshToken);

      return reply.status(201).send({
        success: true,
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        // Legacy token para compatibilidad
        token: result.tokens.accessToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Login - Devuelve tokens JWT modernos
  fastify.post('/login', async (request, reply) => {
    try {
      const data = loginSchema.parse(request.body);
      const result = await authService.login(data.email, data.password);

      setRefreshCookie(reply, result.tokens.refreshToken);

      return reply.send({
        success: true,
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        // Legacy token para compatibilidad
        token: result.tokens.accessToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Google OAuth - Verify Google credential and login/register
  fastify.post('/google', async (request, reply) => {
    try {
      const { credential, role } = request.body as { credential: string; role?: string };

      if (!credential) {
        return reply.status(400).send({ error: 'Google credential es requerido' });
      }

      // Decode Google JWT (in production, verify with Google's public keys)
      const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());

      if (!payload.email) {
        return reply.status(400).send({ error: 'Email no disponible en el token de Google' });
      }

      // Check if user exists
      let user = await fastify.prisma.user.findUnique({ where: { email: payload.email } });

      if (!user) {
        // Auto-register Google user
        const bcrypt = await import('bcryptjs');
        const randomPassword = await bcrypt.hash(crypto.randomUUID(), 12);

        user = await fastify.prisma.user.create({
          data: {
            email: payload.email,
            password: randomPassword,
            nombre: payload.given_name || payload.name || 'Usuario',
            apellido: payload.family_name || '',
            avatar: payload.picture || null,
            role: (role === 'ADMIN' ? 'ADMIN' : role === 'SELLER' ? 'USER' : 'USER') as any,
          },
        });
      }

      const result = await authService.login(user.email, '');
      // Since we can't login with empty password, generate tokens directly
      const tokens = await authService.generateTokenPair(user.id, user.email, user.role);

      setRefreshCookie(reply, tokens.refreshToken);

      return reply.send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          avatar: user.avatar,
          role: role || user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        token: tokens.accessToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      // Fallback error
      return reply.status(500).send({ error: 'Error al autenticar con Google' });
    }
  });

  // Refresh tokens - Accepts refresh token from body OR httpOnly cookie
  fastify.post('/refresh', async (request, reply) => {
    try {
      // Try body first, then cookie
      const body = request.body as any;
      const refreshToken =
        body?.refreshToken ||
        (request.cookies && (request.cookies as any)[REFRESH_TOKEN_COOKIE]);

      if (!refreshToken) {
        return reply.status(400).send({ error: 'Refresh token es requerido' });
      }

      const tokens = await authService.refreshTokens(refreshToken);

      setRefreshCookie(reply, tokens.refreshToken);

      return reply.send({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Validate token (public - just verifies token is valid)
  fastify.get('/validate', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ valid: false, error: 'Token requerido' });
      }

      const token = authHeader.substring(7);
      const { jwtVerify } = await import('jose');
      const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
      
      if (!secret) {
        fastify.log.error('JWT_SECRET not configured');
        return reply.status(500).send({ valid: false, error: 'Server config error' });
      }
      
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        const userId = (payload as any).sub || (payload as any).userId;
        
        if (!userId) {
          console.error('Token missing userId:', payload);
          return reply.status(401).send({ valid: false, error: 'Token inválido' });
        }

        console.log('Token validated for user:', userId);
        return reply.send({ valid: true, userId });
      } catch (verifyError: any) {
        console.error('Token verify error:', verifyError?.message, verifyError?.code);
        return reply.status(401).send({ valid: false, error: 'Token inválido o expirado' });
      }
    } catch (error: any) {
      console.error('Validate endpoint error:', error?.message);
      return reply.status(500).send({ valid: false, error: 'Error interno' });
    }
  });

  // Get profile (authenticated)
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await authService.getProfile(request.user.userId);
      return reply.send(user);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Update profile (authenticated)
  fastify.put('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = updateProfileSchema.parse(request.body);
      const user = await authService.updateProfile(request.user.userId, data);
      return reply.send(user);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Change password (authenticated)
  fastify.post('/change-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = changePasswordSchema.parse(request.body);
      const result = await authService.changePassword(
        request.user.userId,
        data.currentPassword,
        data.newPassword
      );
      return reply.send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Forgot password - sends reset email
  fastify.post('/forgot-password', async (request, reply) => {
    try {
      const data = forgotPasswordSchema.parse(request.body);
      const result = await authService.forgotPassword(data.email);
      return reply.send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Reset password with token
  fastify.post('/reset-password', async (request, reply) => {
    try {
      const data = resetPasswordSchema.parse(request.body);
      const result = await authService.resetPassword(data.userId, data.token, data.newPassword);
      return reply.send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Logout current session (blacklist current refresh token)
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const body = request.body as any;
      const refreshToken =
        body?.refreshToken ||
        (request.cookies && (request.cookies as any)[REFRESH_TOKEN_COOKIE]);

      if (refreshToken) {
        await authService.revokeToken(refreshToken);
      }

      // Clear refresh token cookie
      reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });

      return reply.send({ success: true, message: 'Sesión cerrada correctamente' });
    } catch (error) {
      // Even if token revocation fails, clear the cookie and return success
      reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
      return reply.send({ success: true, message: 'Sesión cerrada correctamente' });
    }
  });

  // Logout from all devices (authenticated)
  fastify.post('/logout-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await authService.revokeAllTokens(request.user.userId);
      return reply.send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });
};

export default authRoutes;
