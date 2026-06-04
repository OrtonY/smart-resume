import type { TFunction } from 'i18next'
import { DEFAULT_PAGE_SIZE } from '../../lib/http/pageDefaults'
import {
  companyContextStatusLabel,
  interviewDifficultyLabel,
  interviewReportStatusLabel,
  interviewStatusLabel,
  type InterviewDetail,
  type InterviewDifficulty,
  type InterviewStatus,
} from './types'
import type { QuestionBankRelevance } from './questionBankTypes'

export const INTERVIEWS_PER_PAGE = DEFAULT_PAGE_SIZE

export type CreateFormValues = {
  resumeId?: string
  targetCompany?: string
  title: string
  jobDescription?: string
  difficulty: InterviewDifficulty
  interviewerRoles: string[]
  questionBankId?: string
  selectedTags?: string[]
  questionBankRelevance?: QuestionBankRelevance
}

export function statusColor(status: InterviewStatus) {
  switch (status) {
    case 'ENDED':
      return 'default'
    case 'PAUSED':
      return 'orange'
    default:
      return 'green'
  }
}

export function difficultyColor(difficulty: InterviewDifficulty) {
  switch (difficulty) {
    case 'EASY':
      return 'green'
    case 'HARD':
      return 'gold'
    default:
      return 'orange'
  }
}

export function companyContextColor(status: InterviewDetail['companyContextStatus']) {
  switch (status) {
    case 'READY':
      return 'green'
    case 'FAILED':
      return 'orange'
    default:
      return 'default'
  }
}

export function buildInterviewCardMeta(item: {
  difficulty: InterviewDifficulty
  activeRoundIndex: number
  interviewerRoles: string[]
  resumeTitle?: string | null
}, t: TFunction<'interview', undefined>) {
  return [
    interviewDifficultyLabel(item.difficulty, t),
    t('list.roundLabel', { current: Math.min(item.activeRoundIndex + 1, item.interviewerRoles.length) }),
    item.interviewerRoles.join(' / '),
    item.resumeTitle ?? t('list.noResume'),
  ]
}

export {
  companyContextStatusLabel,
  interviewReportStatusLabel,
  interviewStatusLabel,
}
