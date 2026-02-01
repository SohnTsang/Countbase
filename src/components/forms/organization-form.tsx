'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Loader2 } from 'lucide-react'
import { createOrganizationSchema, type OrganizationFormData } from '@/lib/validations/settings'
import { updateOrganization } from '@/lib/actions/settings'
import { useTranslation } from '@/lib/i18n'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'VND', name: 'Vietnamese Dong' },
]

interface OrganizationFormProps {
  currentName: string
  currentCurrency: string
  requireAdjustmentApproval: boolean
}

export function OrganizationForm({
  currentName,
  currentCurrency,
  requireAdjustmentApproval,
}: OrganizationFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useTranslation()
  const schema = useMemo(() => createOrganizationSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
    watch,
  } = useForm<OrganizationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: currentName,
      default_currency: currentCurrency,
      require_adjustment_approval: requireAdjustmentApproval,
    },
  })

  const watchCurrency = watch('default_currency')
  const watchApproval = watch('require_adjustment_approval')

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true)
    try {
      const result = await updateOrganization(data)
      if (result.error) {
        if ('_form' in result.error && result.error._form) {
          setError('root', { message: result.error._form[0] })
        } else if ('name' in result.error && result.error.name) {
          setError('name', { message: result.error.name[0] })
        }
        return
      }
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      reset({
        name: currentName,
        default_currency: currentCurrency,
        require_adjustment_approval: requireAdjustmentApproval,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.editOrganization')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t('settings.organizationName')}</Label>
            <Input
              id="org-name"
              {...register('name')}
              placeholder={t('settings.enterOrganizationName')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">{t('settings.defaultCurrency')}</Label>
            <Select
              value={watchCurrency}
              onValueChange={(value) => setValue('default_currency', value)}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder={t('settings.selectCurrency')} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.default_currency && (
              <p className="text-sm text-red-500">{errors.default_currency.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-approval">{t('settings.requireAdjustmentApproval')}</Label>
              <p className="text-sm text-gray-500">
                {t('settings.requireAdjustmentApprovalDesc')}
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={watchApproval}
              onCheckedChange={(checked) => setValue('require_adjustment_approval', checked)}
            />
          </div>

          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
