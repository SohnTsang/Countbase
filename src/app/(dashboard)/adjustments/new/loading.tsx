import { FormSkeleton } from '@/components/ui/form-skeleton'

export default function NewAdjustmentLoading() {
  return <FormSkeleton fields={4} hasLines lineCount={3} />
}
