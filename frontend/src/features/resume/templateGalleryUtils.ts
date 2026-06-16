import { createDefaultResumeLayout } from './types'
import type { ResumeDetail } from './types'
import {
  DEFAULT_RESUME_TEMPLATE_KEY,
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  getDefaultResumeTemplate,
  getLocalizedField,
  type LocalizedField,
  type ManagedResumeTemplateDefinition,
  type ResumeTemplateDefinition,
  type ResumeTemplateLayout,
  type ResumeTemplatePreview,
  type ResumeTemplateTheme,
  type ResumeTemplateUpdatePayload,
} from './templateCatalog'

export type EditorMode = 'edit' | 'create'
export type ColorTokenKind = 'color' | 'gradient'

/**
 * Helper function to safely convert LocalizedField to string for the current locale.
 * Uses a default locale of 'zh-CN' for consistency.
 */
function localizedFieldToString(field: LocalizedField, locale: string = 'zh-CN'): string {
  return getLocalizedField(field, locale)
}

/**
 * Helper function to check if a LocalizedField has content.
 */
function isLocalizedFieldEmpty(field: LocalizedField): boolean {
  if (typeof field === 'string') {
    return field.trim().length === 0
  }
  // For objects, check if any value has content
  return Object.values(field).every((value) => typeof value !== 'string' || value.trim().length === 0)
}

export const LAYOUT_OPTION_KEYS: Array<{ value: ResumeTemplateLayout; labelKey: string }> = [
  { value: 'classic', labelKey: 'layout.classic' },
  { value: 'two-column', labelKey: 'layout.twoColumn' },
  { value: 'minimal', labelKey: 'layout.minimal' },
  { value: 'editorial', labelKey: 'layout.editorial' },
]

export const THEME_FIELDS: Array<{ key: keyof ResumeTemplateTheme; labelKey: string; kind: ColorTokenKind }> = [
  { key: 'pageBackground', labelKey: 'theme.pageBackground', kind: 'color' },
  { key: 'borderColor', labelKey: 'theme.borderColor', kind: 'color' },
  { key: 'mutedText', labelKey: 'theme.mutedText', kind: 'color' },
  { key: 'accent', labelKey: 'theme.accent', kind: 'color' },
  { key: 'accentSoft', labelKey: 'theme.accentSoft', kind: 'color' },
  { key: 'accentText', labelKey: 'theme.accentText', kind: 'color' },
  { key: 'heroBackground', labelKey: 'theme.heroBackground', kind: 'gradient' },
  { key: 'heroText', labelKey: 'theme.heroText', kind: 'color' },
  { key: 'heroMuted', labelKey: 'theme.heroMuted', kind: 'color' },
  { key: 'railBackground', labelKey: 'theme.railBackground', kind: 'gradient' },
  { key: 'panelBackground', labelKey: 'theme.panelBackground', kind: 'color' },
]

export const PREVIEW_FIELDS: Array<{ key: keyof ResumeTemplatePreview; labelKey: string; kind: ColorTokenKind }> = [
  { key: 'canvasBackground', labelKey: 'previewStyle.canvasBackground', kind: 'gradient' },
  { key: 'sheetBackground', labelKey: 'previewStyle.sheetBackground', kind: 'color' },
  { key: 'heroBackground', labelKey: 'previewStyle.heroBackground', kind: 'gradient' },
  { key: 'asideBackground', labelKey: 'previewStyle.asideBackground', kind: 'color' },
  { key: 'lineColor', labelKey: 'previewStyle.lineColor', kind: 'color' },
]

