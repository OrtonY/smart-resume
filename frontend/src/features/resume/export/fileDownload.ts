export function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export type ExportFileExtension = 'pdf' | 'docx'

export function createExportFilename(title: string, extension: ExportFileExtension) {
  const normalizedTitle = title.trim() || 'resume'
  const safeTitle = normalizedTitle
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${safeTitle || 'resume'}.${extension}`
}
