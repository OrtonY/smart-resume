import { request } from '../../../lib/http/apiClient'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../../../lib/http/pageDefaults'
import type {
  JobApplication,
  JobApplicationCreatePayload,
  JobApplicationListQuery,
  JobApplicationPage,
  JobApplicationUpdatePayload,
} from '../types'

export function listApplications(query: JobApplicationListQuery = {}) {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.keyword) params.set('keyword', query.keyword)
  params.set('page', String(query.page ?? DEFAULT_PAGE))
  params.set('pageSize', String(query.pageSize ?? DEFAULT_PAGE_SIZE))
  return request<JobApplicationPage>(`/api/applications?${params.toString()}`)
}

export function getApplication(id: string) {
  return request<JobApplication>(`/api/applications/${id}`)
}

export function createApplication(payload: JobApplicationCreatePayload) {
  return request<JobApplication>('/api/applications', {
    method: 'POST',
    body: payload,
  })
}

export function updateApplication(id: string, payload: JobApplicationUpdatePayload) {
  return request<JobApplication>(`/api/applications/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteApplication(id: string) {
  return request<void>(`/api/applications/${id}`, {
    method: 'DELETE',
  })
}
