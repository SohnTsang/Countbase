'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createCategorySchema, type CategoryFormData } from '@/lib/validations/category'
import { createCategory, updateCategory } from '@/lib/actions/categories'
import { useTranslation } from '@/lib/i18n'
import type { Category } from '@/types'

interface CategoryFormProps {
  category?: Category
  categories: Category[] // For parent selection
}

export function CategoryForm({ category, categories }: CategoryFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!category

  const schema = useMemo(() => createCategorySchema(t), [t])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: category?.name || '',
      parent_id: category?.parent_id || null,
    },
  })

  const onSubmit = async (data: CategoryFormData) => {
    try {
      const result = isEdit
        ? await updateCategory(category.id, data)
        : await createCategory(data)

      if (result?.error) {
        if (typeof result.error === 'string') {
          toast.error(result.error)
        } else {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.categoryUpdated') : t('toast.categoryCreated'))
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  // Filter out current category and its children from parent options
  const getDescendantIds = (categoryId: string): string[] => {
    const children = categories.filter((c) => c.parent_id === categoryId)
    return [categoryId, ...children.flatMap((c) => getDescendantIds(c.id))]
  }

  const excludedIds = category ? getDescendantIds(category.id) : []
  const parentOptions = categories.filter((c) => !excludedIds.includes(c.id))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('categories.categoryDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('categories.categoryName')} *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={t('categories.namePlaceholder')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id">{t('categories.parentCategory')} ({t('common.optional')})</Label>
            <Select
              value={watch('parent_id') || 'none'}
              onValueChange={(value) => setValue('parent_id', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('categories.noParent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('categories.noParent')}</SelectItem>
                {parentOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {t('categories.parentHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : isEdit ? t('categories.updateCategory') : t('categories.createCategory')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/categories')}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
