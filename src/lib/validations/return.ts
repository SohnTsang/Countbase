import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createReturnLineSchema = (t: TranslationFn) => z.object({
  product_id: z.string().uuid(t('validation.selectProduct')),
  qty: z.coerce.number().positive(t('validation.quantityPositive')),
  lot_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
})

export const createReturnSchema = (t: TranslationFn) => z.object({
  return_type: z.enum(['customer', 'supplier'], { message: t('validation.selectReturnType') }),
  location_id: z.string().uuid(t('validation.selectLocation')),
  partner_id: z.string().uuid().nullable().optional(),
  partner_name: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(createReturnLineSchema(t)).min(1, t('validation.addAtLeastOneLine')),
})

// Default schemas for type inference
export const returnLineSchema = createReturnLineSchema((key) => key)
export const returnSchema = createReturnSchema((key) => key)

export type ReturnFormData = z.infer<typeof returnSchema>
export type ReturnLineFormData = z.infer<typeof returnLineSchema>
