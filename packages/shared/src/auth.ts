import { z } from 'zod'

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Use pelo menos 2 letras').max(40, 'Use até 40 letras'),
  email: z.email('E-mail inválido').trim().toLowerCase(),
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(72, 'Use até 72 caracteres')
})

export const loginSchema = z.object({
  email: z.email('E-mail inválido').trim().toLowerCase(),
  password: z.string().min(1, 'Digite a senha')
})

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional()
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export interface UserDto {
  id: string
  email: string
  displayName: string
  color: string
}
