export type InterviewDifficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type InterviewStatus = 'IN_PROGRESS' | 'PAUSED' | 'ENDED'
export type InterviewReportStatus = 'PENDING' | 'GENERATING' | 'READY' | 'FAILED'
export type InterviewMessageRole = 'INTERVIEWER' | 'CANDIDATE' | 'SYSTEM'
export type InterviewMessageStatus = 'NORMAL' | 'ABORTED'
export type CompanyContextStatus = 'NOT_REQUESTED' | 'READY' | 'FAILED'

export interface InterviewSummary {
  id: string
  resumeId: string | null
  resumeTitle: string | null
  aiConversationId: string
  title: string
  jobDescription: string | null
  targetCompany: string | null
  difficulty: InterviewDifficulty
  interviewerRoles: string[]
  companyContextSummary: string[]
  companyContextStatus: CompanyContextStatus
  activeRoundIndex: number
  status: InterviewStatus
  reportStatus: InterviewReportStatus
  createdAt: string
  updatedAt: string
  endedAt: string | null
}

export interface InterviewPage {
  items: InterviewSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface InterviewMessage {
  id: string
  role: InterviewMessageRole
  content: string
  sortOrder: number
  roundIndex: number
  createdAt: string
  status?: InterviewMessageStatus
}

export interface InterviewDetail extends InterviewSummary {
  reportContent: string | null
  messages: InterviewMessage[]
  totalElapsedSeconds: number
  lastResumedAt: string | null
}

export interface InterviewCreatePayload {
  resumeId?: string | null
  targetCompany?: string | null
  title: string
  jobDescription?: string | null
  difficulty: InterviewDifficulty
  interviewerRoles: string[]
}

export interface InterviewListQuery {
  resumeId?: string
  status?: InterviewStatus
  targetCompany?: string
  keyword?: string
  page?: number
  pageSize?: number
}

import type { TFunction } from 'i18next'

export const INTERVIEWER_ROLE_OPTIONS = ['HR', 'Leader', '项目深挖', '场景题', '行为面试'] as const

export function getInterviewDifficultyOptions(t: TFunction): Array<{ value: InterviewDifficulty; label: string }> {
  return [
    { value: 'EASY', label: t('interview:difficulty.easy') },
    { value: 'MEDIUM', label: t('interview:difficulty.medium') },
    { value: 'HARD', label: t('interview:difficulty.hard') },
  ]
}

export function getInterviewStatusOptions(t: TFunction): Array<{ value: InterviewStatus; label: string }> {
  return [
    { value: 'IN_PROGRESS', label: t('interview:status.inProgress') },
    { value: 'PAUSED', label: t('interview:status.paused') },
    { value: 'ENDED', label: t('interview:status.ended') },
  ]
}

export function interviewDifficultyLabel(difficulty: InterviewDifficulty, t: TFunction) {
  const key = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' }[difficulty] ?? difficulty
  return t(`interview:difficulty.${key}`)
}

export function interviewStatusLabel(status: InterviewStatus, t: TFunction) {
  const key = { IN_PROGRESS: 'inProgress', PAUSED: 'paused', ENDED: 'ended' }[status] ?? status
  return t(`interview:status.${key}`)
}

export function interviewReportStatusLabel(status: InterviewReportStatus, t: TFunction) {
  const key = { READY: 'ready', GENERATING: 'generating', FAILED: 'failed', PENDING: 'pending' }[status] ?? 'pending'
  return t(`interview:reportStatus.${key}`)
}

export function companyContextStatusLabel(status: CompanyContextStatus, t: TFunction) {
  const key = { READY: 'ready', FAILED: 'failed', NOT_REQUESTED: 'notRequested' }[status] ?? 'notRequested'
  return t(`interview:companyContext.${key}`)
}

export interface QuestionEvaluation {
  question: string
  candidateAnswer: string
  score: number
  feedback: string
  referenceAnswer: string
}

export interface RoundEvaluation {
  role: string
  roundScore: number
  summary: string
  questions: QuestionEvaluation[]
}

export interface SkillAssessment {
  technicalAbility: number
  communication: number
  problemSolving: number
  professionalism: number
}

export interface LearningResource {
  topic: string
  reason: string
  suggestions: string[]
}

export interface InterviewReport {
  overallScore: number
  summary: string
  strengths: string[]
  improvements: string[]
  skillAssessment: SkillAssessment
  rounds: RoundEvaluation[]
  learningResources: LearningResource[]
  generatedAt: string
}

export interface ReportStatusEvent {
  interviewId: string
  reportStatus: InterviewReportStatus
  reportContent: string | null
}
