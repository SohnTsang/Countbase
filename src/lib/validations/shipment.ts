import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createShipmentLineSchema = (t: TranslationFn) => z.object({
  product_id: z.string().uuid(t('validation.selectProduct')),
  qty: z.coerce.number().positive(t('validation.quantityPositive')),
  lot_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
})

export const createShipmentSchema = (t: TranslationFn) => z.object({
  location_id: z.string().uuid(t('validation.selectLocation')),
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  ship_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(createShipmentLineSchema(t)).min(1, t('validation.addAtLeastOneLine')),
})

// Default schemas for type inference
export const shipmentLineSchema = createShipmentLineSchema((key) => key)
export const shipmentSchema = createShipmentSchema((key) => key)

export type ShipmentFormData = z.infer<typeof shipmentSchema>
export type ShipmentLineFormData = z.infer<typeof shipmentLineSchema>
