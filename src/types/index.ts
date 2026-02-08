// Database types
export type UserRole = 'admin' | 'manager' | 'staff' | 'readonly'
export type LocationType = 'warehouse' | 'store' | 'outlet'
export type DocumentStatus = 'draft' | 'confirmed' | 'partial' | 'completed' | 'cancelled'
export type MovementType = 'receive' | 'ship' | 'transfer_out' | 'transfer_in' | 'adjustment' | 'count_variance' | 'return_in' | 'return_out' | 'void'
export type AdjustmentReason = 'damage' | 'shrinkage' | 'expiry' | 'correction' | 'sample' | 'count_variance' | 'other'
export type BaseUom = 'EA' | 'KG' | 'G' | 'L' | 'ML' | 'M' | 'CM' | 'BOX' | 'PACK'
export type ReservationStatus = 'active' | 'released' | 'consumed'

export interface Tenant {
  id: string
  name: string
  max_users: number
  settings: {
    reservation_expiry_hours: number
    require_adjustment_approval: boolean
    default_currency: string
    default_locale?: string
  }
  created_at: string
}

export interface UserInvitation {
  id: string
  tenant_id: string
  email: string
  role: UserRole
  token: string
  expires_at: string
  invited_by: string | null
  invited_by_name: string | null
  accepted_at: string | null
  created_at: string
  // Joined
  tenant?: Tenant
}

export interface TenantUserStats {
  current_users: number
  pending_invitations: number
  max_users: number
}

export interface User {
  id: string
  tenant_id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  is_platform_admin: boolean
  created_at: string
}

export interface Category {
  id: string
  tenant_id: string
  name: string
  parent_id: string | null
  is_parent: boolean
  active: boolean
  created_at: string
}

export interface Product {
  id: string
  tenant_id: string
  sku: string
  name: string
  barcode: string | null
  category_id: string | null
  base_uom: BaseUom
  pack_uom_name: string | null
  pack_qty_in_base: number | null
  allow_decimal_qty: boolean
  current_cost: number
  track_expiry: boolean
  track_lot: boolean
  reorder_point: number
  reorder_qty: number
  active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  category?: Category
}

export interface Location {
  id: string
  tenant_id: string
  name: string
  type: LocationType
  parent_id: string | null
  is_parent: boolean
  address: string | null
  active: boolean
  created_at: string
}

export interface Supplier {
  id: string
  tenant_id: string
  code: string | null
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: Record<string, unknown>
  active: boolean
  created_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  code: string | null
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: Record<string, unknown>
  active: boolean
  created_at: string
}

export interface InventoryBalance {
  id: string
  tenant_id: string
  product_id: string
  location_id: string
  lot_number: string | null
  expiry_date: string | null
  qty_on_hand: number
  avg_cost: number
  inventory_value: number
  updated_at: string
  // Joined
  product?: Product
  location?: Location
}

export interface PurchaseOrder {
  id: string
  tenant_id: string
  po_number: string
  supplier_id: string
  location_id: string
  status: DocumentStatus
  order_date: string
  expected_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  supplier?: Supplier
  location?: Location
  lines?: PurchaseOrderLine[]
}

export interface PurchaseOrderLine {
  id: string
  po_id: string
  product_id: string
  qty_ordered: number
  qty_received: number
  unit_cost: number
  // Joined
  product?: Product
}

export interface Shipment {
  id: string
  tenant_id: string
  shipment_number: string
  location_id: string
  customer_id: string | null
  customer_name: string | null
  status: DocumentStatus
  ship_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  location?: Location
  customer?: Customer
  lines?: ShipmentLine[]
}

export interface ShipmentLine {
  id: string
  shipment_id: string
  product_id: string
  qty: number
  lot_number: string | null
  expiry_date: string | null
  unit_cost: number | null
  // Joined
  product?: Product
}

export interface Transfer {
  id: string
  tenant_id: string
  transfer_number: string
  from_location_id: string
  to_location_id: string
  status: DocumentStatus
  sent_at: string | null
  received_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  // Joined
  from_location?: Location
  to_location?: Location
  lines?: TransferLine[]
}

export interface TransferLine {
  id: string
  transfer_id: string
  product_id: string
  qty: number
  lot_number: string | null
  expiry_date: string | null
  unit_cost: number | null
  // Joined
  product?: Product
}

export interface Adjustment {
  id: string
  tenant_id: string
  adjustment_number: string
  location_id: string
  reason: AdjustmentReason
  status: DocumentStatus
  notes: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  // Joined
  location?: Location
  lines?: AdjustmentLine[]
}

