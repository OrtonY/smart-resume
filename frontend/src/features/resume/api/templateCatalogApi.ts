import i18n from '../../../i18n'
import { request } from '../../../lib/http/apiClient'
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  RESUME_TEMPLATE_LAYOUTS,
  type ManagedResumeTemplateDefinition,
  type ResumeTemplateCreatePayload,
  type ResumeTemplateDefinition,
  type ResumeTemplateLayout,
  type ResumeTemplatePreview,
  type ResumeTemplateTheme,
  type ResumeTemplateUpdatePayload,
} from '../templateCatalog'

const TEMPLATE_MANIFEST_PATH = '/templates/catalog.json'
const TEMPLATE_LAYOUTS = new Set<ResumeTemplateLayout>(RESUME_TEMPLATE_LAYOUTS)

export async function loadResumeTemplateCatalog() {
  try {
    const payload = await request<unknown>('/api/public/templates', { skipAuth: true })
    return normalizeTemplateCatalog(payload)
  } catch {
    return loadManifestTemplateCatalog()
  }
}

export async function listManagedResumeTemplates() {
  const payload = await request<unknown>('/api/templates')
  return normalizeManagedTemplateCatalog(payload)
}

export async function createResumeTemplate(payload: ResumeTemplateCreatePayload) {
  const response = await request<unknown>('/api/templates', {
    method: 'POST',
    body: payload,
  })

  const template = parseManagedTemplateDefinition(response)
  if (!template) {
    throw new Error('Unable to parse created template')
  }

  return template
}

export async function updateResumeTemplate(templateKey: string, payload: ResumeTemplateUpdatePayload) {
  const response = await request<unknown>(`/api/templates/${encodeURIComponent(templateKey)}`, {
    method: 'PUT',
    body: payload,
  })

  const template = parseManagedTemplateDefinition(response)
  if (!template) {
    throw new Error('Unable to parse updated template')
  }

  return template
}

export async function deleteResumeTemplate(templateKey: string) {
  await request<void>(`/api/templates/${encodeURIComponent(templateKey)}`, {
    method: 'DELETE',
  })
}

async function loadManifestTemplateCatalog() {
  try {
    const response = await fetch(TEMPLATE_MANIFEST_PATH, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      throw new Error('Template manifest not found')
    }
    const payload = (await response.json()) as unknown
    return normalizeTemplateCatalog(payload)
  } catch {
    return FALLBACK_RESUME_TEMPLATE_CATALOG
  }
}

function normalizeTemplateCatalog(payload: unknown) {
  if (!Array.isArray(payload)) {
    return FALLBACK_RESUME_TEMPLATE_CATALOG
  }

  const templates = payload
    .map((item) => parseTemplateDefinition(item))
    .filter((item): item is ResumeTemplateDefinition => item !== null)

  return templates.length > 0 ? templates : FALLBACK_RESUME_TEMPLATE_CATALOG
}

function normalizeManagedTemplateCatalog(payload: unknown) {
  if (!Array.isArray(payload)) {
    throw new Error('Template catalog payload is invalid')
  }

  const templates = payload
    .map((item) => parseManagedTemplateDefinition(item))
    .filter((item): item is ManagedResumeTemplateDefinition => item !== null)

  if (templates.length === 0) {
    throw new Error('Template catalog is empty')
  }

  return templates
}

function parseManagedTemplateDefinition(value: unknown): ManagedResumeTemplateDefinition | null {
  const base = parseTemplateDefinition(value)
  if (!base || !isRecord(value)) {
    return null
  }

  const builtIn = readBoolean(value.builtIn)
  const updatedAt = readNullableString(value.updatedAt)
  if (builtIn == null || updatedAt === undefined) {
    return null
  }

  return {
    ...base,
    builtIn,
    updatedAt,
  }
}

function parseTemplateDefinition(value: unknown): ResumeTemplateDefinition | null {
  if (!isRecord(value)) {
    return null
  }

  const layout = readLayout(value.layout)
  const theme = parseTheme(value.theme)
  const preview = parsePreview(value.preview)
  if (!layout || !theme || !preview) {
    return null
  }

  const key = readString(value.key)
  const name = readLocalizedField(value.name)
  const summary = readLocalizedField(value.summary)
  const category = readLocalizedField(value.category)
  if (!key || !name || !summary || !category) {
    return null
  }

  return {
    key,
    name,
    summary,
    category,
    layout,
    theme,
    preview,
  }
}

