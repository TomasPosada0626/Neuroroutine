import { z } from 'zod'

const usernameRegex = /^[a-zA-Z0-9._-]{3,24}$/

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3)
    .refine(
      (v) => {
        const trimmed = v.trim()
        if (trimmed.includes('@')) return z.string().email().safeParse(trimmed).success
        return usernameRegex.test(trimmed)
      },
      {
        message: 'Ingresa un correo válido o un usuario (3-24, letras/números/._-)'
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
      .toLowerCase()
      .regex(usernameRegex, 'Usuario inválido (3-24, letras/números/._-)'),
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
