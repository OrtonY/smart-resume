import { getAccessToken } from '../../../lib/auth/tokenStorage'
import i18n from '../../../i18n'
import { downloadServerExport } from './serverFileExport'

export async function exportResumeServerPdf(resumeId: string, title: string) {
  const headers: Record<string, string> = {
    'Accept-Language': i18n.language,
    'X-Resume-Language': i18n.language,
  }
  const token = getAccessToken()
  if (token) {
    headers['X-Access-Token'] = token
  }
  await downloadServerExport(`/api/resumes/${resumeId}/exports/pdf`, headers, title, 'pdf')
}

export async function exportSharePdf(shareCode: string, title: string, shareToken?: string) {
  const headers: Record<string, string> = {
    'Accept-Language': i18n.language,
    'X-Resume-Language': i18n.language,
  }
  if (shareToken) {
    headers['X-Share-Token'] = shareToken
  }
  await downloadServerExport(`/api/public/shares/${shareCode}/export/pdf`, headers, title, 'pdf')
}
