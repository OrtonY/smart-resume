import i18n from '../../../i18n'
import { createExportFilename, downloadBlob, type ExportFileExtension } from './fileDownload'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export async function downloadServerExport(
  path: string,
  headers: Record<string, string>,
  title: string,
  extension: ExportFileExtension,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers })

  if (!response.ok) {
    let serverMessage: string | null
    try {
      const text = await response.text()
      const parsed = JSON.parse(text) as { message?: string }
      serverMessage = parsed.message ?? null
    } catch {
      serverMessage = null
    }
    throw new Error(serverMessage ?? i18n.t('errors.requestFailed', { ns: 'common' }))
  }

  const blob = await response.blob()
  downloadBlob(blob, createExportFilename(title, extension))
}
