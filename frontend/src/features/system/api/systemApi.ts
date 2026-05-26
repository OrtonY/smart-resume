import { request } from '../../../lib/http/apiClient'
import type {
  AccessTokenResponse,
  BootstrapStatus,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegistrationSettingsResponse,
  SessionResponse,
} from '../types'

export function getBootstrapStatus() {
  return request<BootstrapStatus>('/api/system/bootstrap', { skipAuth: true })
}

export function login(payload: LoginRequest) {
  return request<AccessTokenResponse>('/api/system/login', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  })
}

export function register(payload: RegisterRequest) {
  return request<AccessTokenResponse>('/api/system/register', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  })
}

export function getSession() {
  return request<SessionResponse>('/api/system/session')
}

export function updateRegistrationSettings(registrationEnabled: boolean) {
  return request<RegistrationSettingsResponse>('/api/system/registration-settings', {
    method: 'PUT',
    body: { registrationEnabled },
  })
}

export function changePassword(payload: ChangePasswordRequest) {
  return request<void>('/api/system/password', {
    method: 'PUT',
    body: payload,
  })
}
