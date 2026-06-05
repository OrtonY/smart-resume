import './popup.css'
import type {
  ContentRequest,
  CoverLetterResponse,
  EditableJobPayload,
  ExtensionRequest,
  ExtensionSession,
  ExtensionSettings,
  ExtensionStateResponse,
  JobSnapshot,
  ResumeOption,
} from './types'

type Step = 'config' | 'login' | 'main'
type OutputLanguage = 'CHINESE' | 'ENGLISH'

interface RuntimeEnvelope<T> {
  ok: boolean
  data?: T
  error?: string
}

interface ApplicationSaveResult {
  id: string
  reused?: boolean
}

interface ViewState {
  step: Step
  settings: ExtensionSettings | null
  session: ExtensionSession | null
  job: EditableJobPayload
  jobWarnings: string[]
  resumes: ResumeOption[]
  resumeId: string
  outputLanguage: OutputLanguage
  coverLetter: CoverLetterResponse | null
  feedback: string | null
  error: string | null
  loading: boolean
}

const EMPTY_JOB: EditableJobPayload = {
  company: '',
  position: '',
  jobDescription: '',
  url: '',
  extraNotes: '',
}

const LOCALES = {
  'zh-CN': {
    title: 'Smart Resume 投递助手',
    subtitle: '保存当前 Boss 职位，并生成求职信。',
    configTitle: '配置主站',
    configDescription: '首次使用前，请填写 Smart Resume 主站或后端访问地址。',
    baseUrl: '主站 URL',
    baseUrlPlaceholder: '例如：http://localhost:8080',
    saveConfig: '保存配置',
    loginTitle: '登录 Smart Resume',
    username: '用户名',
    password: '密码',
    login: '登录',
    changeUrl: '修改主站 URL',
    jobTitle: '职位信息',
    company: '公司',
    position: '岗位',
    jobDescription: 'JD',
    url: '来源 URL',
    extraNotes: '补充备注',
    extraNotesPlaceholder: '可选：写给 AI 的求职信偏好或要强调的亮点',
    warnings: '部分字段未识别，请手动补充。',
    resume: '选择简历',
    resumePlaceholder: '请选择一份简历',
    noResumes: '没有可用简历',
    language: '求职信语言',
    chinese: '中文',
    english: '英文',
    saveApplication: '投递记录入库',
    generateCoverLetter: '生成求职信',
    logout: '退出登录',
    refresh: '刷新',
    working: '处理中...',
    result: '生成结果',
    copy: '复制正文',
    copied: '已复制',
    configSaved: '配置已保存',
    loginSuccess: '登录成功',
    applicationSaved: '投递记录已保存',
    applicationReused: '已复用投递记录',
    coverLetterGenerated: '求职信已生成',
    copyFailed: '复制失败，请手动选择正文复制',
    requiredFields: '请填写主站 URL、公司、岗位，并选择简历',
  },
  'en-US': {
    title: 'Smart Resume Helper',
    subtitle: 'Save the current BOSS job and generate a cover letter.',
    configTitle: 'Connect Smart Resume',
    configDescription: 'Enter the Smart Resume site or backend URL before first use.',
    baseUrl: 'Site URL',
    baseUrlPlaceholder: 'Example: http://localhost:8080',
    saveConfig: 'Save settings',
    loginTitle: 'Sign in to Smart Resume',
    username: 'Username',
    password: 'Password',
    login: 'Sign in',
    changeUrl: 'Change site URL',
    jobTitle: 'Job details',
    company: 'Company',
    position: 'Position',
    jobDescription: 'JD',
    url: 'Source URL',
    extraNotes: 'Extra notes',
    extraNotesPlaceholder: 'Optional: preferences or highlights for the cover letter',
    warnings: 'Some fields were not detected. Please complete them manually.',
    resume: 'Resume',
    resumePlaceholder: 'Select a resume',
    noResumes: 'No resumes available',
    language: 'Cover letter language',
    chinese: 'Chinese',
    english: 'English',
    saveApplication: 'Save application',
    generateCoverLetter: 'Generate cover letter',
    logout: 'Sign out',
    refresh: 'Refresh',
    working: 'Working...',
    result: 'Generated result',
    copy: 'Copy body',
    copied: 'Copied',
    configSaved: 'Settings saved',
    loginSuccess: 'Signed in',
    applicationSaved: 'Application saved',
    applicationReused: 'Reused saved application',
    coverLetterGenerated: 'Cover letter generated',
    copyFailed: 'Copy failed. Select the text manually.',
    requiredFields: 'Enter the site URL, company, position, and select a resume',
  },
} as const

