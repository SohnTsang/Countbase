import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createCategorySchema = (t: TranslationFn) => z.object({
  name: z.string().min(1, t('validation.nameRequired')).max(100, t('validation.nameMaxLength')),
  parent_id: z.string().uuid().nullable().optional(),
})

// Default schema for type inference
export const categorySchema = createCategorySchema((key) => key)

export type CategoryFormData = z.infer<typeof categorySchema>
