'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import type { DocumentEntityType } from '@/types'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_FILES_PER_ENTITY } from '@/lib/validations/document'

const ENTITY_PATH_MAP: Record<string, string> = {
  product: '/products',
  category: '/categories',
  location: '/locations',
  supplier: '/suppliers',
  customer: '/customers',
  purchase_order: '/purchase-orders',
  shipment: '/shipments',
  transfer: '/transfers',
  adjustment: '/adjustments',
  cycle_count: '/cycle-counts',
  return: '/returns',
}

async function getUserContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, name, email')
    .eq('id', user.id)
    .single()

  if (!userData) return null
  return { supabase, user, userData }
}

export async function getDocuments(entityType: DocumentEntityType, entityId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function uploadDocument(formData: FormData) {
  const ctx = await getUserContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { supabase, user, userData } = ctx

  const file = formData.get('file') as File
  const entityType = formData.get('entity_type') as DocumentEntityType
  const entityId = formData.get('entity_id') as string
  const notes = formData.get('notes') as string | null

  if (!file || !entityType || !entityId) {
    return { error: 'Missing required fields' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File exceeds 10MB limit' }
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { error: 'File type not allowed' }
  }

  // Check document count limit
  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if ((count || 0) >= MAX_FILES_PER_ENTITY) {
    return { error: `Maximum ${MAX_FILES_PER_ENTITY} documents per entity` }
  }

  // Determine version (check if same filename exists)
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('version')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('file_name', file.name)
    .order('version', { ascending: false })
    .limit(1)

  const version = existingDocs && existingDocs.length > 0
    ? existingDocs[0].version + 1
    : 1

  // Build storage path
  const uuid = crypto.randomUUID()
  const storagePath = `${userData.tenant_id}/${entityType}/${entityId}/${uuid}_${file.name}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  // Insert document record
  const { data: doc, error: insertError } = await supabase
    .from('documents')
    .insert({
      tenant_id: userData.tenant_id,
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      version,
      notes: notes || null,
      uploaded_by: user.id,
      uploaded_by_name: userData.name,
    })
    .select()
    .single()

  if (insertError) {
    // Rollback: delete uploaded file
    await supabase.storage.from('documents').remove([storagePath])
    return { error: insertError.message }
  }

  await createAuditLog({
    action: 'upload',
    resourceType: 'document',
    resourceId: doc.id,
    resourceName: file.name,
    newValues: {
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      version,
    },
  })

  revalidatePath(ENTITY_PATH_MAP[entityType] || '/')

  return { success: true, document: doc }
}

export async function getDocumentDownloadUrl(documentId: string) {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !doc) return { error: 'Document not found' }

  const { data: urlData, error: urlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 60)

  if (urlError) return { error: urlError.message }

  return { url: urlData.signedUrl, fileName: doc.file_name }
}

export async function deleteDocument(documentId: string) {
  const ctx = await getUserContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { supabase } = ctx

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (fetchError || !doc) return { error: 'Document not found' }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([doc.storage_path])

  if (storageError) {
    return { error: `Failed to delete file: ${storageError.message}` }
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  await createAuditLog({
    action: 'delete',
    resourceType: 'document',
    resourceId: documentId,
    resourceName: doc.file_name,
    oldValues: {
      entity_type: doc.entity_type,
      entity_id: doc.entity_id,
      file_name: doc.file_name,
      file_size: doc.file_size,
    },
  })

  revalidatePath(ENTITY_PATH_MAP[doc.entity_type] || '/')

  return { success: true }
}

/**
 * Delete all documents associated with an entity.
 * Call this before deleting the entity itself.
 */
export async function deleteEntityDocuments(entityType: DocumentEntityType, entityId: string) {
  const ctx = await getUserContext()
  if (!ctx) return

  const { supabase } = ctx

  const { data: docs } = await supabase
    .from('documents')
    .select('id, storage_path')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (docs && docs.length > 0) {
    await supabase.storage.from('documents').remove(docs.map(d => d.storage_path))
    await supabase
      .from('documents')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
  }
}
