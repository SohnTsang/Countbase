import { FormSkeleton } from '@/components/ui/form-skeleton'

export default function ReceiveLoading() {
  return <FormSkeleton fields={2} hasLines lineCount={3} />
}