function parseTheme(value: unknown): ResumeTemplateTheme | null {
  const theme = readRecord(value)
  if (!theme) {
    return null
  }

  const pageBackground = readString(theme.pageBackground)
  const borderColor = readString(theme.borderColor)
  const mutedText = readString(theme.mutedText)
  const accent = readString(theme.accent)
  const accentSoft = readString(theme.accentSoft)
  const accentText = readString(theme.accentText)
  const heroBackground = readString(theme.heroBackground)
  const heroText = readString(theme.heroText)
  const heroMuted = readString(theme.heroMuted)
  const railBackground = readString(theme.railBackground)
  const panelBackground = readString(theme.panelBackground)

  if (
    !pageBackground ||
    !borderColor ||
    !mutedText ||
    !accent ||
    !accentSoft ||
    !accentText ||
    !heroBackground ||
    !heroText ||
    !heroMuted ||
    !railBackground ||
    !panelBackground
  ) {
    return null
  }

  return {
    pageBackground,
    borderColor,
    mutedText,
    accent,
    accentSoft,
    accentText,
    heroBackground,
    heroText,
    heroMuted,
    railBackground,
    panelBackground,
  }
}

function parsePreview(value: unknown): ResumeTemplatePreview | null {
  const preview = readRecord(value)
  if (!preview) {
    return null
  }

  const canvasBackground = readString(preview.canvasBackground)
  const sheetBackground = readString(preview.sheetBackground)
  const heroBackground = readString(preview.heroBackground)
  const asideBackground = readString(preview.asideBackground)
  const lineColor = readString(preview.lineColor)

  if (!canvasBackground || !sheetBackground || !heroBackground || !asideBackground || !lineColor) {
    return null
  }

  return {
    canvasBackground,
    sheetBackground,
    heroBackground,
    asideBackground,
    lineColor,
  }
}

function readLayout(value: unknown): ResumeTemplateLayout | null {
  return typeof value === 'string' && TEMPLATE_LAYOUTS.has(value as ResumeTemplateLayout)
    ? (value as ResumeTemplateLayout)
    : null
}

function readRecord(value: unknown) {
  return isRecord(value) ? value : null
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function readLocalizedField(value: unknown): string | Record<string, string> | null {
  // If it's a plain string, return it
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  // If it's an i18n object (e.g. {zh: "...", en: "..."}), validate and return it
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>

    // Check if it has at least one valid string value
    const hasValidValue = Object.values(obj).some(
      (val) => typeof val === 'string' && val.trim().length > 0
    )

    if (hasValidValue) {
      // Return the i18n object, filtering out non-string or empty values
      const cleanedObj: Record<string, string> = {}
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'string' && val.trim().length > 0) {
          cleanedObj[key] = val.trim()
        }
      }
      return cleanedObj
    }
  }

  return null
}

function readString(value: unknown) {
  // 支持字符串或 i18n 对象（如 {en: "...", "zh-CN": "..."}）
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  // 如果是对象，根据当前语言环境提取对应的文本
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>

    // 获取当前语言（zh-CN 或 en-US）
    const currentLang = i18n.language || 'zh-CN'

    // 语言映射：前端 i18n 使用 zh-CN/en-US，后端可能使用 zh-CN/en
    const langMap: Record<string, string[]> = {
      'zh-CN': ['zh-CN', 'zh'],
      'en-US': ['en-US', 'en'],
    }

    // 根据当前语言查找对应的后端语言键
    const possibleKeys = langMap[currentLang] || [currentLang]

    // 优先使用当前语言的所有可能键
    for (const key of possibleKeys) {
      if (typeof obj[key] === 'string' && obj[key].trim().length > 0) {
        return obj[key].trim()
      }
    }

    // 回退到中文
    if (typeof obj['zh-CN'] === 'string' && obj['zh-CN'].trim().length > 0) {
      return obj['zh-CN'].trim()
    }
    if (typeof obj['zh'] === 'string' && obj['zh'].trim().length > 0) {
      return obj['zh'].trim()
    }

    // 最后回退到英文
    if (typeof obj['en-US'] === 'string' && obj['en-US'].trim().length > 0) {
      return obj['en-US'].trim()
    }
    if (typeof obj['en'] === 'string' && obj['en'].trim().length > 0) {
      return obj['en'].trim()
    }

    // 尝试任意可用的语言
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string' && obj[key].trim().length > 0) {
        return obj[key].trim()
      }
    }
  }

  return null
}

function readNullableString(value: unknown) {
  if (value == null) {
    return null
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
