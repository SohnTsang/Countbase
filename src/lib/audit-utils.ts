import type { AuditAction, AuditResourceType } from '@/types'

/**
 * Helper to compute changes between old and new values
 */
export function computeChanges(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): Record<string, { old: unknown; new: unknown }> | null {
  if (!oldValues || !newValues) return null

  const changes: Record<string, { old: unknown; new: unknown }> = {}

  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)])

  for (const key of allKeys) {
    const oldVal = oldValues[key]
    const newVal = newValues[key]

    // Skip internal fields
    if (['id', 'tenant_id', 'created_at', 'updated_at'].includes(key)) continue

    // Check if values are different
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

// Action label mappings for display
export const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged in',
  logout: 'Logged out',
  confirm: 'Confirmed',
  cancel: 'Cancelled',
  receive: 'Received',
  ship: 'Shipped',
  transfer: 'Transferred',
  adjust: 'Adjusted',
  count: 'Counted',
  return: 'Returned',
  approve: 'Approved',
}

// Resource type label mappings for display
export const RESOURCE_TYPE_LABELS: Record<AuditResourceType, string> = {
  user: 'User',
  product: 'Product',
  category: 'Category',
  location: 'Location',
  supplier: 'Supplier',
  customer: 'Customer',
  purchase_order: 'Purchase Order',
  shipment: 'Shipment',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
  cycle_count: 'Cycle Count',
  return: 'Return',
  settings: 'Settings',
  tenant: 'Organization',
}
