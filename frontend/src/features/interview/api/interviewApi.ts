import { request } from '../../../lib/http/apiClient'
import { streamEvents, streamGetEvents, type SseEvent } from '../../../lib/sse/streamEvents'
import type {
  InterviewAssistDto,
  InterviewCreatePayload,
  InterviewDetail,
  InterviewListQuery,
  InterviewPage,
  ReportStatusEvent,
} from '../types'

export interface InterviewStreamEvent extends SseEvent {
  type: 'message' | 'done' | 'error'
  content?: string
  conversationId?: string
}

export function listInterviews(query: InterviewListQuery = {}) {
  const params = new URLSearchParams()
  if (query.resumeId) params.set('resumeId', query.resumeId)
  if (query.status) params.set('status', query.status)
  if (query.targetCompany) params.set('targetCompany', query.targetCompany)
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

export function streamInterviewMessage(
  interviewId: string,
  content: string,
  onEvent: (event: InterviewStreamEvent) => void,
  options?: { signal?: AbortSignal },
) {
  return streamEvents<InterviewStreamEvent>(
    `/api/interviews/${interviewId}/messages/stream`,
    { content },
    onEvent,
    options,
  )
}

export function regenerateStreamInterviewMessage(
  interviewId: string,
  onEvent: (event: InterviewStreamEvent) => void,
  options?: { signal?: AbortSignal },
) {
  return streamEvents<InterviewStreamEvent>(
    `/api/interviews/${interviewId}/messages/regenerate-stream`,
    {},
    onEvent,
    options,
  )
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

export function streamReportEvents(
  interviewId: string,
  onEvent: (event: ReportStatusEvent) => void,
  options?: { signal?: AbortSignal },
) {
  return streamGetEvents<ReportStatusEvent>(
    `/api/interviews/${interviewId}/report/events`,
    onEvent,
    options,
  )
}

export function getAssist(interviewId: string, messageId: string) {
  return request<InterviewAssistDto>(`/api/interviews/${interviewId}/messages/${messageId}/assist`)
}

export function streamAssistAnswer(
  interviewId: string,
  messageId: string,
  onEvent: (event: InterviewStreamEvent) => void,
  options?: { signal?: AbortSignal },
) {
  return streamEvents<InterviewStreamEvent>(
    `/api/interviews/${interviewId}/messages/${messageId}/answer-stream`,
    {},
    onEvent,
    options,
  )
}

export function streamAssistScore(
  interviewId: string,
  messageId: string,
  candidateAnswer: string,
  onEvent: (event: InterviewStreamEvent) => void,
  options?: { signal?: AbortSignal },
) {
  return streamEvents<InterviewStreamEvent>(
    `/api/interviews/${interviewId}/messages/${messageId}/score-stream`,
    { candidateAnswer },
    onEvent,
    options,
  )
}