const locale = navigator.language.startsWith('en') ? 'en-US' : 'zh-CN'
const text = LOCALES[locale]
const root = document.getElementById('extension-root')

let state: ViewState = {
  step: 'config',
  settings: null,
  session: null,
  job: EMPTY_JOB,
  jobWarnings: [],
  resumes: [],
  resumeId: '',
  outputLanguage: 'CHINESE',
  coverLetter: null,
  feedback: null,
  error: null,
  loading: false,
}

void hydrate()

async function hydrate() {
  await runAction(async () => {
    const extensionState = await sendRuntimeMessage<ExtensionStateResponse>({ type: 'GET_STATE' })
    state = {
      ...state,
      settings: extensionState.settings,
      session: extensionState.session,
      step: !extensionState.settings ? 'config' : extensionState.session ? 'main' : 'login',
    }
    await loadCurrentJob()
    if (extensionState.settings && extensionState.session) {
      await loadResumes()
    }
  }, false)
}

async function loadCurrentJob() {
  try {
    const snapshot = await readJobSnapshot()
    state = {
      ...state,
      job: {
        company: snapshot.company,
        position: snapshot.position,
        jobDescription: snapshot.jobDescription,
        url: snapshot.url,
        extraNotes: snapshot.extraNotes,
      },
      jobWarnings: snapshot.warnings,
    }
  } catch {
    state = { ...state, jobWarnings: ['job_snapshot_unavailable'] }
  }
}

async function loadResumes() {
  const resumes = await sendRuntimeMessage<ResumeOption[]>({ type: 'LIST_RESUMES' })
  state = {
    ...state,
    resumes,
    resumeId: state.resumeId || resumes[0]?.id || '',
  }
}

function render() {
  if (!root) return
  root.className = 'extension-shell'
  root.innerHTML = `
    <header class="extension-header">
      <div>
        <h1>${escapeHtml(text.title)}</h1>
        <p>${escapeHtml(text.subtitle)}</p>
      </div>
      ${state.session ? `<button class="extension-button extension-button--ghost" data-action="logout" type="button">${escapeHtml(text.logout)}</button>` : ''}
    </header>
    ${state.feedback ? `<div class="extension-alert extension-alert--success">${escapeHtml(state.feedback)}</div>` : ''}
    ${state.error ? `<div class="extension-alert extension-alert--error">${escapeHtml(state.error)}</div>` : ''}
    ${state.step === 'config' ? renderConfig() : ''}
    ${state.step === 'login' ? renderLogin() : ''}
    ${state.step === 'main' ? renderMain() : ''}
  `
  bindEvents()
}

function renderConfig() {
  return `
    <section class="extension-panel">
      <h2>${escapeHtml(text.configTitle)}</h2>
      <p>${escapeHtml(text.configDescription)}</p>
      ${renderInput('baseUrl', text.baseUrl, state.settings?.baseUrl ?? '', text.baseUrlPlaceholder)}
      <button class="extension-button extension-button--primary" data-action="save-settings" type="button">
        ${escapeHtml(state.loading ? text.working : text.saveConfig)}
      </button>
    </section>
  `
}

function renderLogin() {
  return `
    <section class="extension-panel">
      <h2>${escapeHtml(text.loginTitle)}</h2>
      ${renderInput('username', text.username)}
      ${renderInput('password', text.password, '', '', 'password')}
      <div class="extension-actions">
        <button class="extension-button extension-button--primary" data-action="login" type="button">
          ${escapeHtml(state.loading ? text.working : text.login)}
        </button>
        <button class="extension-button extension-button--ghost" data-action="show-config" type="button">
          ${escapeHtml(text.changeUrl)}
        </button>
      </div>
    </section>
  `
}

