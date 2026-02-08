'use client'

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Trash2,
  Download,
  CloudUpload,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import {
  uploadDocument,
  getDocuments,
  getDocumentDownloadUrl,
  deleteDocument,
} from '@/lib/actions/documents'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_ENTITY,
  FILE_TYPE_MAP,
} from '@/lib/validations/document'
import type { Document, DocumentEntityType } from '@/types'

interface DocumentUploadProps {
  entityType: DocumentEntityType
  entityId: string | null
  readOnly?: boolean
}

export interface DocumentUploadHandle {
  uploadQueuedFiles: (entityId: string) => Promise<void>
  hasQueuedFiles: () => boolean
}

interface QueuedFile {
  id: string
  file: globalThis.File
  name: string
  size: number
  mimeType: string
}

export const DocumentUpload = forwardRef<DocumentUploadHandle, DocumentUploadProps>(
  function DocumentUpload({ entityType, entityId, readOnly = false }, ref) {
    const { t } = useTranslation()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [documents, setDocuments] = useState<Document[]>([])
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
    const [queuedFileToRemove, setQueuedFileToRemove] = useState<QueuedFile | null>(null)

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      uploadQueuedFiles: async (newEntityId: string) => {
        if (queuedFiles.length === 0) return

        let successCount = 0
        for (const queued of queuedFiles) {
          const formData = new FormData()
          formData.append('file', queued.file)
          formData.append('entity_type', entityType)
          formData.append('entity_id', newEntityId)

          try {
            const result = await uploadDocument(formData)
            if (result.error) {
              toast.error(`${queued.name}: ${result.error}`)
            } else {
              successCount++
            }
          } catch {
            toast.error(`${queued.name}: ${t('toast.errorOccurred')}`)
          }
        }

        if (successCount > 0) {
          toast.success(t('documents.uploadSuccess').replace('{count}', String(successCount)))
        }
        setQueuedFiles([])
      },
      hasQueuedFiles: () => queuedFiles.length > 0,
    }), [queuedFiles, entityType, t])

    const loadDocuments = useCallback(async () => {
      if (!entityId) return
      setLoading(true)
      try {
        const data = await getDocuments(entityType, entityId)
        setDocuments(data)
      } catch {
        toast.error(t('toast.errorOccurred'))
      } finally {
        setLoading(false)
      }
    }, [entityType, entityId, t])

    useEffect(() => {
      loadDocuments()
    }, [loadDocuments])

    const validateFile = (file: globalThis.File): string | null => {
      if (file.size > MAX_FILE_SIZE) {
        return t('documents.fileTooLarge').replace('{name}', file.name)
      }
      if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        return t('documents.allowedTypes')
      }
      return null
    }

    const handleUpload = async (files: FileList | globalThis.File[]) => {
      const fileArray = Array.from(files)
      const totalCount = documents.length + queuedFiles.length + fileArray.length

      if (totalCount > MAX_FILES_PER_ENTITY) {
        toast.error(t('documents.maxFilesReached').replace('{max}', String(MAX_FILES_PER_ENTITY)))
        return
      }

      // If no entityId, queue files locally
      if (!entityId) {
        const newQueued: QueuedFile[] = []
        for (const file of fileArray) {
          const error = validateFile(file)
          if (error) {
            toast.error(error)
            continue
          }
          newQueued.push({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            size: file.size,
            mimeType: file.type,
          })
        }
        if (newQueued.length > 0) {
          setQueuedFiles((prev) => [...prev, ...newQueued])
          toast.success(t('documents.filesQueued').replace('{count}', String(newQueued.length)))
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      // If entityId exists, upload directly
      setUploading(true)
      let successCount = 0

      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          toast.error(error)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('entity_type', entityType)
        formData.append('entity_id', entityId)

        try {
          const result = await uploadDocument(formData)
          if (result.error) {
            toast.error(`${file.name}: ${result.error}`)
          } else {
            successCount++
          }
        } catch {
          toast.error(`${file.name}: ${t('toast.errorOccurred')}`)
        }
      }

      if (successCount > 0) {
        toast.success(t('documents.uploadSuccess').replace('{count}', String(successCount)))
        await loadDocuments()
      }

      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleDownload = async (doc: Document) => {
      try {
        const result = await getDocumentDownloadUrl(doc.id)
        if (result.error) {
          toast.error(result.error)
          return
        }
        // Use fetch + blob to download with original filename
        const response = await fetch(result.url!)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.file_name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch {
        toast.error(t('toast.errorOccurred'))
      }
    }

    const handleDelete = async () => {
      if (queuedFileToRemove) {
        setQueuedFiles((prev) => prev.filter((f) => f.id !== queuedFileToRemove.id))
        setDeleteDialogOpen(false)
        setQueuedFileToRemove(null)
        return
      }

      if (!documentToDelete) return

      try {
        const result = await deleteDocument(documentToDelete.id)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(t('documents.deleteSuccess'))
          await loadDocuments()
        }
      } catch {
        toast.error(t('toast.errorOccurred'))
      }
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files)
      }
    }

    const getFileIcon = (mimeType: string) => {
      if (mimeType.startsWith('image/')) return FileImage
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
        return FileSpreadsheet
      if (mimeType === 'application/pdf' || mimeType.includes('word'))
        return FileText
      return File
    }

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const deleteDialogName = queuedFileToRemove?.name || documentToDelete?.file_name || ''
    const totalFileCount = documents.length + queuedFiles.length

    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('documents.title')}
            </CardTitle>
            {!readOnly && (
              <Badge variant="outline">
                {totalFileCount} / {MAX_FILES_PER_ENTITY}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag-and-drop upload area */}
            {!readOnly && (
              <div
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-colors
                  ${dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                  }
                  ${uploading ? 'pointer-events-none opacity-50' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {uploading ? t('documents.uploading') : t('documents.dropzone')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('documents.allowedTypes')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('documents.maxSize')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_EXTENSIONS}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleUpload(e.target.files)
                    }
                  }}
                />
              </div>
            )}

            {/* Queued files (pending upload) */}
            {queuedFiles.length > 0 && (
              <div className="space-y-2">
                {queuedFiles.map((queued) => {
                  const Icon = getFileIcon(queued.mimeType)
                  const typeLabel = FILE_TYPE_MAP[queued.mimeType] || 'FILE'

                  return (
                    <div
                      key={queued.id}
                      className="flex items-center gap-3 p-3 border rounded-lg border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                    >
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded bg-amber-100 dark:bg-amber-900/30">
                        <Icon className="h-5 w-5 text-amber-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{queued.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-300 text-amber-700">
                            {typeLabel}
                          </Badge>
                          <span>{formatFileSize(queued.size)}</span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" />
                            {t('documents.pendingUpload')}
                          </span>
                        </div>
                      </div>

                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setQueuedFileToRemove(queued)
                            setDeleteDialogOpen(true)
                          }}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Uploaded document list */}
            {entityId && loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : documents.length === 0 && queuedFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('documents.noDocuments')}
              </p>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const Icon = getFileIcon(doc.mime_type)
                  const typeLabel = FILE_TYPE_MAP[doc.mime_type] || 'FILE'

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {typeLabel}
                          </Badge>
                          <span>{formatFileSize(doc.file_size)}</span>
                          {doc.version > 1 && (
                            <span>v{doc.version}</span>
                          )}
                          {doc.uploaded_by_name && (
                            <span className="hidden sm:inline">{doc.uploaded_by_name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                          title={t('documents.download')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => {
                              setDocumentToDelete(doc)
                              setDeleteDialogOpen(true)
                            }}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setDocumentToDelete(null)
            setQueuedFileToRemove(null)
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dialog.confirmDelete')}</DialogTitle>
              <DialogDescription>
                {t('documents.confirmDelete').replace('{name}', deleteDialogName)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }
)
