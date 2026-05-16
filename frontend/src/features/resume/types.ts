export interface PersonalInfo {
  fullName: string
  headline: string
  phone: string
  email: string
  city: string
  website: string
  expectedSalary: string
  avatar?: string
}

export interface EducationItem {
  school: string
  degree: string
  major: string
  startDate: string
  endDate: string
  description: string
}

export interface WorkExperienceItem {
  company: string
  role: string
  startDate: string
  endDate: string
  description: string
}

export interface ProjectExperienceItem {
  name: string
  role: string
  startDate: string
  endDate: string
  description: string
}

export interface SkillItem {
  name: string
  level: string
}

export interface HonorItem {
  title: string
  issuer: string
  awardedAt: string
  description: string
}

export interface CertificateItem {
  name: string
  issuer: string
  issuedAt: string
  credentialId: string
}

export interface ResumeContent {
  personalInfo: PersonalInfo
  personalSummary: string
  education: EducationItem[]
  workExperience: WorkExperienceItem[]
  projectExperience: ProjectExperienceItem[]
  skills: SkillItem[]
  honors: HonorItem[]
  certificates: CertificateItem[]
}

export const RESUME_SECTION_KEYS = [
  'education',
  'summary',
  'workExperience',
  'projectExperience',
  'skills',
  'honors',
  'certificates',
] as const

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number]

export const DEFAULT_RESUME_SECTION_ORDER: ResumeSectionKey[] = [...RESUME_SECTION_KEYS]

export interface ResumeLayout {
  sectionOrder: ResumeSectionKey[]
  hiddenSections: ResumeSectionKey[]
}

export interface ResumeSummary {
  id: string
  title: string
  templateKey: string
  deleted: boolean
  updatedAt: string
}

export interface ResumePage {
  items: ResumeSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ResumeDetail {
  id: string
  title: string
  templateKey: string
  content: ResumeContent
  layout: ResumeLayout
  updatedAt: string
  deletedAt: string | null
}

export type ShareMode = 'LATEST' | 'SNAPSHOT'

export interface ShareLink {
  shareCode: string
  shareMode: ShareMode
  sharePath: string
  targetVersionId: string | null
  hasPassword: boolean
  active: boolean
  viewCount: number
  lastAccessedAt: string | null
  createdAt: string
}

export interface ShareAccessLog {
  id: string
  accessedAt: string
  ipAddress: string
}

export interface ShareAccessLogsPage {
  logs: ShareAccessLog[]
  total: number
}

export interface ExportPlaceholderResponse {
  resumeId: string
  message: string
  requestedAt: string
}

export function createEmptyResumeContent(): ResumeContent {
  return {
    personalInfo: {
      fullName: '',
      headline: '',
      phone: '',
      email: '',
      city: '',
      website: '',
      expectedSalary: '',
      avatar: '',
    },
    personalSummary: '',
    education: [],
    workExperience: [],
    projectExperience: [],
    skills: [],
    honors: [],
    certificates: [],
  }
}

export function createDefaultResumeLayout(): ResumeLayout {
  return {
    sectionOrder: [...DEFAULT_RESUME_SECTION_ORDER],
    hiddenSections: [],
  }
}

export function normalizeResumeLayout(layout?: Partial<ResumeLayout> | null): ResumeLayout {
  const sectionOrder = normalizeResumeSectionOrder(
    Array.isArray(layout?.sectionOrder) ? layout.sectionOrder.filter(isResumeSectionKey) : DEFAULT_RESUME_SECTION_ORDER,
  )
  const hiddenSections = Array.isArray(layout?.hiddenSections)
    ? layout.hiddenSections.filter(isResumeSectionKey).filter((key, index, current) => current.indexOf(key) === index)
    : []

  return {
    sectionOrder,
    hiddenSections,
  }
}

export function normalizeResumeSectionOrder(sectionOrder: ResumeSectionKey[]) {
  const deduplicated = sectionOrder.filter((key, index) => sectionOrder.indexOf(key) === index)
  const missing = DEFAULT_RESUME_SECTION_ORDER.filter((key) => !deduplicated.includes(key))
  return [...deduplicated, ...missing]
}

function isResumeSectionKey(value: unknown): value is ResumeSectionKey {
  return RESUME_SECTION_KEYS.includes(value as ResumeSectionKey)
}
