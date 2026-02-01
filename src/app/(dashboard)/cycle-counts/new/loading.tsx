import { FormSkeleton } from '@/components/ui/form-skeleton'

export default function NewCycleCountLoading() {
  return <FormSkeleton fields={2} hasLines lineCount={3} />
}
