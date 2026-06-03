import type { ResumeContent, ResumeDetail, ResumeSectionKey } from '../types'
import { normalizeResumeLayout } from '../types'
import { createExportFilename, downloadBlob } from './fileDownload'

type ResumeJsonExportPayload = {
  title: string
  personalInfo: ResumeContent['personalInfo']
  personalSummary?: string
  education?: ResumeContent['education']
  workExperience?: ResumeContent['workExperience']
  projectExperience?: ResumeContent['projectExperience']
  skills?: ResumeContent['skills']
  honors?: ResumeContent['honors']
  certificates?: ResumeContent['certificates']
}

export function exportResumeJson(resume: Pick<ResumeDetail, 'title' | 'content' | 'layout'>) {
  const payload = buildResumeJsonExportPayload(resume)
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, createExportFilename(resume.title, 'json'))
}

function buildResumeJsonExportPayload(resume: Pick<ResumeDetail, 'title' | 'content' | 'layout'>): ResumeJsonExportPayload {
  const layout = normalizeResumeLayout(resume.layout)
  const hiddenSections = new Set<ResumeSectionKey>(layout.hiddenSections)
  const payload: ResumeJsonExportPayload = {
    title: resume.title,
    personalInfo: resume.content.personalInfo,
  }

  if (!hiddenSections.has('summary')) {
    payload.personalSummary = resume.content.personalSummary
  }
  if (!hiddenSections.has('education')) {
    payload.education = resume.content.education
  }
  if (!hiddenSections.has('workExperience')) {
    payload.workExperience = resume.content.workExperience
  }
  if (!hiddenSections.has('projectExperience')) {
    payload.projectExperience = resume.content.projectExperience
  }
  if (!hiddenSections.has('skills')) {
    payload.skills = resume.content.skills
  }
  if (!hiddenSections.has('honors')) {
    payload.honors = resume.content.honors
  }
  if (!hiddenSections.has('certificates')) {
    payload.certificates = resume.content.certificates
  }

  return payload
}
