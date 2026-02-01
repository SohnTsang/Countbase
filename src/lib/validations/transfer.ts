import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createTransferLineSchema = (t: TranslationFn) => z.object({
  product_id: z.string().uuid(t('validation.selectProduct')),
  qty: z.coerce.number().positive(t('validation.quantityPositive')),
  lot_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
})

export const createTransferSchema = (t: TranslationFn) => z.object({
  from_location_id: z.string().uuid(t('validation.selectSourceLocation')),
  to_location_id: z.string().uuid(t('validation.selectDestinationLocation')),
  notes: z.string().nullable().optional(),
  lines: z.array(createTransferLineSchema(t)).min(1, t('validation.addAtLeastOneLine')),
}).refine(
  (data) => data.from_location_id !== data.to_location_id,
  { message: t('validation.sourceDestinationDifferent'), path: ['to_location_id'] }
)

// Default schemas for type inference
export const transferLineSchema = createTransferLineSchema((key) => key)
export const transferSchema = createTransferSchema((key) => key)

export type TransferFormData = z.infer<typeof transferSchema>
export type TransferLineFormData = z.infer<typeof transferLineSchema>
