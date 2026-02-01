import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createUserSchema = (t: TranslationFn) => z.object({
  email: z.string().email(t('validation.emailInvalid')),
  name: z.string().min(1, t('validation.nameRequired')).max(100, t('validation.nameMaxLength')),
  role: z.enum(['admin', 'manager', 'staff', 'readonly']),
  active: z.boolean().default(true),
})

export const createCreateUserSchema = (t: TranslationFn) => createUserSchema(t).extend({
  password: z.string().min(6, t('validation.passwordMin')),
})

// Default schemas for type inference
export const userSchema = createUserSchema((key) => key)
export const createUserSchemaDefault = createCreateUserSchema((key) => key)

export type UserFormData = z.infer<typeof userSchema>
export type CreateUserFormData = z.infer<typeof createUserSchemaDefault>
