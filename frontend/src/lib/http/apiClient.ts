import i18n from '../../i18n'
import { clearAccessToken, getAccessToken } from '../auth/tokenStorage'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuth?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept-Language', i18n.language)

  if (!options.skipAuth) {
    const token = getAccessToken()
    if (token) {
      headers.set('X-Access-Token', token)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body == null ? undefined : JSON.stringify(options.body),
  })

  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !payload.success) {
    if (response.status === 401) {
      clearAccessToken()
    }
    throw new Error(payload.message || i18n.t('errors.requestFailed', { ns: 'common' }))
  }

  return payload.data
}
