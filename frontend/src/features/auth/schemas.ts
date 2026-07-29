import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Este campo es obligatorio')
    .refine(
      (v) => {
        const trimmed = v.trim();
        if (trimmed.includes('@')) return z.string().email().safeParse(trimmed).success;
        return trimmed.length > 0;
      },
      {
        message: 'Ingresa un correo válido o tu nombre de usuario',
      },
    ),
  // Only require non-empty here: this validates an *existing* credential, and raising
  // the bar retroactively would lock out accounts created under an older, shorter policy.
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Nombre muy corto'),
    lastName: z.string().trim().min(2, 'Apellidos muy cortos'),
    username: z
      .string()
      .trim()
      .min(1, 'El usuario es obligatorio')
      .refine((v) => !v.includes('@'), { message: 'El usuario no puede contener @' }),
    email: z.string().email(),
    password: z.string().min(10, 'Debe tener al menos 10 caracteres'),
    confirmPassword: z.string().min(10, 'Debe tener al menos 10 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(10, 'Debe tener al menos 10 caracteres'),
    confirmPassword: z.string().min(10, 'Debe tener al menos 10 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
