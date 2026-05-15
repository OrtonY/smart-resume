import { request } from '../../../lib/http/apiClient'
import type {
  ExportPlaceholderResponse,
  ResumeDetail,
  ResumeSummary,
  ShareLink,
  ShareMode,
} from '../types'

export function listResumes(includeDeleted = false) {
  return request<ResumeSummary[]>(`/api/resumes?includeDeleted=${includeDeleted}`)
}

export function createResume(payload: { title: string; templateKey: string }) {
  return request<ResumeDetail>('/api/resumes', {
    method: 'POST',
    body: payload,
  })
}

export function getResume(resumeId: string) {
  return request<ResumeDetail>(`/api/resumes/${resumeId}`)
}

export function updateResume(
  resumeId: string,
  payload: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'>,
) {
  return request<ResumeDetail>(`/api/resumes/${resumeId}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteResume(resumeId: string) {
  return request<void>(`/api/resumes/${resumeId}`, {
    method: 'DELETE',
  })
}

export function restoreResume(resumeId: string) {
  return request<void>(`/api/resumes/${resumeId}/recover`, {
    method: 'POST',
  })
}

export function createShare(resumeId: string, mode: ShareMode) {
  return request<ShareLink>(`/api/resumes/${resumeId}/shares`, {
    method: 'POST',
    body: { mode },
  })
}

export function listShares(resumeId: string) {
  return request<ShareLink[]>(`/api/resumes/${resumeId}/shares`)
}

export function requestPdfExport(resumeId: string) {
  return request<ExportPlaceholderResponse>(`/api/resumes/${resumeId}/exports/pdf`, {
    method: 'POST',
  })
}

export function getPublicShare(shareCode: string) {
  return request<ResumeDetail>(`/api/public/shares/${shareCode}`, { skipAuth: true })
}