export interface AdjustmentLine {
  id: string
  adjustment_id: string
  product_id: string
  qty: number
  lot_number: string | null
  expiry_date: string | null
  unit_cost: number | null
  // Joined
  product?: Product
}

export interface StockMovement {
  id: string
  tenant_id: string
  product_id: string
  location_id: string
  qty: number
  movement_type: MovementType
  reference_type: string | null
  reference_id: string | null
  lot_number: string | null
  expiry_date: string | null
  unit_cost: number | null
  extended_cost: number
  reason: AdjustmentReason | null
  notes: string | null
  created_by: string | null
  created_at: string
  // Joined
  product?: Product
  location?: Location
}

export interface StockSummary {
  tenant_id: string
  product_id: string
  sku: string
  product_name: string
  base_uom: BaseUom
  location_id: string
  location_name: string
  lot_number: string | null
  expiry_date: string | null
  qty_on_hand: number
  avg_cost: number
  inventory_value: number
  reserved: number
  available: number
}

export interface CycleCount {
  id: string
  tenant_id: string
  count_number: string
  location_id: string
  status: DocumentStatus
  count_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  // Joined
  location?: Location
  lines?: CycleCountLine[]
}

export interface CycleCountLine {
  id: string
  count_id: string
  product_id: string
  system_qty: number
  counted_qty: number | null
  variance: number
  lot_number: string | null
  expiry_date: string | null
  // Joined
  product?: Product
}

export type ReturnType = 'customer' | 'supplier'

export interface Return {
  id: string
  tenant_id: string
  return_number: string
  return_type: ReturnType
  location_id: string
  partner_id: string | null
  partner_name: string | null
  status: DocumentStatus
  reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  // Joined
  location?: Location
  lines?: ReturnLine[]
}

export interface ReturnLine {
  id: string
  return_id: string
  product_id: string
  qty: number
  lot_number: string | null
  expiry_date: string | null
  unit_cost: number | null
  // Joined
  product?: Product
}

// Audit Log Types
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'confirm' | 'cancel' | 'receive' | 'ship' | 'transfer' | 'adjust' | 'count' | 'return' | 'approve' | 'upload'

export type AuditResourceType =
  | 'user'
  | 'product'
  | 'category'
  | 'location'
  | 'supplier'
  | 'customer'
  | 'purchase_order'
  | 'shipment'
  | 'transfer'
  | 'adjustment'
  | 'cycle_count'
  | 'return'
  | 'settings'
  | 'tenant'
  | 'document'

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  action: AuditAction
  resource_type: AuditResourceType
  resource_id: string | null
  resource_name: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changes: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  notes: string | null
  created_at: string
  // View fields
  description?: string
}

// Error Logging Types
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'
export type ErrorStatus = 'open' | 'investigating' | 'resolved' | 'ignored'
export type ErrorType = 'client' | 'server' | 'api' | 'database' | 'auth' | 'validation' | 'network' | 'unknown'

export interface ErrorLog {
  id: string
  tenant_id: string | null
  error_hash: string
  fingerprint: string | null
  error_type: ErrorType
  severity: ErrorSeverity
  message: string
  stack_trace: string | null
  url: string | null
  method: string | null
  status_code: number | null
  user_agent: string | null
  ip_address: string | null
  user_id: string | null
  metadata: Record<string, unknown>
  tags: string[]
  occurrence_count: number
  first_seen_at: string
  last_seen_at: string
  status: ErrorStatus
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  updated_at: string
  // Joined fields
  user?: User
  tenant?: Tenant
  resolver?: User
}

export interface ErrorLogFilters {
  status?: ErrorStatus | 'all'
  severity?: ErrorSeverity | 'all'
  error_type?: ErrorType | 'all'
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface ErrorStats {
  total: number
  open: number
  investigating: number
  resolved: number
  ignored: number
  bySeverity: Record<ErrorSeverity, number>
  byType: Record<ErrorType, number>
  trend: {
    date: string
    count: number
  }[]
}

// Document Types
export type DocumentEntityType =
  | 'product'
  | 'category'
  | 'location'
  | 'supplier'
  | 'customer'
  | 'purchase_order'
  | 'shipment'
  | 'transfer'
  | 'adjustment'
  | 'cycle_count'
  | 'return'

export interface Document {
  id: string
  tenant_id: string
  entity_type: DocumentEntityType
  entity_id: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  version: number
  notes: string | null
  uploaded_by: string | null
  uploaded_by_name: string | null
  created_at: string
  updated_at: string
}
