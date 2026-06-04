export type QuestionBankRelevance = 'LOW' | 'MEDIUM' | 'HIGH'

export interface InterviewQuestionBank {
  id: string
  name: string
  description: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface InterviewQuestion {
  id: string
  questionBankId: string
  question: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  tags: string[]
  focusPoints: string | null
  createdAt: string
  updatedAt: string
}

export interface QuestionBankPayload {
  name: string
  description?: string | null
  tags: string[]
}

export interface QuestionPayload {
  question: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  tags: string[]
  focusPoints?: string | null
}
