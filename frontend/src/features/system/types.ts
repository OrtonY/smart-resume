export interface BootstrapStatus {
  hasUsers: boolean
  registrationEnabled: boolean
}

export interface SessionUser {
  userId: number
  username: string
  admin: boolean
}

export interface AccessTokenResponse {
  accessToken: string
  user: SessionUser
}

export interface SessionResponse {
  user: SessionUser
  registrationEnabled: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface RegistrationSettingsResponse {
  registrationEnabled: boolean
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
