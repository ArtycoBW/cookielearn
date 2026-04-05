import type { Material } from './types'

export const materialFormatOptions = [
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Документ' },
  { value: 'guide', label: 'Гайд' },
  { value: 'checklist', label: 'Чек-лист' },
  { value: 'presentation', label: 'Презентация' },
  { value: 'spreadsheet', label: 'Таблица' },
  { value: 'archive', label: 'Архив' },
  { value: 'repository', label: 'Репозиторий' },
  { value: 'link', label: 'Ссылка' },
] as const

const materialFormatAliases: Record<string, string> = {
  article: 'Статья',
  video: 'Видео',
  doc: 'Документ',
  docx: 'Документ',
  ppt: 'Презентация',
  pptx: 'Презентация',
  xls: 'Таблица',
  xlsx: 'Таблица',
  zip: 'Архив',
}

const materialFormatByExtension: Record<string, string> = {
  pdf: 'pdf',
  doc: 'document',
  docx: 'document',
  rtf: 'document',
  txt: 'document',
  ppt: 'presentation',
  pptx: 'presentation',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  zip: 'archive',
}

export const materialFileAccept = '.pdf,.doc,.docx,.rtf,.txt,.ppt,.pptx,.xls,.xlsx,.zip'
export const materialMaxFileSize = 25 * 1024 * 1024

export function resolveMaterialFormatLabel(value?: string | null) {
  const normalized = value?.trim().toLowerCase()

  if (!normalized) {
    return 'Материал'
  }

  return (
    materialFormatOptions.find((option) => option.value === normalized)?.label ??
    materialFormatAliases[normalized] ??
    value?.trim() ??
    'Материал'
  )
}

export function detectMaterialFormat(fileName?: string | null, fallback = 'document') {
  const extension = getMaterialExtension(fileName)
  return materialFormatByExtension[extension] ?? fallback
}

export function getMaterialExtension(fileName?: string | null) {
  if (!fileName) {
    return ''
  }

  const cleanName = fileName.trim().toLowerCase()
  const parts = cleanName.split('.')
  return parts.length > 1 ? parts[parts.length - 1] ?? '' : ''
}

export function formatFileSize(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes) || bytes <= 0) {
    return null
  }

  if (bytes < 1024) {
    return `${bytes} Б`
  }

  const units = ['КБ', 'МБ', 'ГБ']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 10 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function describeMaterialFile(material: Pick<Material, 'file_name' | 'file_size' | 'mime_type' | 'storage_path' | 'url'>) {
  const name = material.file_name?.trim()
  const size = formatFileSize(material.file_size)

  if (name && size) {
    return `${name} / ${size}`
  }

  if (name) {
    return name
  }

  if (size) {
    return size
  }

  if (material.storage_path) {
    return 'Файл в библиотеке'
  }

  if (material.url) {
    return 'Внешний ресурс'
  }

  return 'Материал'
}

export function getMaterialActionLabel(material: Pick<Material, 'storage_path' | 'file_name' | 'format'>) {
  if (material.storage_path) {
    const extension = getMaterialExtension(material.file_name)
    if (extension === 'pdf') {
      return 'Открыть PDF'
    }
    if (extension === 'doc' || extension === 'docx' || extension === 'rtf' || extension === 'txt') {
      return 'Открыть документ'
    }
    if (extension === 'ppt' || extension === 'pptx') {
      return 'Открыть презентацию'
    }
    if (extension === 'xls' || extension === 'xlsx') {
      return 'Открыть таблицу'
    }
    return 'Открыть файл'
  }

  return material.format === 'repository' ? 'Открыть репозиторий' : 'Открыть материал'
}

export function resolveMaterialPreview(material: Pick<Material, 'url' | 'file_name' | 'mime_type' | 'storage_path' | 'format'>) {
  const extension = getMaterialExtension(material.file_name)
  const lowerMime = material.mime_type?.toLowerCase() ?? ''
  const isPdf = extension === 'pdf' || lowerMime.includes('pdf')
  const isText = extension === 'txt' || extension === 'rtf' || lowerMime.startsWith('text/')
  const isOfficeDocument = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)

  if (isPdf || isText) {
    return {
      mode: 'iframe' as const,
      url: material.url,
    }
  }

  if (isOfficeDocument && material.storage_path) {
    return {
      mode: 'office' as const,
      url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(material.url)}`,
    }
  }

  return {
    mode: 'unsupported' as const,
    url: material.url,
  }
}
