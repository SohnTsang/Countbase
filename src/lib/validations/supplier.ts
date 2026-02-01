import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createSupplierSchema = (t: TranslationFn) => z.object({
  code: z.string().max(20).nullable().optional(),
  name: z.string().min(1, t('validation.nameRequired')).max(200),
  contact_name: z.string().max(100).nullable().optional(),
  email: z.string().email(t('validation.emailInvalid')).nullable().optional().or(z.literal('')),
  phone: z.string().max(20).nullable().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  active: z.boolean().default(true),
})

// Default schema for type inference
export const supplierSchema = createSupplierSchema((key) => key)

export type SupplierFormData = z.infer<typeof supplierSchema>
