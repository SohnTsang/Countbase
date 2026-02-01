import { CustomerForm } from '@/components/forms/customer-form'

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Customer</h1>
        <p className="text-gray-600">Add a new customer</p>
      </div>
      <CustomerForm />
    </div>
  )
}
