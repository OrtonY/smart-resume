import type {
  CoverLetterResponse,
  CreateApplicationMessage,
  EditableJobPayload,
  ExtensionRequest,
  ExtensionSession,
  ExtensionSettings,
  ExtensionStateResponse,
  GenerateCoverLetterMessage,
  JobApplicationResponse,
  LoginMessage,
  ResumeOption,
  SaveSettingsMessage,
} from './types'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
}

interface AccessTokenResponse {
  accessToken: string
  user: ExtensionSession['user']
}

interface ResumePageResponse {
  items: ResumeOption[]
}

interface ApplicationMappingEntry {
  applicationId: string
  createdAt: number
}

type StoredApplicationMapping = string | ApplicationMappingEntry

interface StorageShape {
  settings?: ExtensionSettings
  session?: ExtensionSession
  applicationMappings?: Record<string, StoredApplicationMapping>
}

const STORAGE_KEYS = {
  settings: 'smartResumeExtensionSettings',
  session: 'smartResumeExtensionSession',
  applicationMappings: 'smartResumeExtensionApplicationMappings',
} as const

const APPLICATION_MAPPING_RETENTION_MS = 24 * 60 * 60 * 1000

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  void handleMessage(message as ExtensionRequest)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error: unknown) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }))
  return true
})

async function handleMessage(message: ExtensionRequest) {
  switch (message.type) {
    case 'GET_STATE':
      return getState()
    case 'SAVE_SETTINGS':
      return saveSettings(message)
    case 'LOGIN':
      return login(message)
    case 'LOGOUT':
      return logout()
    case 'LIST_RESUMES':
      return listResumes()
    case 'CREATE_APPLICATION':
      return ensureApplication(message)
    case 'GENERATE_COVER_LETTER':
      return generateCoverLetter(message)
    default:
      throw new Error('Unsupported extension action')
  }
}

async function getState(): Promise<ExtensionStateResponse> {
  const storage = await readStorage()
  await pruneApplicationMappingsIfNeeded(storage.applicationMappings)
  return {
    settings: storage.settings ?? null,
    session: storage.session ?? null,
  }
}

async function saveSettings(message: SaveSettingsMessage) {
  const settings = { baseUrl: normalizeBaseUrl(message.baseUrl) }
  if (!settings.baseUrl) {
    throw new Error('Smart Resume URL is required')
  }
  await setStorage({ [STORAGE_KEYS.settings]: settings })
  return settings
}

async function login(message: LoginMessage) {
  const response = await apiRequest<AccessTokenResponse>('/api/system/login', {
    method: 'POST',
    body: {
      username: message.username,
      password: message.password,
    },
    skipAuth: true,
  })
  const session: ExtensionSession = {
    accessToken: response.accessToken,
    user: response.user,
  }
  await setStorage({ [STORAGE_KEYS.session]: session })
  return session
}

async function logout() {
  await removeStorage(STORAGE_KEYS.session)
  return null
}

async function listResumes() {
  const page = await apiRequest<ResumePageResponse>('/api/resumes?includeDeleted=false&page=1&pageSize=100')
  return page.items.map((resume) => ({ id: resume.id, title: resume.title }))
}

async function ensureApplication(message: CreateApplicationMessage) {
  const storage = await readStorage()
  const mappings = await pruneApplicationMappingsIfNeeded(storage.applicationMappings)
  const key = applicationMappingKey(message.job.url, message.resumeId)
  const existingApplicationId = mappings[key]?.applicationId
  if (existingApplicationId) {
    return { id: existingApplicationId, reused: true }
  }

  const application = await createApplication(message.resumeId, message.job)
  await saveApplicationMapping(key, application.id)
  return { ...application, reused: false }
}

async function generateCoverLetter(message: GenerateCoverLetterMessage) {
  const storage = await readStorage()
  const key = applicationMappingKey(message.job.url, message.resumeId)
  const mappings = await pruneApplicationMappingsIfNeeded(storage.applicationMappings)
  let applicationId = mappings[key]?.applicationId

  if (!applicationId) {
    const application = await createApplication(message.resumeId, message.job)
    applicationId = application.id
    await saveApplicationMapping(key, applicationId)
  }

  try {
    return await createCoverLetter(message, applicationId)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error
    }
    await removeApplicationMapping(key)
    const application = await createApplication(message.resumeId, message.job)
    await saveApplicationMapping(key, application.id)
    return createCoverLetter(message, application.id)
  }
}

async function createApplication(resumeId: string, job: EditableJobPayload) {
  return apiRequest<JobApplicationResponse>('/api/applications', {
    method: 'POST',
    body: {
      company: job.company,
      position: job.position,
      status: 'applied',
      channel: 'Boss直聘',
      resumeId,
      appliedAt: null,
      notes: buildApplicationNotes(job),
    },
  })
}

