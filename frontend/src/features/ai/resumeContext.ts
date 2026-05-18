import type { ResumeDetail } from '../resume/types'
import { normalizeResumeLayout } from '../resume/types'
import type { AiResumeContext } from './types'

export function toAiResumeContext(draft: ResumeDetail): AiResumeContext {
  return {
    id: draft.id,
    title: draft.title,
    templateKey: draft.templateKey,
    content: draft.content,
    layout: normalizeResumeLayout(draft.layout),
  }
}
