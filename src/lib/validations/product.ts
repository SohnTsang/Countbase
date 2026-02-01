import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createProductSchema = (t: TranslationFn) => z.object({
  sku: z.string().min(1, t('validation.skuRequired')).max(50, t('validation.skuMaxLength')),
  name: z.string().min(1, t('validation.nameRequired')).max(200, t('validation.nameMaxLength200')),
  barcode: z.string().max(50).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  base_uom: z.enum(['EA', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'BOX', 'PACK']),
  pack_uom_name: z.string().max(20).nullable().optional(),
  pack_qty_in_base: z.coerce.number().positive().nullable().optional(),
  current_cost: z.coerce.number().min(0).default(0),
  track_expiry: z.boolean().default(false),
  track_lot: z.boolean().default(false),
  reorder_point: z.coerce.number().min(0).default(0),
  reorder_qty: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
}).refine(
  (data) => {
    // If pack_uom_name is set, pack_qty_in_base must also be set
    if (data.pack_uom_name && !data.pack_qty_in_base) return false
    if (data.pack_qty_in_base && !data.pack_uom_name) return false
    return true
  },
  { message: t('validation.packUnitBothRequired') }
)

// Default schema for type inference
export const productSchema = createProductSchema((key) => key)

export type ProductFormData = z.infer<typeof productSchema>
