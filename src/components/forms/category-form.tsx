'use client'

import { useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createCategorySchema, type CategoryFormData } from '@/lib/validations/category'
import { createCategory, updateCategory } from '@/lib/actions/categories'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Category } from '@/types'

interface CategoryFormProps {
  category?: Category
  categories: Category[] // For parent selection
}

export function CategoryForm({ category, categories }: CategoryFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!category
  const docUploadRef = useRef<DocumentUploadHandle>(null)

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
      is_parent: category?.is_parent || false,
      active: category?.active ?? true,
    },
  })

  const onSubmit = async (data: CategoryFormData) => {
    try {
      const result = isEdit
        ? await updateCategory(category.id, data)
        : await createCategory(data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (result as any)?.error
      if (err) {
        if (typeof err === 'string') {
          toast.error(err)
        } else {
          Object.entries(err).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.categoryUpdated') : t('toast.categoryCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace('/categories')
      router.refresh()
    } catch (error: unknown) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  const isParent = watch('is_parent')

  // Only show categories marked as "parent categories" in the dropdown
  // Also exclude current category if editing
  const parentOptions = categories.filter((c) =>
    c.is_parent && // Only categories marked as parent can be parents
    c.id !== category?.id // Exclude self when editing
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/categories">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('categories.editCategory') : t('categories.newCategory')}
          </h1>
          <p className="text-gray-600">
            {isEdit ? t('categories.editCategorySubtitle') : t('categories.newCategorySubtitle')}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('categories.categoryDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="flex items-center space-x-3 rounded-lg border p-4">
              <Checkbox
                id="is_parent"
                checked={isParent}
                onCheckedChange={(checked) => {
                  setValue('is_parent', !!checked)
                  // If marking as parent, clear the parent_id (parent categories cannot have parents)
                  if (checked) {
                    setValue('parent_id', null)
                  }
                }}
              />
              <div className="space-y-1">
                <Label htmlFor="is_parent" className="cursor-pointer font-medium">
                  {t('categories.isParentCategory')}
                </Label>
                <p className="text-sm text-gray-500">
                  {t('categories.isParentCategoryHint')}
                </p>
              </div>
            </div>

            {!isParent && (
              <div className="space-y-2">
                <Label htmlFor="parent_id">{t('categories.parentCategory')} ({t('common.optional')})</Label>
                <Select
                  value={watch('parent_id') || 'none'}
                  onValueChange={(value) => setValue('parent_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger id="parent_id">
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
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>{t('common.active')}</Label>
                <p className="text-sm text-gray-500">
                  {t('categories.inactiveHint')}
                </p>
              </div>
              <Switch
                checked={watch('active')}
                onCheckedChange={(checked) => setValue('active', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <DocumentUpload ref={docUploadRef} entityType="category" entityId={category?.id || null} />

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
    </div>
  )
}
