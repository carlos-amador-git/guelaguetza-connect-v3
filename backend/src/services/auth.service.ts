import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { RegisterInput, UpdateProfileInput } from '../schemas/auth.schema.js';
import { AppError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { getTokenBlacklistService, TokenBlacklistService } from './token-blacklist.service.js';
import { EmailService } from './email.service.js';

// ============================================
// TIPOS Y CONFIGURACIÓN
// ============================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // en segundos
}

export interface JWTPayload {
  sub: string; // userId
  email: string;
  role: string;
  type: 'access' | 'refresh';
  jti: string; // JWT ID único
  familyId?: string; // Token family ID (solo para refresh tokens)
  iat: number;
  exp: number;
}

// ============================================
// ESTRUCTURAS PARA TOKEN ROTATION
// ============================================
// NOTA: Las estructuras UsedToken y TokenFamily ahora se manejan en TokenBlacklistService

interface TokenConfig {
  secret: Uint8Array;
  expiresIn: string;
}

// ============================================
// CONFIGURACIÓN DE TOKENS
// ============================================

const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 días
const BCRYPT_SALT_ROUNDS = 12;

// Convertir secrets a Uint8Array (requerido por jose)
const getAccessTokenSecret = (): Uint8Array => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      return new TextEncoder().encode('test-access-secret-do-not-use-in-production');
    }
    throw new Error('JWT_ACCESS_SECRET or JWT_SECRET environment variable is required');
  }
  const encoded = new TextEncoder().encode(secret);
  console.log('[AUTH SERVICE] Access token secret length:', secret.length, 'Encoded length:', encoded.length);
  return encoded;
};

const getRefreshTokenSecret = (): Uint8Array => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      return new TextEncoder().encode('test-refresh-secret-do-not-use-in-production');
    }
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
};

// Conversión de duración a segundos
const parseExpiration = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
};

// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================

export class AuthService {
  // Servicio de blacklist de tokens (Redis)
  private tokenBlacklistService: TokenBlacklistService;

  constructor(private prisma: PrismaClient) {
    this.tokenBlacklistService = getTokenBlacklistService();
  }

  // ============================================
  // MÉTODOS DE GESTIÓN DE TOKEN ROTATION
  // ============================================

  /**
   * Verifica si una familia de tokens está comprometida
   */
  private async isFamilyCompromised(familyId: string): Promise<boolean> {
    return await this.tokenBlacklistService.isFamilyCompromised(familyId);
  }

  /**
   * Invalida toda una familia de tokens (token reuse attack detectado)
   */
  private async invalidateTokenFamily(familyId: string, userId: string, reason: string): Promise<void> {
    await this.tokenBlacklistService.invalidateFamily(familyId, userId);

    // Log de seguridad
    console.warn(
      `[SECURITY] Token family compromised: ${familyId}`,
      `User: ${userId}`,
      `Reason: ${reason}`,
      `Time: ${new Date().toISOString()}`
    );
  }

  /**
   * Marca un token como usado
   */
  private async markTokenAsUsed(jti: string, familyId: string, userId: string, expiresAt: number): Promise<void> {
    await this.tokenBlacklistService.registerUsedToken(jti, familyId, userId, expiresAt);
  }

  /**
   * Verifica si un token ya fue usado
   */
  private async isTokenUsed(jti: string): Promise<boolean> {
    return await this.tokenBlacklistService.isTokenUsed(jti);
  }

  /**
   * Actualiza la familia con el nuevo JTI actual
   */
  private async updateTokenFamily(familyId: string, newJti: string): Promise<void> {
    await this.tokenBlacklistService.updateFamilyJti(familyId, newJti);
  }

  /**
   * Crea una nueva familia de tokens
   */
  private async createTokenFamily(userId: string, jti: string): Promise<string> {
    const familyId = uuidv4();
    await this.tokenBlacklistService.createFamily(familyId, userId, jti);
    return familyId;
  }

  // ============================================
  // MÉTODOS JWT
  // ============================================

  /**
   * Genera un par de tokens (access + refresh) para un usuario
   * Crea una nueva familia de tokens para el refresh token
   */
  async generateTokenPair(userId: string, email: string, role: string): Promise<TokenPair> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const accessExpiresIn = parseExpiration(ACCESS_TOKEN_EXPIRES_IN);
    const refreshExpiresIn = parseExpiration(REFRESH_TOKEN_EXPIRES_IN);

    // Crear nueva familia de tokens
    const familyId = await this.createTokenFamily(userId, refreshJti);