const DEMO_RESUME: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'> = {
  title: '产品经理示例简历',
  templateKey: getDefaultResumeTemplate(FALLBACK_RESUME_TEMPLATE_CATALOG).key,
  layout: createDefaultResumeLayout(),
  content: {
    personalInfo: {
      fullName: '林知夏',
      headline: 'Senior Product Manager',
      phone: '138-0000-0000',
      email: 'zhixia.lin@example.com',
      city: '上海',
      website: 'portfolio.example.com',
      expectedSalary: '',
      age: '',
      avatar: '',
    },
    personalSummary:
      '8 年互联网产品经验，擅长 B 端工作流、AI 产品设计与跨团队落地，长期负责从 0 到 1 的产品规划、验证与规模化交付。',
    education: [
      {
        school: '复旦大学',
        degree: '硕士',
        major: '管理科学与工程',
        startDate: '2014.09',
        endDate: '2017.06',
        description: '聚焦产品创新方法、数据分析与组织协同。',
      },
    ],
    workExperience: [
      {
        company: '星图智能科技',
        role: '高级产品经理',
        startDate: '2021.03',
        endDate: '至今',
        description: '主导 AI 简历与招聘协作平台，搭建模板中心、分享链路与数据闭环，推动核心功能上线后转化率提升 27%。',
      },
      {
        company: '远帆软件',
        role: '产品经理',
        startDate: '2017.07',
        endDate: '2021.02',
        description: '负责企业流程系统与数据看板产品，持续优化岗位匹配与审批体验。',
      },
    ],
    projectExperience: [
      {
        name: '智能模板中心',
        role: '负责人',
        startDate: '2025.11',
        endDate: '2026.05',
        description: '设计模板元数据结构、动态加载方案与回滚策略，让 AI 导入模板与人工微调共存。',
      },
    ],
    skills: [
      { name: '产品规划', level: '专家' },
      { name: '用户研究', level: '熟练' },
      { name: 'SQL / 数据分析', level: '熟练' },
      { name: 'Prompt Design', level: '熟练' },
    ],
    honors: [
      {
        title: '年度创新项目',
        issuer: '星图智能科技',
        awardedAt: '2024',
        description: '模板中心方向获得年度产品创新奖。',
      },
    ],
    certificates: [
      {
        name: 'PMP',
        issuer: 'PMI',
        issuedAt: '2022',
        credentialId: 'PMP-2022-8899',
      },
    ],
  },
}

export const FALLBACK_MANAGED_TEMPLATE: ManagedResumeTemplateDefinition = {
  ...getDefaultResumeTemplate(FALLBACK_RESUME_TEMPLATE_CATALOG),
  builtIn: true,
  updatedAt: null,
}

export function getDefaultManagedTemplate(catalog: ManagedResumeTemplateDefinition[]) {
  return catalog.find((template) => template.key === DEFAULT_RESUME_TEMPLATE_KEY) ?? catalog[0] ?? FALLBACK_MANAGED_TEMPLATE
}

export function chooseTemplateKey(
  templates: ManagedResumeTemplateDefinition[],
  options: {
    current?: string
    preferred?: string
    resumeKey?: string
  },
) {
  if (options.preferred && templates.some((template) => template.key === options.preferred)) {
    return options.preferred
  }

  if (options.current && templates.some((template) => template.key === options.current)) {
    return options.current
  }

  if (options.resumeKey && templates.some((template) => template.key === options.resumeKey)) {
    return options.resumeKey
  }

  return templates.find((template) => template.key === DEFAULT_RESUME_TEMPLATE_KEY)?.key ?? templates[0]?.key ?? ''
}

export function cloneManagedTemplate(template: ManagedResumeTemplateDefinition): ManagedResumeTemplateDefinition {
  return {
    ...template,
    theme: { ...template.theme },
    preview: { ...template.preview },
  }
}

export function createNewTemplateDraft(
  template: ResumeTemplateDefinition | null,
  existingTemplates: ManagedResumeTemplateDefinition[],
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string = 'zh-CN',
): ManagedResumeTemplateDefinition {
  const base = template ?? FALLBACK_MANAGED_TEMPLATE
  const baseKey = normalizeTemplateKey(`${base.key}-copy`) || 'custom-template'

  // Convert LocalizedField to string for new custom template
  const baseName = localizedFieldToString(base.name, locale)
  const baseSummary = localizedFieldToString(base.summary, locale)
  const baseCategory = localizedFieldToString(base.category, locale)

  return {
    ...cloneManagedTemplate({
      ...base,
      builtIn: false,
      updatedAt: null,
    }),
    key: createUniqueTemplateKey(baseKey, existingTemplates),
    name: t('gallery.draft.copyName', { name: baseName }),
    summary: baseSummary,
    category: baseCategory,
    builtIn: false,
    updatedAt: null,
  }
}

