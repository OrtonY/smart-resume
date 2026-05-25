import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ResumeSectionKey } from '../../types'

export type ResumeModuleId = 'personal-info' | ResumeSectionKey

export interface ResumeModuleDefinition {
  key: ResumeModuleId
  title: string
  description: string
  removable: boolean
}

const MODULE_KEYS: Array<{ key: ResumeModuleId; titleKey: string; descKey: string; removable: boolean }> = [
  { key: 'personal-info', titleKey: 'modules.personalInfo.title', descKey: 'modules.personalInfo.description', removable: false },
  { key: 'summary', titleKey: 'modules.summary.title', descKey: 'modules.summary.description', removable: true },
  { key: 'workExperience', titleKey: 'modules.workExperience.title', descKey: 'modules.workExperience.description', removable: true },
  { key: 'projectExperience', titleKey: 'modules.projectExperience.title', descKey: 'modules.projectExperience.description', removable: true },
  { key: 'education', titleKey: 'modules.education.title', descKey: 'modules.education.description', removable: true },
  { key: 'skills', titleKey: 'modules.skills.title', descKey: 'modules.skills.description', removable: true },
  { key: 'honors', titleKey: 'modules.honors.title', descKey: 'modules.honors.description', removable: true },
  { key: 'certificates', titleKey: 'modules.certificates.title', descKey: 'modules.certificates.description', removable: true },
]

export function useResumeModuleDefinitions(): ResumeModuleDefinition[] {
  const { t } = useTranslation('workspace')
  return useMemo(
    () => MODULE_KEYS.map((module) => ({
      key: module.key,
      title: t(module.titleKey),
      description: t(module.descKey),
      removable: module.removable,
    })),
    [t],
  )
}

export function moduleAnchorId(moduleKey: ResumeModuleId) {
  return `resume-module-${moduleKey}`
}
