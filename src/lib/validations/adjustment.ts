import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createAdjustmentLineSchema = (t: TranslationFn) => z.object({
  product_id: z.string().uuid(t('validation.selectProduct')),
  qty: z.coerce.number().refine((val) => val !== 0, t('validation.quantityNotZero')),
  lot_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  unit_cost: z.coerce.number().min(0).nullable().optional(),
})

export const createAdjustmentSchema = (t: TranslationFn) => z.object({
  location_id: z.string().uuid(t('validation.selectLocation')),
  reason: z.enum(['damage', 'shrinkage', 'expiry', 'correction', 'sample', 'count_variance', 'other']),
  notes: z.string().nullable().optional(),
  lines: z.array(createAdjustmentLineSchema(t)).min(1, t('validation.addAtLeastOneLine')),
})

// Default schemas for type inference
export const adjustmentLineSchema = createAdjustmentLineSchema((key) => key)
export const adjustmentSchema = createAdjustmentSchema((key) => key)

export type AdjustmentFormData = z.infer<typeof adjustmentSchema>
export type AdjustmentLineFormData = z.infer<typeof adjustmentLineSchema>