function renderMain() {
  return `
    <section class="extension-stack">
      <section class="extension-panel">
        <div class="extension-section-head">
          <h2>${escapeHtml(text.jobTitle)}</h2>
          <button class="extension-button extension-button--ghost" data-action="refresh" type="button">${escapeHtml(text.refresh)}</button>
        </div>
        ${state.jobWarnings.length > 0 ? `<div class="extension-alert extension-alert--warning">${escapeHtml(text.warnings)}</div>` : ''}
        ${renderInput('company', text.company, state.job.company)}
        ${renderInput('position', text.position, state.job.position)}
        ${renderTextarea('jobDescription', text.jobDescription, state.job.jobDescription, 6)}
        ${renderTextarea('extraNotes', text.extraNotes, state.job.extraNotes ?? '', 3, text.extraNotesPlaceholder)}
      </section>
      <section class="extension-panel">
        <label>
          <span>${escapeHtml(text.resume)}</span>
          <select data-field="resumeId">
            <option value="">${escapeHtml(text.resumePlaceholder)}</option>
            ${state.resumes.map((resume) => `
              <option value="${escapeHtml(resume.id)}" ${resume.id === state.resumeId ? 'selected' : ''}>${escapeHtml(resume.title)}</option>
            `).join('')}
          </select>
        </label>
        ${state.resumes.length === 0 ? `<p class="extension-muted">${escapeHtml(text.noResumes)}</p>` : ''}
        <label>
          <span>${escapeHtml(text.language)}</span>
          <select data-field="outputLanguage">
            <option value="CHINESE" ${state.outputLanguage === 'CHINESE' ? 'selected' : ''}>${escapeHtml(text.chinese)}</option>
            <option value="ENGLISH" ${state.outputLanguage === 'ENGLISH' ? 'selected' : ''}>${escapeHtml(text.english)}</option>
          </select>
        </label>
        <div class="extension-actions">
          <button class="extension-button" data-action="save-application" type="button">${escapeHtml(state.loading ? text.working : text.saveApplication)}</button>
          <button class="extension-button extension-button--primary" data-action="generate-letter" type="button">${escapeHtml(state.loading ? text.working : text.generateCoverLetter)}</button>
        </div>
      </section>
      ${state.coverLetter ? renderCoverLetter(state.coverLetter) : ''}
    </section>
  `
}

function renderCoverLetter(letter: CoverLetterResponse) {
  return `
    <section class="extension-panel">
      <div class="extension-section-head">
        <h2>${escapeHtml(text.result)}</h2>
        <button class="extension-button extension-button--ghost" data-action="copy-letter" type="button">${escapeHtml(text.copy)}</button>
      </div>
      <h3>${escapeHtml(letter.title)}</h3>
      <pre class="extension-letter">${escapeHtml(letter.body)}</pre>
    </section>
  `
}

function renderInput(name: string, label: string, value = '', placeholder = '', type = 'text') {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input data-field="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
    </label>
  `
}

function renderTextarea(name: string, label: string, value: string, rows: number, placeholder = '') {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <textarea data-field="${escapeHtml(name)}" rows="${rows}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `
}

function bindEvents() {
  root?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]').forEach((field) => {
    field.addEventListener('input', () => updateField(field.dataset.field ?? '', field.value))
    field.addEventListener('change', () => updateField(field.dataset.field ?? '', field.value))
  })
  root?.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      void handleAction(button.dataset.action ?? '')
    })
  })
}

function updateField(name: string, value: string) {
  if (name === 'baseUrl') {
    state = { ...state, settings: { baseUrl: value } }
    return
  }
  if (name === 'resumeId') {
    state = { ...state, resumeId: value }
    return
  }
  if (name === 'outputLanguage') {
    state = { ...state, outputLanguage: value as OutputLanguage }
    return
  }
  if (name in state.job) {
    state = { ...state, job: { ...state.job, [name]: value } }
  }
}

async function handleAction(action: string) {
  switch (action) {
    case 'save-settings':
      await saveSettings()
      break
    case 'login':
      await login()
      break
    case 'logout':
      await logout()
      break
    case 'show-config':
      state = { ...state, step: 'config', feedback: null, error: null }
      render()
      break
    case 'refresh':
      await hydrate()
      break
    case 'save-application':
      await saveApplication()
      break
    case 'generate-letter':
      await generateCoverLetter()
      break
    case 'copy-letter':
      await copyLetter()
      break
  }
}

