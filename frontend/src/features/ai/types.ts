import type { ResumeContent } from '../resume/types'

export type AiVendor = 'OpenAI' | 'Ollama' | 'DeepSeek' | 'Anthropic' | 'Azure OpenAI' | 'Other'

export interface AiConfiguration {
  vendor: AiVendor | string
  baseUrl: string
  modelName: string
  configured: boolean
}

export interface AiConfigurationRequest {
  vendor: AiVendor | string
  baseUrl: string
  apiKey: string
  modelName: string
}

export type AiChatStyle = 'NORMAL' | 'SAVAGE' | 'SARCASTIC'

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  suggestions?: AiResumeSuggestion[]
}

export interface AiChatRequest {
  message: string
  conversationId?: string
  resumeId: string
  style?: AiChatStyle
}

export interface AiChatEvent {
  type: 'message' | 'error' | 'done' | 'suggestion'
  content: string
  conversationId?: string
}

export interface AiChatCompletionResponse {
  content: string
  suggestionJson: string
  conversationId: string
}

export type AiResumeSuggestionStatus = 'pending' | 'applied' | 'dismissed'

export type AiResumeSuggestionSection =
  | 'personalInfo'
  | 'personalSummary'
  | 'education'
  | 'workExperience'
  | 'projectExperience'
  | 'skills'
  | 'honors'
  | 'certificates'

export interface AiResumeSuggestion {
  id: string
  section: AiResumeSuggestionSection
  index?: number
  field: string
  currentValue?: string
  suggestedValue: string
  rationale: string
  status?: AiResumeSuggestionStatus
}

export interface AiResumeSuggestionPlan {
  suggestions: AiResumeSuggestion[]
  summary?: string
}

export interface AiChatConversation {
  conversationId: string
  title: string
  style: AiChatStyle
  createdAt: string
  updatedAt: string
}

export interface AiResumeScoreRequest {
  jobDescription?: string
  resumeId: string
}

export interface AiBulletRewriteRequest {
  resumeId: string
  text: string
  section: 'personalSummary' | 'education' | 'workExperience' | 'projectExperience'
  index?: number
}

export interface AiBulletRewriteResponse {
  rewrittenText: string
  rationale: string
}

export type AiResumeTranslationTarget = 'ENGLISH' | 'CHINESE'

export type AiResumeTranslationMode = 'overwrite' | 'copy'

export interface AiResumeTranslationRequest {
  targetLanguage: AiResumeTranslationTarget
}

export interface AiResumeTranslationResponse {
  targetLanguage: AiResumeTranslationTarget
  content: ResumeContent
}

export interface AiResumeScoreSuggestionGroup {
  title: string
  suggestions: string[]
}

export type AiResumeRequirementStatus = 'matched' | 'partial' | 'missing'
export type AiResumeHeatmapStatus = 'strong' | 'medium' | 'weak' | 'missing'

export interface AiResumeRequirementMatch {
  text: string
  category: string
  importance: 'high' | 'medium' | 'low' | string
  status: AiResumeRequirementStatus | string
  score: number
  matchedSections: string[]
  evidence: string[]
  suggestion: string
}

export interface AiResumeSectionHeatmap {
  sectionKey: string
  sectionLabel: string
  score: number
  status: AiResumeHeatmapStatus | string
  matchedCount: number
  missingCount: number
  summary: string
}

export interface AiResumeScoreResponse {
  score: number
  summary: string
  strengths: string[]
  suggestionGroups: AiResumeScoreSuggestionGroup[]
  jobDescriptionProvided: boolean
  generatedAt: string
  mode: 'ai' | 'mock' | 'live'
  heatmapSummary?: string | null
  requirementMatches?: AiResumeRequirementMatch[] | null
  sectionHeatmap?: AiResumeSectionHeatmap[] | null
}

export interface PersistedAiResumeScoreResponse {
  jobDescription: string
  result: AiResumeScoreResponse
}

export interface VendorMetadata {
  vendor: string
  defaultBaseUrl: string
  baseUrlPlaceholder: string
  apiKeyPlaceholder: string
  modelNamePlaceholder: string
  apiKeyRequired: boolean
  suggestedModels: string[]
}

export interface ListModelsRequest {
  vendor: string
  baseUrl?: string
  apiKey?: string
}

export interface ListModelsResponse {
  models: string[]
}
