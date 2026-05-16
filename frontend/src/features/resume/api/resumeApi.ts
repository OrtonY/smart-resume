import { request } from '../../../lib/http/apiClient'
import type { ResumeDetail, ResumePage, ShareAccessLogsPage, ShareLink, ShareMode } from '../types'

export function listResumes(includeDeleted = false, page = 1, pageSize = 6) {
  return request<ResumePage>(`/api/resumes?includeDeleted=${includeDeleted}&page=${page}&pageSize=${pageSize}`)
}

export function listDeletedResumes(page = 1, pageSize = 6) {
  return request<ResumePage>(`/api/resumes?deletedOnly=true&page=${page}&pageSize=${pageSize}`)
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

export function createShare(resumeId: string, mode: ShareMode, password?: string) {
  return request<ShareLink>(`/api/resumes/${resumeId}/shares`, {
    method: 'POST',
    body: { mode, password: password || null },
  })
}

export function listShares(resumeId: string) {
  return request<ShareLink[]>(`/api/resumes/${resumeId}/shares`)
}

export function getPublicShare(shareCode: string, shareToken?: string) {
  const headers: Record<string, string> = {}
  if (shareToken) {
    headers['X-Share-Token'] = shareToken
  }
  return request<ResumeDetail>(`/api/public/shares/${shareCode}`, { skipAuth: true, headers })
}

export function verifySharePassword(shareCode: string, password: string) {
  return request<{ token: string }>(`/api/public/shares/${shareCode}/verify`, {
    method: 'POST',
    body: { password },
    skipAuth: true,
  })
}

export function getShareAccessLogs(resumeId: string, shareCode: string) {
  return request<ShareAccessLogsPage>(`/api/resumes/${resumeId}/shares/${shareCode}/access-logs`)
}

export function toggleShare(resumeId: string, shareCode: string) {
  return request<void>(`/api/resumes/${resumeId}/shares/${shareCode}/toggle`, {
    method: 'PUT',
  })
}

export function deleteShare(resumeId: string, shareCode: string) {
  return request<void>(`/api/resumes/${resumeId}/shares/${shareCode}`, {
    method: 'DELETE',
  })
}
