import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Este campo es obligatorio')
    .refine(
      (v) => {
        const trimmed = v.trim()
        if (trimmed.includes('@')) return z.string().email().safeParse(trimmed).success
        return trimmed.length > 0
      },
      {
        message: 'Ingresa un correo válido o tu nombre de usuario',
      },
    ),
  password: z.string().min(6),
})

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
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
