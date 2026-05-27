import { request } from '../../../lib/http/apiClient'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../../../lib/http/pageDefaults'
import type {
  ResumeDetail,
  ResumePage,
  ResumeVersionDetail,
  ResumeVersionSummary,
  ShareAccessLogsPage,
  ShareLink,
  ShareMode,
} from '../types'

export function listResumes(includeDeleted = false, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  return request<ResumePage>(`/api/resumes?includeDeleted=${includeDeleted}&page=${page}&pageSize=${pageSize}`)
}

export function listDeletedResumes(page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  return request<ResumePage>(`/api/resumes?deletedOnly=true&page=${page}&pageSize=${pageSize}`)
}

export function createResume(payload: { title: string; templateKey: string }) {
  return request<ResumeDetail>('/api/resumes', {
    method: 'POST',
    body: payload,
  })
}

export function copyResume(resumeId: string, payload: { title: string }) {
  return request<ResumeDetail>(`/api/resumes/${resumeId}/copy`, {
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

export function createResumeSnapshot(resumeId: string) {
  return request<ResumeVersionSummary>(`/api/resumes/${resumeId}/versions`, {
    method: 'POST',
  })
}

export function listResumeVersions(resumeId: string) {
  return request<ResumeVersionSummary[]>(`/api/resumes/${resumeId}/versions`)
}

export function getResumeVersion(resumeId: string, versionId: string) {
  return request<ResumeVersionDetail>(`/api/resumes/${resumeId}/versions/${versionId}`)
}

export function restoreResumeFromVersion(resumeId: string, versionId: string) {
  return request<ResumeDetail>(`/api/resumes/${resumeId}/versions/${versionId}/restore`, {
    method: 'POST',
  })
}

export function createShare(resumeId: string, title: string, mode: ShareMode, password?: string) {
  return request<ShareLink>(`/api/resumes/${resumeId}/shares`, {
    method: 'POST',
    body: { title, mode, password: password || null },
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
