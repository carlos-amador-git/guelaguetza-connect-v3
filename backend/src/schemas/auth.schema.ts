import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().optional(),
  region: z.string().optional(),
  role: z.enum(['USER', 'SELLER', 'ADMIN']).optional().default('USER'),
  businessName: z.string().min(2, 'El nombre de tienda debe tener al menos 2 caracteres').optional(),
}).refine((data) => {
  if (data.role === 'SELLER' && !data.businessName) {
    return false;
  }
  return true;
}, {
  message: 'El nombre de la tienda es requerido para vendedores',
  path: ['businessName'],
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const updateProfileSchema = z.object({
  nombre: z.string().min(2).optional(),
  apellido: z.string().optional(),
  avatar: z.string().url().optional(),
  region: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
