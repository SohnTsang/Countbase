-- Migration: Add shared document upload system
-- Supports document attachments for all entity types

-- Create entity_type enum for documents
DO $$ BEGIN
  CREATE TYPE document_entity_type AS ENUM (
    'product',
    'category',
    'location',
    'supplier',
    'customer',
    'purchase_order',
    'shipment',
    'transfer',
    'adjustment',
    'cycle_count',
    'return'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type document_entity_type NOT NULL,
  entity_id UUID NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,

  -- Tracking
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their tenant's documents
CREATE POLICY "Users can view their tenant documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- RLS: Users can insert documents for their tenant
CREATE POLICY "Users can upload documents for their tenant"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- RLS: Users can update documents in their tenant
CREATE POLICY "Users can update their tenant documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- RLS: Admin/manager/staff can delete tenant documents
CREATE POLICY "Staff can delete tenant documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    tenant_id = (
      SELECT u.tenant_id FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager', 'staff')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;

-- Create storage bucket for documents (private, 10MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'text/xml',
    'application/xml',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Upload to own tenant path
CREATE POLICY "Users can upload to own tenant path"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Storage RLS: Download from own tenant path
CREATE POLICY "Users can download from own tenant path"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Storage RLS: Delete from own tenant path
CREATE POLICY "Users can delete from own tenant path"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM users WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE documents IS 'Shared document attachments for all entity types';
COMMENT ON COLUMN documents.storage_path IS 'Full path in Supabase Storage: {tenant_id}/{entity_type}/{entity_id}/{uuid}_{filename}';
COMMENT ON COLUMN documents.version IS 'Incrementing version number for same-name file replacements';