async function saveSettings() {
  const baseUrl = state.settings?.baseUrl.trim() ?? ''
  if (!baseUrl) {
    state = { ...state, error: text.requiredFields }
    render()
    return
  }
  await runAction(async () => {
    const settings = await sendRuntimeMessage<ExtensionSettings>({ type: 'SAVE_SETTINGS', baseUrl })
    state = {
      ...state,
      settings,
      step: state.session ? 'main' : 'login',
      feedback: text.configSaved,
    }
  })
}

async function login() {
  const username = fieldValue('username')
  const password = fieldValue('password')
  if (!username || !password) {
    state = { ...state, error: text.requiredFields }
    render()
    return
  }
  await runAction(async () => {
    const session = await sendRuntimeMessage<ExtensionSession>({ type: 'LOGIN', username, password })
    state = {
      ...state,
      session,
      step: 'main',
      feedback: text.loginSuccess,
    }
    await loadResumes()
  })
}

async function logout() {
  await runAction(async () => {
    await sendRuntimeMessage<null>({ type: 'LOGOUT' })
    state = {
      ...state,
      session: null,
      step: state.settings ? 'login' : 'config',
    }
  })
}

async function saveApplication() {
  if (!isReady()) {
    state = { ...state, error: text.requiredFields }
    render()
    return
  }
  await runAction(async () => {
    const result = await sendRuntimeMessage<ApplicationSaveResult>({
      type: 'CREATE_APPLICATION',
      resumeId: state.resumeId,
      job: state.job,
    })
    state = {
      ...state,
      feedback: result.reused ? text.applicationReused : text.applicationSaved,
    }
  })
}

async function generateCoverLetter() {
  if (!isReady()) {
    state = { ...state, error: text.requiredFields }
    render()
    return
  }
  await runAction(async () => {
    const coverLetter = await sendRuntimeMessage<CoverLetterResponse>({
      type: 'GENERATE_COVER_LETTER',
      resumeId: state.resumeId,
      job: state.job,
      outputLanguage: state.outputLanguage,
    })
    state = {
      ...state,
      coverLetter,
      feedback: text.coverLetterGenerated,
    }
  })
}

async function copyLetter() {
  if (!state.coverLetter) return
  try {
    await navigator.clipboard.writeText(state.coverLetter.body)
    state = { ...state, feedback: text.copied, error: null }
  } catch {
    state = { ...state, error: text.copyFailed, feedback: null }
  }
  render()
}

async function runAction(action: () => Promise<void>, rerenderStart = true) {
  state = { ...state, loading: true, error: null, feedback: null }
  if (rerenderStart) render()
  try {
    await action()
  } catch (error) {
    state = { ...state, error: toMessage(error) }
  } finally {
    state = { ...state, loading: false }
    render()
  }
}

function isReady() {
  return Boolean(state.job.company.trim() && state.job.position.trim() && state.resumeId)
}

function fieldValue(name: string) {
  return root?.querySelector<HTMLInputElement>(`[data-field="${name}"]`)?.value.trim() ?? ''
}

async function readJobSnapshot() {
  const [tab] = await queryActiveTab()
  if (!tab?.id) {
    throw new Error('No active tab')
  }
  try {
    return await sendTabMessage<JobSnapshot>(tab.id, { type: 'GET_JOB_SNAPSHOT' })
  } catch {
    await injectContentScript(tab.id)
    return sendTabMessage<JobSnapshot>(tab.id, { type: 'GET_JOB_SNAPSHOT' })
  }
}

function sendRuntimeMessage<T>(message: ExtensionRequest) {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      const envelope = response as RuntimeEnvelope<T> | undefined
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Runtime request failed'))
        return
      }
      if (!envelope?.ok) {
        reject(new Error(envelope?.error || 'Runtime request failed'))
        return
      }
      resolve(envelope.data as T)
    })
  })
}

function sendTabMessage<T>(tabId: number, message: ContentRequest) {
  return new Promise<T>((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Tab request failed'))
        return
      }
      resolve(response as T)
    })
  })
}

function queryActiveTab() {
  return new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  })
}

function injectContentScript(tabId: number) {
  return new Promise<void>((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ['content-script.js'],
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Content script injection failed'))
          return
        }
        resolve()
      },
    )
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed'
}
