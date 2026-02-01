import { z } from 'zod'

type TranslationFn = (key: string) => string

export const createProfileSchema = (t: TranslationFn) => z.object({
  name: z.string().min(1, t('validation.nameRequired')).max(100, t('validation.nameMaxLength')),
})

export const createOrganizationSchema = (t: TranslationFn) => z.object({
  name: z.string().min(1, t('validation.organizationNameRequired')).max(100, t('validation.nameMaxLength')),
  default_currency: z.string().min(1, t('validation.currencyRequired')).max(10, t('validation.currencyMaxLength')),
  require_adjustment_approval: z.boolean(),
})

// Default schemas for type inference
export const profileSchema = createProfileSchema((key) => key)
export const organizationSchema = createOrganizationSchema((key) => key)

export type ProfileFormData = z.infer<typeof profileSchema>
export type OrganizationFormData = z.infer<typeof organizationSchema>
