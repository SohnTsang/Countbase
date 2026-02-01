-- Audit Logs Table
-- Run this migration in your Supabase SQL editor

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT, -- Stored separately in case user is deleted
  user_email TEXT,

  -- Action details
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'login', 'logout'
  resource_type TEXT NOT NULL, -- e.g., 'product', 'purchase_order', 'shipment', 'user'
  resource_id UUID, -- ID of the affected resource
  resource_name TEXT, -- Human-readable name (e.g., product SKU, order number)

  -- Change details
  old_values JSONB, -- Previous state (for updates/deletes)
  new_values JSONB, -- New state (for creates/updates)
  changes JSONB, -- Summary of what changed

  -- Context
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT, -- Optional notes about the action

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for common filter combinations
CREATE INDEX idx_audit_logs_tenant_resource ON audit_logs(tenant_id, resource_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their tenant's logs
CREATE POLICY "Users can view their tenant's audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policy: Only allow inserts from authenticated users in same tenant
CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- No update or delete policies - audit logs should be immutable

-- Create a view for easier querying with formatted data
CREATE OR REPLACE VIEW audit_logs_view AS
SELECT
  al.id,
  al.tenant_id,
  al.user_id,
  al.user_name,
  al.user_email,
  al.action,
  al.resource_type,
  al.resource_id,
  al.resource_name,
  al.old_values,
  al.new_values,
  al.changes,
  al.notes,
  al.created_at,
  -- Formatted action description
  CASE
    WHEN al.action = 'create' THEN al.user_name || ' created ' || al.resource_type || ' "' || COALESCE(al.resource_name, al.resource_id::text) || '"'
    WHEN al.action = 'update' THEN al.user_name || ' updated ' || al.resource_type || ' "' || COALESCE(al.resource_name, al.resource_id::text) || '"'
    WHEN al.action = 'delete' THEN al.user_name || ' deleted ' || al.resource_type || ' "' || COALESCE(al.resource_name, al.resource_id::text) || '"'
    WHEN al.action = 'login' THEN al.user_name || ' logged in'
    WHEN al.action = 'logout' THEN al.user_name || ' logged out'
    ELSE al.user_name || ' performed ' || al.action || ' on ' || al.resource_type
  END as description
FROM audit_logs al;

-- Grant access to the view
GRANT SELECT ON audit_logs_view TO authenticated;
