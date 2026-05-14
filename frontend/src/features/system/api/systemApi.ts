import { request } from '../../../lib/http/apiClient'
import type { AccessTokenResponse, BootstrapStatus } from '../types'

export function getBootstrapStatus() {
  return request<BootstrapStatus>('/api/system/bootstrap', { skipAuth: true })
}

export function setupPassword(password: string) {
  return request<AccessTokenResponse>('/api/system/password/setup', {
    method: 'POST',
    body: { password },
    skipAuth: true,
  })
}

export function verifyPassword(password: string) {
  return request<AccessTokenResponse>('/api/system/password/verify', {
    method: 'POST',
    body: { password },
    skipAuth: true,
  })
}
