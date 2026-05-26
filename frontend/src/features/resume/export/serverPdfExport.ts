import { getAccessToken } from '../../../lib/auth/tokenStorage'
import i18n from '../../../i18n'
import { createExportFilename, downloadBlob } from './fileDownload'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

async function downloadPdf(path: string, headers: Record<string, string>, title: string) {
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
  downloadBlob(blob, createExportFilename(title, 'pdf'))
}

export async function exportResumeServerPdf(resumeId: string, title: string) {
  const headers: Record<string, string> = {
    'Accept-Language': i18n.language,
    'X-Resume-Language': i18n.language,
  }
  const token = getAccessToken()
  if (token) {
    headers['X-Access-Token'] = token
  }
  await downloadPdf(`/api/resumes/${resumeId}/exports/pdf`, headers, title)
}

export async function exportSharePdf(shareCode: string, title: string, shareToken?: string) {
  const headers: Record<string, string> = {
    'Accept-Language': i18n.language,
    'X-Resume-Language': i18n.language,
  }
  if (shareToken) {
    headers['X-Share-Token'] = shareToken
  }
  await downloadPdf(`/api/public/shares/${shareCode}/export/pdf`, headers, title)
}
