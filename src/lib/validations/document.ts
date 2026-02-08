// Allowed MIME types for document uploads
export const ALLOWED_MIME_TYPES = [
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
  'image/webp',
] as const

// File extension to display label mapping
export const FILE_TYPE_MAP: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/csv': 'CSV',
  'text/plain': 'TXT',
  'text/xml': 'XML',
  'application/xml': 'XML',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_ENTITY = 10

export const ALLOWED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.xml,.jpg,.jpeg,.png,.webp'
