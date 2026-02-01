import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createCycleCountLineSchema = (t: TranslationFn) => z.object({
  product_id: z.string().uuid(t('validation.selectProduct')),
  system_qty: z.coerce.number().min(0),
  counted_qty: z.coerce.number().min(0).nullable().optional(),
  lot_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
})

export const createCycleCountSchema = (t: TranslationFn) => z.object({
  location_id: z.string().uuid(t('validation.selectLocation')),
  count_date: z.string().min(1, t('validation.countDateRequired')),
  notes: z.string().nullable().optional(),
  lines: z.array(createCycleCountLineSchema(t)).min(1, t('validation.addAtLeastOneProduct')),
})

export const createCountEntrySchema = (_t: TranslationFn) => z.object({
  lines: z.array(z.object({
    line_id: z.string().uuid(),
    counted_qty: z.coerce.number().min(0),
  })),
})

// Default schemas for type inference
export const cycleCountLineSchema = createCycleCountLineSchema((key) => key)
export const cycleCountSchema = createCycleCountSchema((key) => key)
export const countEntrySchema = createCountEntrySchema((key) => key)

export type CycleCountFormData = z.infer<typeof cycleCountSchema>
export type CycleCountLineFormData = z.infer<typeof cycleCountLineSchema>
export type CountEntryFormData = z.infer<typeof countEntrySchema>
