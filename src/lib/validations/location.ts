import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createLocationSchema = (t: TranslationFn) => z.object({
  name: z.string().min(1, t('validation.nameRequired')).max(100),
  type: z.enum(['warehouse', 'store', 'outlet']),
  parent_id: z.string().uuid().nullable().optional(),
  is_parent: z.boolean().default(false),
  address: z.string().max(500).nullable().optional(),
  active: z.boolean().default(true),
})

// Default schema for type inference
export const locationSchema = createLocationSchema((key) => key)

export type LocationFormData = z.infer<typeof locationSchema>
