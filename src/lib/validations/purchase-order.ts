import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createPurchaseOrderLineSchema = (t: TranslationFn) => z.object({
  product_id: z.string().uuid(t('validation.selectProduct')),
  qty_ordered: z.coerce.number().positive(t('validation.quantityPositive')),
  unit_cost: z.coerce.number().min(0, t('validation.costNotNegative')),
})

export const createPurchaseOrderSchema = (t: TranslationFn) => z.object({
  supplier_id: z.string().uuid(t('validation.selectSupplier')),
  location_id: z.string().uuid(t('validation.selectLocation')),
  order_date: z.string().min(1, t('validation.orderDateRequired')),
  expected_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(createPurchaseOrderLineSchema(t)).min(1, t('validation.addAtLeastOneLine')),
})

export const createReceiveLineSchema = (t: TranslationFn) => z.object({
  line_id: z.string().uuid(),
  product_id: z.string().uuid(),
  qty_to_receive: z.coerce.number().min(0, t('validation.costNotNegative')),
  lot_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
})

export const createReceiveSchema = (t: TranslationFn) => z.object({
  lines: z.array(createReceiveLineSchema(t)),
})

// Default schemas for type inference
export const purchaseOrderLineSchema = createPurchaseOrderLineSchema((key) => key)
export const purchaseOrderSchema = createPurchaseOrderSchema((key) => key)
export const receiveLineSchema = createReceiveLineSchema((key) => key)
export const receiveSchema = createReceiveSchema((key) => key)

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>
export type PurchaseOrderLineFormData = z.infer<typeof purchaseOrderLineSchema>
export type ReceiveFormData = z.infer<typeof receiveSchema>
export type ReceiveLineFormData = z.infer<typeof receiveLineSchema>
