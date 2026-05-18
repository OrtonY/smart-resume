import type { ResumeDetail } from '../resume/types'
import { normalizeResumeLayout } from '../resume/types'
import type { AiResumeContext } from './types'

export function toAiResumeContext(draft: ResumeDetail): AiResumeContext {
  const { personalInfo, ...restContent } = draft.content
  const personalInfoWithoutAvatar: typeof personalInfo = {
    fullName: personalInfo.fullName,
    headline: personalInfo.headline,
    phone: personalInfo.phone,
    email: personalInfo.email,
    city: personalInfo.city,
    website: personalInfo.website,
    expectedSalary: personalInfo.expectedSalary,
    age: personalInfo.age,
  }

  return {
    id: draft.id,
    title: draft.title,
    templateKey: draft.templateKey,
    content: { ...restContent, personalInfo: personalInfoWithoutAvatar },
    layout: normalizeResumeLayout(draft.layout),
  }
}
