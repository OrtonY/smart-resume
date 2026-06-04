import { request } from '../../../lib/http/apiClient'
import type {
  InterviewQuestion,
  InterviewQuestionBank,
  QuestionBankPayload,
  QuestionPayload,
} from '../questionBankTypes'

const BASE_PATH = '/api/interviews/question-banks'

export function listQuestionBanks(keyword?: string) {
  const params = new URLSearchParams()
  if (keyword?.trim()) {
    params.set('keyword', keyword.trim())
  }
  const query = params.toString()
  return request<InterviewQuestionBank[]>(query ? `${BASE_PATH}?${query}` : BASE_PATH)
}

export function createQuestionBank(payload: QuestionBankPayload) {
  return request<InterviewQuestionBank>(BASE_PATH, {
    method: 'POST',
    body: payload,
  })
}

export function updateQuestionBank(bankId: string, payload: QuestionBankPayload) {
  return request<InterviewQuestionBank>(`${BASE_PATH}/${bankId}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteQuestionBank(bankId: string) {
  return request<void>(`${BASE_PATH}/${bankId}`, {
    method: 'DELETE',
  })
}

export function listQuestions(bankId: string) {
  return request<InterviewQuestion[]>(`${BASE_PATH}/${bankId}/questions`)
}

export function createQuestion(bankId: string, payload: QuestionPayload) {
  return request<InterviewQuestion>(`${BASE_PATH}/${bankId}/questions`, {
    method: 'POST',
    body: payload,
  })
}

export function updateQuestion(bankId: string, questionId: string, payload: QuestionPayload) {
  return request<InterviewQuestion>(`${BASE_PATH}/${bankId}/questions/${questionId}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteQuestion(bankId: string, questionId: string) {
  return request<void>(`${BASE_PATH}/${bankId}/questions/${questionId}`, {
    method: 'DELETE',
  })
}
