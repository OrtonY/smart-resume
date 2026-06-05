export interface ExtensionSettings {
  baseUrl: string
}

export interface SessionUser {
  userId: number
  username: string
  admin: boolean
}

export interface ExtensionSession {
  accessToken: string
  user: SessionUser
}

export interface ResumeOption {
  id: string
  title: string
}

export interface JobSnapshot {
  company: string
  position: string
  jobDescription: string
  url: string
  warnings: string[]
}

export interface EditableJobPayload {
  company: string
  position: string
  jobDescription: string
  url: string
  extraNotes?: string
}

export interface JobApplicationResponse {
  id: string
  company: string
  position: string
  status: string
  channel: string | null
  resumeId: string | null
  resumeTitle: string | null
  appliedAt: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CoverLetterResponse {
  id: string
  resumeId: string
  applicationId: string | null
  company: string
  position: string
  jobDescription: string | null
  extraNotes: string | null
  outputLanguage: string
  title: string
  body: string
  createdAt: string | null
  updatedAt: string | null
}

export interface ExtensionStateResponse {
  settings: ExtensionSettings | null
  session: ExtensionSession | null
}

export interface SaveSettingsMessage {
  type: 'SAVE_SETTINGS'
  baseUrl: string
}

export interface LoginMessage {
  type: 'LOGIN'
  username: string
  password: string
}

export interface CreateApplicationMessage {
  type: 'CREATE_APPLICATION'
  resumeId: string
  job: EditableJobPayload
}

export interface GenerateCoverLetterMessage {
  type: 'GENERATE_COVER_LETTER'
  resumeId: string
  job: EditableJobPayload
  outputLanguage: 'CHINESE' | 'ENGLISH'
}

export type ExtensionRequest =
  | { type: 'GET_STATE' }
  | SaveSettingsMessage
  | LoginMessage
  | { type: 'LOGOUT' }
  | { type: 'LIST_RESUMES' }
  | CreateApplicationMessage
  | GenerateCoverLetterMessage

export type ContentRequest = { type: 'GET_JOB_SNAPSHOT' }
