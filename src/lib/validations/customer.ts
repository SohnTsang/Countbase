import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createCustomerSchema = (t: TranslationFn) => z.object({
  code: z.string().max(50).nullable().optional(),
  name: z.string().min(1, t('validation.nameRequired')).max(200),
  contact_name: z.string().max(100).nullable().optional(),
  email: z.string().email(t('validation.emailInvalid')).nullable().optional().or(z.literal('')),
  phone: z.string().max(50).nullable().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional().default({}),
  active: z.boolean().default(true),
})

// Default schema for type inference
export const customerSchema = createCustomerSchema((key) => key)

export type CustomerFormData = z.infer<typeof customerSchema>
