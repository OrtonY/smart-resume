import { clearAccessToken, getAccessToken } from '../../../lib/auth/tokenStorage'
import { streamEvents } from '../../../lib/sse/streamEvents'
import type {
  AiChatConversation,
  AiChatMessage,
  AiChatEvent,
  AiChatRequest,
  AiResumeScoreRequest,
  AiResumeScoreResponse,
  AiConfiguration,
  AiConfigurationRequest,
  ListModelsRequest,
  ListModelsResponse,
  VendorMetadata,
} from '../types'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export async function getAiConfiguration() {
  return requestJson<AiConfiguration>('/api/ai/configuration')
}

export async function saveAiConfiguration(payload: AiConfigurationRequest) {
  return requestJson<AiConfiguration>('/api/ai/configuration', {
    method: 'PUT',
    body: payload,
  })
}

export async function scoreAiResume(payload: AiResumeScoreRequest) {
  return requestJson<AiResumeScoreResponse>('/api/ai/resume-score', {
    method: 'POST',
    body: payload,
  })
}

export function listAiChatConversations(resumeId: string) {
  return requestJson<AiChatConversation[]>('/api/ai/resumes/' + encodeURIComponent(resumeId) + '/chat/conversations')
}

export function listAiChatMessages(resumeId: string, conversationId: string) {
  return requestJson<AiChatMessage[]>(
    '/api/ai/resumes/' + encodeURIComponent(resumeId)
    + '/chat/conversations/' + encodeURIComponent(conversationId)
    + '/messages',
  )
}

export function streamAiChat(payload: AiChatRequest, onEvent: (event: AiChatEvent) => void) {
  return streamEvents<AiChatEvent>('/api/ai/chat/stream', payload, onEvent)
}

export async function getAiVendors() {
  return requestJson<VendorMetadata[]>('/api/ai/vendors')
}

export async function listAiModels(payload: ListModelsRequest) {
  return requestJson<ListModelsResponse>('/api/ai/models', {
    method: 'POST',
    body: payload,
  })
}

async function requestJson<T>(path: string, options: Omit<RequestInit, 'body'> & { body?: unknown } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
    body: options.body == null ? undefined : JSON.stringify(options.body),
  })
  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !payload.success) {
    if (response.status === 401) {
      clearAccessToken()
    }
    throw new Error(payload.message || 'AI request failed')
  }

  return payload.data
}

function buildHeaders(headers?: HeadersInit) {
  const next = new Headers(headers)
  next.set('Content-Type', 'application/json')
  const token = getAccessToken()
  if (token) {
    next.set('X-Access-Token', token)
  }
  return next
}
