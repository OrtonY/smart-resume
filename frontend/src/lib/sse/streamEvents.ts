import { clearAccessToken, getAccessToken } from '../auth/tokenStorage'

export interface SseEvent {
  type: string
}

export interface StreamEventsOptions {
  signal?: AbortSignal
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export async function streamEvents<T extends SseEvent>(
  path: string,
  body: unknown,
  onEvent: (event: T) => void,
  options?: StreamEventsOptions,
) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'Cache-Control': 'no-cache',
  })
  const token = getAccessToken()
  if (token) {
    headers.set('X-Access-Token', token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: options?.signal,
  })

  if (!response.ok || !response.body) {
    if (response.status === 401) {
      clearAccessToken()
    }
    throw new Error('Stream request failed')
  }

  await readSseResponse(response, onEvent)
}

export async function streamGetEvents<T>(
  path: string,
  onEvent: (event: T) => void,
  options?: StreamEventsOptions,
) {
  const headers = new Headers({
    Accept: 'text/event-stream',
    'Cache-Control': 'no-cache',
  })
  const token = getAccessToken()
  if (token) {
    headers.set('X-Access-Token', token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    signal: options?.signal,
  })

  if (!response.ok || !response.body) {
    if (response.status === 401) {
      clearAccessToken()
    }
    throw new Error('Stream request failed')
  }

  await readSseResponse(response, onEvent)
}

async function readSseResponse<T>(response: Response, onEvent: (event: T) => void) {
  if (!response.body) {
    throw new Error('Stream request failed')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      while (true) {
        const eventEnd = buffer.indexOf('\n\n')
        if (eventEnd < 0) break

        const rawEvent = buffer.slice(0, eventEnd)
        buffer = buffer.slice(eventEnd + 2)
        const dataLine = rawEvent
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line.startsWith('data:'))

        if (!dataLine) continue

        const data = dataLine.slice(5).trim()
        if (!data) continue

        let event: T
        try {
          event = JSON.parse(data) as T
        } catch {
          event = { type: 'message', content: data } as unknown as T
        }
        onEvent(event)
      }
    }
  } finally {
    reader.releaseLock()
  }
}
