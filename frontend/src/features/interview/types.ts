export type InterviewDifficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type InterviewStatus = 'IN_PROGRESS' | 'PAUSED' | 'ENDED'
export type InterviewReportStatus = 'PENDING' | 'GENERATING' | 'READY' | 'FAILED'
export type InterviewMessageRole = 'INTERVIEWER' | 'CANDIDATE' | 'SYSTEM'

export interface InterviewSummary {
  id: string
  resumeId: string | null
  resumeTitle: string | null
  aiConversationId: string
  title: string
  jobDescription: string
  difficulty: InterviewDifficulty
  interviewerRoles: string[]
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

export type InterviewMessageStatus = 'NORMAL' | 'ABORTED'

export interface InterviewMessage {
  id: string
  role: InterviewMessageRole
  content: string
  sortOrder: number
  createdAt: string
  status?: InterviewMessageStatus
}

export interface InterviewDetail extends InterviewSummary {
  reportContent: string | null
  messages: InterviewMessage[]
}

export interface InterviewCreatePayload {
  resumeId?: string | null
  title: string
  jobDescription?: string | null
  difficulty: InterviewDifficulty
  interviewerRoles: string[]
}

export interface InterviewListQuery {
  resumeId?: string
  status?: InterviewStatus
  keyword?: string
  page?: number
  pageSize?: number
}

export const INTERVIEW_DIFFICULTY_OPTIONS: Array<{ value: InterviewDifficulty; label: string }> = [
  { value: 'EASY', label: '简单' },
  { value: 'MEDIUM', label: '中等' },
  { value: 'HARD', label: '困难' },
]

export const INTERVIEW_STATUS_OPTIONS: Array<{ value: InterviewStatus; label: string }> = [
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'PAUSED', label: '已暂停' },
  { value: 'ENDED', label: '已结束' },
]

export const INTERVIEWER_ROLE_OPTIONS = ['HR', 'Leader', '项目深挖', '场景题', '行为面试']

export function interviewDifficultyLabel(difficulty: InterviewDifficulty) {
  return INTERVIEW_DIFFICULTY_OPTIONS.find((item) => item.value === difficulty)?.label ?? difficulty
}

export function interviewStatusLabel(status: InterviewStatus) {
  return INTERVIEW_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
}

export function interviewReportStatusLabel(status: InterviewReportStatus) {
  switch (status) {
    case 'READY':
      return '报告已生成'
    case 'GENERATING':
      return '报告生成中'
    case 'FAILED':
      return '生成失败'
    default:
      return '待生成'
  }
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
