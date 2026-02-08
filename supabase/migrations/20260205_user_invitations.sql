-- Migration: Add user invitation system
-- This adds max_users to tenants and creates the user_invitations table

-- Add max_users column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_by_name TEXT, -- Store name in case user is deleted
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate pending invitations for same email in same tenant
  CONSTRAINT unique_pending_invitation UNIQUE (tenant_id, email)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON user_invitations(expires_at) WHERE accepted_at IS NULL;

-- RLS policies for user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Platform admins can see all invitations
CREATE POLICY "Platform admins can view all invitations"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_platform_admin = true
    )
  );

-- Platform admins can insert invitations for any tenant
CREATE POLICY "Platform admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_platform_admin = true
    )
  );

-- Tenant admins/managers can view their tenant's invitations
CREATE POLICY "Tenant admins can view own tenant invitations"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager')
    )
  );

-- Tenant admins/managers can create invitations for their tenant
CREATE POLICY "Tenant admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager')
    )
  );

-- Tenant admins/managers can update their tenant's invitations (for resend)
CREATE POLICY "Tenant admins can update own tenant invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager')
    )
  );

-- Tenant admins/managers can delete their tenant's invitations
CREATE POLICY "Tenant admins can delete own tenant invitations"
  ON user_invitations FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager')
    )
  );

-- Anonymous users can read invitation by token (for accept page)
CREATE POLICY "Anyone can read invitation by token"
  ON user_invitations FOR SELECT
  TO anon
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;
GRANT SELECT ON user_invitations TO anon;

-- Function to check if tenant has reached user limit
CREATE OR REPLACE FUNCTION check_tenant_user_limit(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_users INTEGER;
  v_max_users INTEGER;
  v_pending_invitations INTEGER;
BEGIN
  -- Get max users for tenant
  SELECT max_users INTO v_max_users
  FROM tenants
  WHERE id = p_tenant_id;

  -- Count current active users
  SELECT COUNT(*) INTO v_current_users
  FROM users
  WHERE tenant_id = p_tenant_id AND active = true;

  -- Count pending (non-expired, non-accepted) invitations
  SELECT COUNT(*) INTO v_pending_invitations
  FROM user_invitations
  WHERE tenant_id = p_tenant_id
    AND accepted_at IS NULL
    AND expires_at > now();

  -- Return true if under limit
  RETURN (v_current_users + v_pending_invitations) < COALESCE(v_max_users, 10);
END;
$$;

GRANT EXECUTE ON FUNCTION check_tenant_user_limit(UUID) TO authenticated;

-- Function to get tenant user stats
CREATE OR REPLACE FUNCTION get_tenant_user_stats(p_tenant_id UUID)
RETURNS TABLE (
  current_users INTEGER,
  pending_invitations INTEGER,
  max_users INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM users WHERE tenant_id = p_tenant_id AND active = true) as current_users,
    (SELECT COUNT(*)::INTEGER FROM user_invitations
     WHERE tenant_id = p_tenant_id AND accepted_at IS NULL AND expires_at > now()) as pending_invitations,
    COALESCE(t.max_users, 10) as max_users
  FROM tenants t
  WHERE t.id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_user_stats(UUID) TO authenticated;

COMMENT ON TABLE user_invitations IS 'Stores pending user invitations with expiring tokens';
COMMENT ON COLUMN user_invitations.token IS 'Unique token sent in invitation email, expires after 48 hours';
COMMENT ON COLUMN user_invitations.accepted_at IS 'When the invitation was accepted and user account created';
