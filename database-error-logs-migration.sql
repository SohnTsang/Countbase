-- ===========================================
-- ERROR LOGGING SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Add platform admin flag to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- 2. Create error severity enum
CREATE TYPE error_severity AS ENUM ('info', 'warning', 'error', 'fatal');

-- 3. Create error status enum
CREATE TYPE error_status AS ENUM ('open', 'investigating', 'resolved', 'ignored');

-- 4. Create error type enum
CREATE TYPE error_type AS ENUM ('client', 'server', 'api', 'database', 'auth', 'validation', 'network', 'unknown');

-- 5. Create error_logs table
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tenant context (nullable for system-wide errors)
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Error identification
  error_hash TEXT NOT NULL,               -- Hash for grouping similar errors
  fingerprint TEXT,                        -- Unique fingerprint for exact deduplication

  -- Error details
  error_type error_type NOT NULL DEFAULT 'unknown',
  severity error_severity NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  stack_trace TEXT,

  -- Context
  url TEXT,
  method TEXT,                             -- GET, POST, etc.
  status_code INTEGER,
  user_agent TEXT,
  ip_address TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Additional metadata
  metadata JSONB DEFAULT '{}',            -- component, action, request body, headers, etc.
  tags TEXT[] DEFAULT '{}',               -- For categorization

  -- Occurrence tracking
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Resolution
  status error_status DEFAULT 'open',
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes for efficient querying
CREATE INDEX idx_error_logs_tenant ON error_logs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_error_logs_status ON error_logs(status);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_hash ON error_logs(error_hash);
CREATE INDEX idx_error_logs_fingerprint ON error_logs(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_last_seen ON error_logs(last_seen_at DESC);
CREATE INDEX idx_error_logs_user ON error_logs(user_id) WHERE user_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_error_logs_status_severity ON error_logs(status, severity, last_seen_at DESC);

-- 7. Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Platform admins can see all error logs
CREATE POLICY platform_admin_all ON error_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_platform_admin = TRUE
    )
  );

-- Regular users can only insert errors (for client-side logging)
CREATE POLICY user_insert_errors ON error_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 9. Create helper function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM users WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 10. Function to upsert error (increment count if exists)
CREATE OR REPLACE FUNCTION upsert_error_log(
  p_error_hash TEXT,
  p_fingerprint TEXT,
  p_error_type error_type,
  p_severity error_severity,
  p_message TEXT,
  p_stack_trace TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_tags TEXT[] DEFAULT '{}'::text[]
) RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
BEGIN
  -- Check if an error with same fingerprint exists and is still open
  SELECT id INTO v_existing_id
  FROM error_logs
  WHERE fingerprint = p_fingerprint
    AND status IN ('open', 'investigating')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing error
    UPDATE error_logs
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW(),
      -- Keep the most recent context
      url = COALESCE(p_url, url),
      user_agent = COALESCE(p_user_agent, user_agent),
      ip_address = COALESCE(p_ip_address, ip_address),
      user_id = COALESCE(p_user_id, user_id),
      tenant_id = COALESCE(p_tenant_id, tenant_id)
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  ELSE
    -- Insert new error
    INSERT INTO error_logs (
      error_hash,
      fingerprint,
      error_type,
      severity,
      message,
      stack_trace,
      url,
      method,
      status_code,
      user_agent,
      ip_address,
      user_id,
      tenant_id,
      metadata,
      tags
    ) VALUES (
      p_error_hash,
      p_fingerprint,
      p_error_type,
      p_severity,
      p_message,
      p_stack_trace,
      p_url,
      p_method,
      p_status_code,
      p_user_agent,
      p_ip_address,
      p_user_id,
      p_tenant_id,
      p_metadata,
      p_tags
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create view for error statistics
CREATE OR REPLACE VIEW v_error_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  error_type,
  severity,
  status,
  COUNT(*) AS count,
  SUM(occurrence_count) AS total_occurrences
FROM error_logs
GROUP BY DATE_TRUNC('day', created_at), error_type, severity, status;

-- 12. Grant execute permission on functions
GRANT EXECUTE ON FUNCTION upsert_error_log TO authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin TO authenticated;

-- ===========================================
-- SET YOUR EMAIL AS PLATFORM ADMIN
-- Replace with your actual email
-- ===========================================
-- UPDATE users
-- SET is_platform_admin = TRUE
-- WHERE email = 'your-email@example.com';