async function createCoverLetter(message: GenerateCoverLetterMessage, applicationId: string) {
  return apiRequest<CoverLetterResponse>(
    '/api/ai/resumes/' + encodeURIComponent(message.resumeId) + '/cover-letters',
    {
      method: 'POST',
      body: {
        applicationId,
        company: message.job.company,
        position: message.job.position,
        jobDescription: message.job.jobDescription,
        extraNotes: message.job.extraNotes || null,
        outputLanguage: message.outputLanguage,
      },
    },
  )
}

function buildApplicationNotes(job: EditableJobPayload) {
  const summary = summarize(job.jobDescription)
  return [
    '来源: Boss直聘',
    `URL: ${job.url}`,
    summary ? `JD摘要: ${summary}` : null,
    job.extraNotes ? `备注: ${job.extraNotes}` : null,
  ].filter(Boolean).join('\n')
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; skipAuth?: boolean } = {},
) {
  const storage = await readStorage()
  const baseUrl = storage.settings?.baseUrl
  if (!baseUrl) {
    throw new Error('Smart Resume URL is not configured')
  }

  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (!options.skipAuth) {
    const token = storage.session?.accessToken
    if (!token) {
      throw new Error('Please sign in to Smart Resume')
    }
    headers.set('X-Access-Token', token)
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body == null ? undefined : JSON.stringify(options.body),
  })
  const payload = await response.json() as ApiEnvelope<T>

  if (response.status === 401) {
    await removeStorage(STORAGE_KEYS.session)
  }
  if (!response.ok || !payload.success) {
    throw new ApiError(response.status, payload.message || 'Smart Resume request failed')
  }

  return payload.data
}

function applicationMappingKey(url: string, resumeId: string) {
  return `${normalizeUrl(url)}::${resumeId}`
}

async function saveApplicationMapping(key: string, applicationId: string) {
  const storage = await readStorage()
  const mappings = await pruneApplicationMappingsIfNeeded(storage.applicationMappings)
  await setStorage({
    [STORAGE_KEYS.applicationMappings]: {
      ...mappings,
      [key]: {
        applicationId,
        createdAt: Date.now(),
      },
    },
  })
}

async function removeApplicationMapping(key: string) {
  const storage = await readStorage()
  const mappings = await pruneApplicationMappingsIfNeeded(storage.applicationMappings)
  const next = { ...mappings }
  delete next[key]
  await setStorage({ [STORAGE_KEYS.applicationMappings]: next })
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

async function pruneApplicationMappingsIfNeeded(
  mappings: Record<string, StoredApplicationMapping> | undefined,
) {
  const result = pruneApplicationMappings(mappings)
  if (result.changed) {
    await setStorage({ [STORAGE_KEYS.applicationMappings]: result.mappings })
  }
  return result.mappings
}

function pruneApplicationMappings(mappings: Record<string, StoredApplicationMapping> | undefined) {
  const now = Date.now()
  const next: Record<string, ApplicationMappingEntry> = {}
  let changed = false

  for (const [key, entry] of Object.entries(mappings ?? {})) {
    if (isRetainedApplicationMapping(entry, now)) {
      next[key] = entry
    } else {
      changed = true
    }
  }

  return { mappings: next, changed }
}

function isRetainedApplicationMapping(entry: StoredApplicationMapping, now: number): entry is ApplicationMappingEntry {
  if (!entry || typeof entry === 'string') {
    return false
  }
  return Boolean(
    entry.applicationId
    && typeof entry.createdAt === 'number'
    && now - entry.createdAt < APPLICATION_MAPPING_RETENTION_MS,
  )
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString()
  } catch {
    return value.trim()
  }
}

function summarize(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized
}

function readStorage(): Promise<StorageShape> {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      STORAGE_KEYS.settings,
      STORAGE_KEYS.session,
      STORAGE_KEYS.applicationMappings,
    ], (items) => {
      resolve({
        settings: items[STORAGE_KEYS.settings] as ExtensionSettings | undefined,
        session: items[STORAGE_KEYS.session] as ExtensionSession | undefined,
        applicationMappings: items[STORAGE_KEYS.applicationMappings] as Record<string, StoredApplicationMapping> | undefined,
      })
    })
  })
}

function setStorage(items: Record<string, unknown>) {
  return new Promise<void>((resolve) => chrome.storage.local.set(items, resolve))
}

function removeStorage(keys: string | string[]) {
  return new Promise<void>((resolve) => chrome.storage.local.remove(keys, resolve))
}

class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