    // Generar Access Token (sin familyId)
    const accessToken = await new SignJWT({
      sub: userId,
      email,
      role,
      jti: accessJti,
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + accessExpiresIn)
      .sign(getAccessTokenSecret());

    // Generar Refresh Token (con familyId)
    const refreshToken = await new SignJWT({
      sub: userId,
      email,
      role,
      jti: refreshJti,
      familyId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + refreshExpiresIn)
      .sign(getRefreshTokenSecret());

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  /**
   * Genera un nuevo par de tokens rotando el refresh token
   * Mantiene la misma familia pero invalida el token anterior
   */
  private async rotateTokenPair(
    userId: string,
    email: string,
    role: string,
    familyId: string,
    oldJti: string,
    oldExpiration: number
  ): Promise<TokenPair> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const accessExpiresIn = parseExpiration(ACCESS_TOKEN_EXPIRES_IN);
    const refreshExpiresIn = parseExpiration(REFRESH_TOKEN_EXPIRES_IN);

    // Marcar el token anterior como usado
    await this.markTokenAsUsed(oldJti, familyId, userId, oldExpiration);

    // Actualizar la familia con el nuevo JTI
    await this.updateTokenFamily(familyId, refreshJti);

    // Generar nuevo Access Token
    const accessToken = await new SignJWT({
      sub: userId,
      email,
      role,
      jti: accessJti,
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + accessExpiresIn)
      .sign(getAccessTokenSecret());

    // Generar nuevo Refresh Token con la misma familyId
    const refreshToken = await new SignJWT({
      sub: userId,
      email,
      role,
      jti: refreshJti,
      familyId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + refreshExpiresIn)
      .sign(getRefreshTokenSecret());

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  /**
   * Verifica un Access Token y devuelve el payload
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, getAccessTokenSecret(), {
        algorithms: ['HS256'],
      });

      // Validar que sea un access token
      if (payload.type !== 'access') {
        throw new UnauthorizedError('Token inválido: tipo incorrecto');
      }

      return payload as unknown as JWTPayload;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          throw new UnauthorizedError('Token expirado');
        }
        if (error.message.includes('signature')) {
          throw new UnauthorizedError('Token inválido: firma incorrecta');
        }
      }
      throw new UnauthorizedError('Token inválido');
    }
  }

  /**
   * Verifica un Refresh Token y devuelve el payload
   */
  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, getRefreshTokenSecret(), {
        algorithms: ['HS256'],
      });

      // Validar que sea un refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Token inválido: tipo incorrecto');
      }

      return payload as unknown as JWTPayload;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          throw new UnauthorizedError('Refresh token expirado');
        }
        if (error.message.includes('signature')) {
          throw new UnauthorizedError('Refresh token inválido: firma incorrecta');
        }
      }
      throw new UnauthorizedError('Refresh token inválido');
    }
  }

  /**
   * Refresca el par de tokens usando un refresh token válido
   * Implementa rotación de tokens y detección de token reuse attacks
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Verificar refresh token
    const payload = await this.verifyRefreshToken(refreshToken);

    // Validar que el token tenga familyId (tokens nuevos)
    if (!payload.familyId) {
      throw new UnauthorizedError(
        'Token inválido: formato antiguo. Por favor, inicia sesión nuevamente.'
      );
    }

    const { jti, familyId, exp, sub: userId, email, role } = payload;

    // DETECCIÓN DE TOKEN REUSE ATTACK
    // Si este token ya fue usado antes, es un ataque de reuso
    if (await this.isTokenUsed(jti)) {
      console.error(
        `[SECURITY ALERT] Token reuse attack detected!`,
        `JTI: ${jti}`,
        `FamilyID: ${familyId}`,
        `UserID: ${userId}`,
        `Time: ${new Date().toISOString()}`
      );

      // Invalidar toda la familia de tokens
      await this.invalidateTokenFamily(familyId, userId, 'Token reuse attack detected');

      throw new UnauthorizedError(
        'Actividad sospechosa detectada. Por seguridad, todas tus sesiones han sido cerradas. Por favor, inicia sesión nuevamente.'
      );
    }

    // Verificar si la familia ya fue comprometida
    if (await this.isFamilyCompromised(familyId)) {
      throw new UnauthorizedError(
        'Sesión invalidada por seguridad. Por favor, inicia sesión nuevamente.'
      );
    }

    // Verificar que el usuario aún existe y no está baneado
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, bannedAt: true },
    });

    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    if (user.bannedAt) {
      throw new UnauthorizedError('Tu cuenta ha sido suspendida');
    }

    // ROTACIÓN DE TOKENS
    // Generar nuevo par de tokens, invalidando el actual
    return this.rotateTokenPair(user.id, user.email, user.role, familyId, jti, exp);
  }

  // ============================================
  // MÉTODOS DE HASH DE PASSWORDS
  // ============================================

  /**
   * Hashea una contraseña usando bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    }
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verifica una contraseña contra su hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }

  // ============================================
  // MÉTODOS DE AUTENTICACIÓN (EXISTENTES)
  // ============================================

  /**
   * Registra un nuevo usuario y devuelve tokens
   */
  async register(data: RegisterInput) {
    const normalizedEmail = data.email.toLowerCase();

    // Verificar si el email ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('El email ya está registrado', 400);
    }

    // Hash de la contraseña
    const hashedPassword = await this.hashPassword(data.password);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        nombre: data.nombre,
        apellido: data.apellido,
        region: data.region,
        role: (data as any).role || 'USER',
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        avatar: true,
        region: true,
        role: true,
        createdAt: true,
      },
    });

    // Crear SellerProfile automáticamente si el rol es SELLER
    if ((data as any).role === 'SELLER') {
      await this.prisma.sellerProfile.create({
        data: {
          userId: user.id,
          businessName: (data as any).businessName || data.nombre || 'Mi Tienda',
        },
      });
    }

    // Generar tokens
    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    return {
      user,
      tokens,
    };
  }

  /**
   * Login de usuario con email y contraseña
   */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Verificar si el usuario está baneado
    if (user.bannedAt) {
      throw new AppError(
        `Tu cuenta ha sido suspendida${user.bannedReason ? `: ${user.bannedReason}` : ''}`,
        403
      );
    }

    // Verificar contraseña
    const isValidPassword = await this.verifyPassword(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Generar tokens
    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        avatar: user.avatar,
        region: user.region,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Obtiene el perfil de un usuario autenticado
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        avatar: true,
        region: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            stories: true,
            likes: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Actualiza el perfil de un usuario
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        avatar: true,
        region: true,
        role: true,
      },
    });

    return user;
  }

  /**
   * Cambia la contraseña de un usuario
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isValidPassword = await this.verifyPassword(currentPassword, user.password);

    if (!isValidPassword) {
      throw new AppError('Contraseña actual incorrecta', 401);
    }

    // Hash de la nueva contraseña
    const hashedPassword = await this.hashPassword(newPassword);

    // Actualizar contraseña
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Revoca un refresh token específico (logout de sesión única)
   */
  async revokeToken(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (payload.familyId && payload.jti) {
      await this.markTokenAsUsed(payload.jti, payload.familyId, payload.sub, payload.exp);
      await this.invalidateTokenFamily(payload.familyId, payload.sub, 'User logout');
    }
  }

  /**
   * Revoca todos los tokens de un usuario (logout de todas las sesiones)
   * Invalida todas las familias de tokens del usuario
   */
  async revokeAllTokens(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Invalidar todas las familias de tokens del usuario
    const invalidatedCount = await this.tokenBlacklistService.revokeAllUserTokens(userId);

    return {
      success: true,
      message: 'Todas las sesiones han sido cerradas',
      invalidatedSessions: invalidatedCount,
    };
  }

  // ============================================
  // FORGOT / RESET PASSWORD
  // ============================================

  /**
   * Genera un token de reset y envía email
   */
  async forgotPassword(email: string): Promise<{ success: true; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, nombre: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true, message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' };
    }

    // Generate reset token (random hex, stored hashed)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token in Redis
    await this.tokenBlacklistService.setResetToken(user.id, resetTokenHash, 3600);

    // Build reset URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&uid=${user.id}`;

    // Send email
    await EmailService.sendResetPassword(user.email, user.nombre || 'Usuario', resetUrl);

    return { success: true, message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' };
  }

  /**
   * Restablece la contraseña usando un token de reset
   */
  async resetPassword(userId: string, token: string, newPassword: string): Promise<{ success: true; message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verify token from Redis
    const storedHash = await this.tokenBlacklistService.getResetToken(userId);
    if (!storedHash || storedHash !== tokenHash) {
      throw new AppError('Token inválido o expirado', 400);
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Delete reset token
    await this.tokenBlacklistService.deleteResetToken(userId);

    // Revoke all existing sessions for security
    await this.tokenBlacklistService.revokeAllUserTokens(userId);

    return { success: true, message: 'Contraseña restablecida correctamente. Inicia sesión con tu nueva contraseña.' };
  }

  // ============================================
  // MÉTODOS DE UTILIDAD PARA DEBUGGING/TESTING
  // ============================================

  /**
   * Obtiene estadísticas de tokens en Redis (para debugging)
   */
  async getTokenStats() {
    return await this.tokenBlacklistService.getStats();
  }

  /**
   * Limpia todos los tokens en Redis (solo para testing)
   * ADVERTENCIA: Esto invalidará todas las sesiones activas
   */
  async clearAllTokens() {
    await this.tokenBlacklistService.clearAll();
  }

  /**
   * Verifica si el servicio de tokens está listo
   */
  isTokenServiceReady(): boolean {
    return this.tokenBlacklistService.isReady();
  }
}
