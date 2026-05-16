import { clearAccessToken, getAccessToken } from '../../../lib/auth/tokenStorage'
import type {
  AiChatConversation,
  AiChatMessage,
  AiChatEvent,
  AiChatRequest,
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
  return streamEvents('/api/ai/chat/stream', payload, onEvent)
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

async function streamEvents(
  path: string,
  body: unknown,
  onEvent: (event: AiChatEvent) => void,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders({
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    }),
    body: JSON.stringify(body),
  })

  if (!response.ok || !response.body) {
    if (response.status === 401) {
      clearAccessToken()
    }
    throw new Error('AI stream failed')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const eventEnd = buffer.indexOf('\n\n')
      if (eventEnd < 0) {
        break
      }

      const rawEvent = buffer.slice(0, eventEnd)
      buffer = buffer.slice(eventEnd + 2)
      const dataLine = rawEvent
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'))

      if (!dataLine) {
        continue
      }

      const data = dataLine.slice(5).trim()
      if (!data) {
        continue
      }

      let event: AiChatEvent
      try {
        event = JSON.parse(data) as AiChatEvent
      } catch {
        event = { type: 'message', content: data }
      }
      onEvent(event)
    }
  }
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