export function createUniqueTemplateKey(baseKey: string, existingTemplates: ManagedResumeTemplateDefinition[]) {
  const existingKeys = new Set(existingTemplates.map((item) => item.key))
  if (!existingKeys.has(baseKey)) {
    return baseKey
  }

  let counter = 2
  while (existingKeys.has(`${baseKey}-${counter}`)) {
    counter += 1
  }

  return `${baseKey}-${counter}`
}

export function normalizeTemplateKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildPreviewResume(resume: ResumeDetail | null, templateKey: string) {
  if (!resume) {
    return {
      ...DEMO_RESUME,
      templateKey,
    }
  }

  return {
    title: resume.title,
    templateKey,
    layout: resume.layout,
    content: resume.content,
  }
}

export function validateTemplateDraft(
  template: ManagedResumeTemplateDefinition,
  mode: EditorMode,
  t: (key: string) => string,
) {
  if (mode === 'create' && !template.key.trim()) {
    return t('gallery.validation.keyRequired')
  }

  // Check LocalizedField values
  if (
    isLocalizedFieldEmpty(template.name) ||
    isLocalizedFieldEmpty(template.summary) ||
    isLocalizedFieldEmpty(template.category) ||
    !template.layout.trim()
  ) {
    return t('gallery.validation.basicRequired')
  }

  if (THEME_FIELDS.some((field) => template.theme[field.key].trim().length === 0)) {
    return t('gallery.validation.themeRequired')
  }

  if (PREVIEW_FIELDS.some((field) => template.preview[field.key].trim().length === 0)) {
    return t('gallery.validation.previewRequired')
  }

  return null
}

export function toUpdatePayload(template: ManagedResumeTemplateDefinition): ResumeTemplateUpdatePayload {
  return {
    name: localizedFieldToString(template.name).trim(),
    summary: localizedFieldToString(template.summary).trim(),
    category: localizedFieldToString(template.category).trim(),
    layout: template.layout,
    theme: trimTheme(template.theme),
    preview: trimPreview(template.preview),
  }
}

function trimTheme(theme: ResumeTemplateTheme): ResumeTemplateTheme {
  return {
    pageBackground: theme.pageBackground.trim(),
    borderColor: theme.borderColor.trim(),
    mutedText: theme.mutedText.trim(),
    accent: theme.accent.trim(),
    accentSoft: theme.accentSoft.trim(),
    accentText: theme.accentText.trim(),
    heroBackground: theme.heroBackground.trim(),
    heroText: theme.heroText.trim(),
    heroMuted: theme.heroMuted.trim(),
    railBackground: theme.railBackground.trim(),
    panelBackground: theme.panelBackground.trim(),
  }
}

function trimPreview(preview: ResumeTemplatePreview): ResumeTemplatePreview {
  return {
    canvasBackground: preview.canvasBackground.trim(),
    sheetBackground: preview.sheetBackground.trim(),
    heroBackground: preview.heroBackground.trim(),
    asideBackground: preview.asideBackground.trim(),
    lineColor: preview.lineColor.trim(),
  }
}

export function serializeTemplateDraft(template: ManagedResumeTemplateDefinition) {
  return JSON.stringify({
    key: template.key,
    name: template.name,
    summary: template.summary,
    category: template.category,
    layout: template.layout,
    theme: template.theme,
    preview: template.preview,
  })
}

export function layoutLabel(layout: ResumeTemplateLayout, t: (key: string) => string) {
  const option = LAYOUT_OPTION_KEYS.find((item) => item.value === layout)
  return option ? t(option.labelKey) : layout
}
