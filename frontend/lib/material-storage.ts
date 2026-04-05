import { createClient } from './supabase'
import { detectMaterialFormat, getMaterialExtension, materialMaxFileSize } from './materials'

const defaultBucketName = process.env.NEXT_PUBLIC_SUPABASE_MATERIALS_BUCKET?.trim() || 'materials'

const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'rtf', 'txt', 'ppt', 'pptx', 'xls', 'xlsx', 'zip'])
const mimeTypeByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  rtf: 'application/rtf',
  txt: 'text/plain',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
}

export type MaterialUploadResult = {
  url: string
  storage_bucket: string
  storage_path: string
  file_name: string
  mime_type: string
  file_size: number
  suggested_format: string
}

export function validateMaterialFile(file: File) {
  const extension = getMaterialExtension(file.name)

  if (!allowedExtensions.has(extension)) {
    return 'Поддерживаем PDF, Word, PowerPoint, Excel, TXT, RTF и ZIP.'
  }

  if (file.size <= 0) {
    return 'Файл пустой.'
  }

  if (file.size > materialMaxFileSize) {
    return 'Файл слишком большой. Лимит: 25 МБ.'
  }

  return null
}

export async function uploadMaterialFile(file: File): Promise<MaterialUploadResult> {
  const validationError = validateMaterialFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const extension = getMaterialExtension(file.name)
  const contentType = file.type || mimeTypeByExtension[extension] || 'application/octet-stream'
  const bucket = defaultBucketName
  const path = buildStoragePath(file.name)
  const supabase = createClient()

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    contentType,
    upsert: false,
  })

  if (error) {
    throw new Error(error.message || 'Не удалось загрузить файл в Storage.')
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    url: publicUrl,
    storage_bucket: bucket,
    storage_path: path,
    file_name: file.name,
    mime_type: contentType,
    file_size: file.size,
    suggested_format: detectMaterialFormat(file.name),
  }
}

export async function deleteMaterialFile(storagePath?: string | null, bucket = defaultBucketName) {
  if (!storagePath) {
    return
  }

  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([storagePath])

  if (error) {
    throw new Error(error.message || 'Не удалось удалить файл из Storage.')
  }
}

function buildStoragePath(fileName: string) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeName = sanitizeFileName(fileName)
  return `materials/${year}/${month}/${crypto.randomUUID()}-${safeName}`
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim().toLowerCase()
  const parts = trimmed.split('.')
  const extension = parts.length > 1 ? parts.pop() ?? 'bin' : 'bin'
  const base = parts.join('.') || 'material'
  const safeBase = base
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${safeBase || 'material'}.${extension}`
}
