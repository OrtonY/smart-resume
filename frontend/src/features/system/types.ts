export interface BootstrapStatus {
  passwordConfigured: boolean
  firstTimeSetupRequired: boolean
}

export interface AccessTokenResponse {
  accessToken: string
  credentialUpdatedAt: string
}
