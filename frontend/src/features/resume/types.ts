export interface PersonalInfo {
  fullName: string
  headline: string
  phone: string
  email: string
  city: string
  website: string
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

export interface ResumeSummary {
  id: string
  title: string
  templateKey: string
  deleted: boolean
  updatedAt: string
}

export interface ResumeDetail {
  id: string
  title: string
  templateKey: string
  content: ResumeContent
  updatedAt: string
  deletedAt: string | null
}

export type ShareMode = 'LATEST' | 'SNAPSHOT'

export interface ShareLink {
  shareCode: string
  shareMode: ShareMode
  sharePath: string
  targetVersionId: string | null
  createdAt: string
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
