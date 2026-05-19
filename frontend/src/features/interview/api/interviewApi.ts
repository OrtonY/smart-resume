import { request } from '../../../lib/http/apiClient'
import type { InterviewCreatePayload, InterviewDetail, InterviewListQuery, InterviewPage } from '../types'

export function listInterviews(query: InterviewListQuery = {}) {
  const params = new URLSearchParams()
  if (query.resumeId) params.set('resumeId', query.resumeId)
  if (query.status) params.set('status', query.status)
  if (query.keyword) params.set('keyword', query.keyword)
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', String(query.pageSize ?? 6))
  return request<InterviewPage>(`/api/interviews?${params.toString()}`)
}

export function createInterview(payload: InterviewCreatePayload) {
  return request<InterviewDetail>('/api/interviews', {
    method: 'POST',
    body: payload,
  })
}

export function getInterview(interviewId: string) {
  return request<InterviewDetail>(`/api/interviews/${interviewId}`)
}

export function pauseInterview(interviewId: string) {
  return request<InterviewDetail>(`/api/interviews/${interviewId}/pause`, {
    method: 'POST',
  })
}

export function continueInterview(interviewId: string) {
  return request<InterviewDetail>(`/api/interviews/${interviewId}/continue`, {
    method: 'POST',
  })
}

export function nextInterviewRound(interviewId: string) {
  return request<InterviewDetail>(`/api/interviews/${interviewId}/next-round`, {
    method: 'POST',
  })
}

export function submitInterviewMessage(interviewId: string, content: string) {
  return request<InterviewDetail>(`/api/interviews/${interviewId}/messages`, {
    method: 'POST',
    body: { content },
  })
}

export function endInterview(interviewId: string) {
  return request<InterviewDetail>(`/api/interviews/${interviewId}/end`, {
    method: 'POST',
  })
}

export function regenerateReport(interviewId: string) {
  return request<void>(`/api/interviews/${interviewId}/report/regenerate`, {
    method: 'POST',
  })
}
