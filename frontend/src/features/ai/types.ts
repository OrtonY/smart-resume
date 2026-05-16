import type { ResumeContent, ResumeLayout } from '../resume/types'

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

export interface AiResumeContext {
  id: string
  title: string
  templateKey: string
  content: ResumeContent
  layout: ResumeLayout
}

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiChatRequest {
  message: string
  conversationId?: string
  resume: AiResumeContext
}

export interface AiChatEvent {
  type: 'message' | 'error' | 'done'
  content: string
  conversationId?: string
}

export interface AiChatConversation {
  conversationId: string
  title: string
  createdAt: string
  updatedAt: string
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
