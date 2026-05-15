import { request } from '../../../lib/http/apiClient'
import type { ResumeDetail, ResumePage, ShareLink, ShareMode } from '../types'

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

export function createShare(resumeId: string, mode: ShareMode) {
  return request<ShareLink>(`/api/resumes/${resumeId}/shares`, {
    method: 'POST',
    body: { mode },
  })
}

export function listShares(resumeId: string) {
  return request<ShareLink[]>(`/api/resumes/${resumeId}/shares`)
}

export function getPublicShare(shareCode: string) {
  return request<ResumeDetail>(`/api/public/shares/${shareCode}`, { skipAuth: true })
}
