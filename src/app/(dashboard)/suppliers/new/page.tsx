import { SupplierForm } from '@/components/forms/supplier-form'

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Supplier</h1>
        <p className="text-gray-600">Add a new supplier to your vendor list</p>
      </div>
      <SupplierForm />
    </div>
  )
}
