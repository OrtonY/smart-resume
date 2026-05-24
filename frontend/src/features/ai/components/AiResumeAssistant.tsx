import { HistoryOutlined, MessageOutlined, PlusOutlined, RobotOutlined, SettingOutlined, CloudDownloadOutlined } from '@ant-design/icons'
import { App, Button, Card, Empty, Form, Input, List, Select, Segmented, Space, Spin, Tag, Typography } from 'antd'
import { type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { getAiConfiguration, getAiVendors, listAiChatConversations, listAiChatMessages, listAiModels, saveAiConfiguration, streamAiChat } from '../api/aiApi'
import { MarkdownMessage } from '../../../lib/markdown/MarkdownMessage'
import { MarkdownComposer } from '../../../lib/markdown/MarkdownComposer'
import type {
  AiChatConversation,
  AiChatMessage,
  AiConfigurationRequest,
  AiResumeContext,
  AiResumeSuggestion,
  AiResumeSuggestionPlan,
  VendorMetadata,
} from '../types'
import type { ResumeDetail } from '../../resume/types'
import { toAiResumeContext } from '../resumeContext'

const { Text } = Typography

type SuggestionStatus = 'pending' | 'applied' | 'dismissed'

type AiChatUiMessage = AiChatMessage & {
  id: string
  suggestions?: AiResumeSuggestion[]
}

const SECTION_LABEL_KEYS: Record<string, string> = {
  personalInfo: 'section.personalInfo',
  personalSummary: 'section.personalSummary',
  education: 'section.education',
  workExperience: 'section.workExperience',
  projectExperience: 'section.projectExperience',
  skills: 'section.skills',
  honors: 'section.honors',
  certificates: 'section.certificates',
}

function truncate(text: string, max: number) {
  if (!text) {
    return ''
  }
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function AiConfigurationButton() {
  const { t } = useTranslation('ai')
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
        {t('configuration.buttonLabel')}
      </Button>
      <AiConfigurationModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

interface AiResumeAssistantProps {
  draft: ResumeDetail
  onApplyPatch: (patch: AiResumeSuggestion) => void
}

export function AiResumeAssistant({ draft, onApplyPatch }: AiResumeAssistantProps) {
  const { t } = useTranslation('ai')
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [conversations, setConversations] = useState<AiChatConversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiChatUiMessage[]>([])
  const [suggestionStatus, setSuggestionStatus] = useState<Record<string, SuggestionStatus>>({})
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')
  const [position, setPosition] = useState({ x: window.innerWidth - 96, y: window.innerHeight - 112 })
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)
  const lastMessageCountRef = useRef(0)
  // After a streaming round completes we call refreshConversations(...), which sets
  // selectedConversationId to the newly-created backend conversation. The history-reload
  // useEffect listens on selectedConversationId and would then overwrite the in-memory
  // assistant message (with its suggestions) with the historical version that has no
  // suggestions, making the cards vanish. Skip that one immediate reload.
  const skipNextHistoryReloadRef = useRef(false)

  const resumeContext = useMemo<AiResumeContext>(() => toAiResumeContext(draft), [draft])

  function isNearBottom(target: HTMLDivElement) {
    return target.scrollHeight - target.scrollTop - target.clientHeight <= 64
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = 'auto') {
    const target = messagesContainerRef.current
    if (!target) {
      return
    }
    target.scrollTo({ top: target.scrollHeight, behavior })
  }

  function handleMessagesScroll(event: UIEvent<HTMLDivElement>) {
    shouldAutoScrollRef.current = isNearBottom(event.currentTarget)
  }

  function handleOpen() {
    setSelectedConversationId(null)
    setMessages([])
    setSuggestionStatus({})
    setActiveTab('chat')
    shouldAutoScrollRef.current = true
    lastMessageCountRef.current = 0
    setOpen(true)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoadingConversations(true)
        }
        return listAiChatConversations(draft.id)
      })
      .then((items) => {
        if (cancelled) {
          return
        }
        setConversations(items)
      })
      .catch((error) => {
        void message.error(error instanceof Error ? error.message : t('assistant.loadConversationsFailed'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConversations(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [draft.id, message, open, t])

  useEffect(() => {
    if (!open || !selectedConversationId || streaming) {
      return
    }

    if (skipNextHistoryReloadRef.current) {
      skipNextHistoryReloadRef.current = false
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoadingMessages(true)
        }
        return listAiChatMessages(draft.id, selectedConversationId)
      })
      .then((history) => {
        if (cancelled) {
          return
        }
        // Historical messages never carry suggestions — cards must not be rebuilt for old messages.
        setMessages(history.map((item, index) => ({
          id: `${selectedConversationId}-${index}-${item.role}`,
          role: item.role,
          content: item.content,
        })))
        setSuggestionStatus({})
      })
      .catch((error) => {
        void message.error(error instanceof Error ? error.message : t('assistant.loadHistoryFailed'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMessages(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [draft.id, message, open, selectedConversationId, streaming, t])

  useEffect(() => {
    if (!open || activeTab !== 'chat') {
      return
    }

    const shouldFollow = shouldAutoScrollRef.current
    const hasNewMessage = messages.length > lastMessageCountRef.current
    lastMessageCountRef.current = messages.length

    if (!shouldFollow) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom(hasNewMessage ? 'smooth' : 'auto')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, messages, open])

  const handleApplySuggestion = useCallback(
    (suggestion: AiResumeSuggestion) => {
      const status = suggestionStatus[suggestion.id] ?? 'pending'
      if (status !== 'pending') {
        return
      }
      setSuggestionStatus((prev) => ({ ...prev, [suggestion.id]: 'applied' }))
      onApplyPatch(suggestion)
    },
    [onApplyPatch, suggestionStatus],
  )

  const handleSkipSuggestion = useCallback(
    (suggestion: AiResumeSuggestion) => {
      const status = suggestionStatus[suggestion.id] ?? 'pending'
      if (status !== 'pending') {
        return
      }
      setSuggestionStatus((prev) => ({ ...prev, [suggestion.id]: 'dismissed' }))
    },
    [suggestionStatus],
  )

  const handleUndoSkipSuggestion = useCallback(
    (suggestion: AiResumeSuggestion) => {
      if (suggestionStatus[suggestion.id] !== 'dismissed') {
        return
      }
      setSuggestionStatus((prev) => ({ ...prev, [suggestion.id]: 'pending' }))
    },
    [suggestionStatus],
  )

  const handleApplyAllSuggestions = useCallback(
    (suggestions: AiResumeSuggestion[]) => {
      const pending = suggestions.filter((s) => (suggestionStatus[s.id] ?? 'pending') === 'pending')
      if (pending.length === 0) {
        return
      }
      setSuggestionStatus((prev) => {
        const next = { ...prev }
        pending.forEach((s) => { next[s.id] = 'applied' })
        return next
      })
      pending.forEach((s) => onApplyPatch(s))
    },
    [onApplyPatch, suggestionStatus],
  )

  const handleSkipAllSuggestions = useCallback(
    (suggestions: AiResumeSuggestion[]) => {
      const pending = suggestions.filter((s) => (suggestionStatus[s.id] ?? 'pending') === 'pending')
      if (pending.length === 0) {
        return
      }
      setSuggestionStatus((prev) => {
        const next = { ...prev }
        pending.forEach((s) => { next[s.id] = 'dismissed' })
        return next
      })
    },
    [suggestionStatus],
  )

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || streaming) {
      return
    }

    // Settle previous round suggestions before sending the next message.
    const dismissedFromPrevRound: AiResumeSuggestion[] = []
    let baseMessages = messages
    let lastRoundIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      const candidate = messages[i]
      if (candidate.role === 'assistant' && candidate.suggestions && candidate.suggestions.length > 0) {
        lastRoundIdx = i
        break
      }
    }

    if (lastRoundIdx >= 0) {
      const prev = messages[lastRoundIdx]
      const kept: AiResumeSuggestion[] = [];
      (prev.suggestions ?? []).forEach((s) => {
        const status = suggestionStatus[s.id] ?? 'pending'
        if (status === 'applied') {
          kept.push(s)
        } else if (status === 'dismissed') {
          dismissedFromPrevRound.push(s)
        }
        // pending → drop (vanish on next send)
      })
      baseMessages = messages.map((m, idx) => (idx === lastRoundIdx ? { ...m, suggestions: kept } : m))
    }

    let augmentedContent = trimmed
    if (dismissedFromPrevRound.length > 0) {
      const lines = dismissedFromPrevRound.map((s) => {
        const indexPart = typeof s.index === 'number' ? `#${s.index}` : ''
        return `- ${s.section}${indexPart}.${s.field}: ${s.rationale}`
      })
      augmentedContent = `${trimmed}\n\n${t('assistant.skippedSystemHint', { lines: lines.join('\n') })}`
    }

    // Clear status entries that are no longer attached to a visible card.
    setSuggestionStatus((prev) => {
      const next = { ...prev }
      if (lastRoundIdx >= 0) {
        const prevSuggestions = messages[lastRoundIdx].suggestions ?? []
        prevSuggestions.forEach((s) => {
          const status = next[s.id] ?? 'pending'
          if (status !== 'applied') {
            delete next[s.id]
          }
        })
      }
      return next
    })

    const userMessage: AiChatUiMessage = { id: crypto.randomUUID(), role: 'user', content: augmentedContent }
    const assistantId = crypto.randomUUID()
    const assistantMessage: AiChatUiMessage = { id: assistantId, role: 'assistant', content: '' }

    setMessages([...baseMessages, userMessage, assistantMessage])
    setInput('')
    shouldAutoScrollRef.current = true
    setStreaming(true)
    let activeConversationId = selectedConversationId

    try {
      await streamAiChat({
        message: augmentedContent,
        conversationId: selectedConversationId ?? undefined,
        resume: resumeContext,
      }, (event) => {
        if (event.type === 'error') {
          throw new Error(event.content || t('assistant.chatFailed'))
        }
        if (event.type === 'done') {
          return
        }
        if (event.conversationId && event.conversationId !== selectedConversationId) {
          activeConversationId = event.conversationId
        }
        if (event.type === 'suggestion') {
          let plan: AiResumeSuggestionPlan
          try {
            plan = JSON.parse(event.content) as AiResumeSuggestionPlan
          } catch (error) {
            console.warn('Failed to parse AI suggestion plan', error)
            return
          }
          const list = Array.isArray(plan?.suggestions) ? plan.suggestions : []
          if (list.length === 0) {
            return
          }
          setMessages((current) => current.map((item) => (
            item.id === assistantId ? { ...item, suggestions: list } : item
          )))
          setSuggestionStatus((prev) => {
            const next = { ...prev }
            list.forEach((s) => {
              if (!next[s.id]) {
                next[s.id] = 'pending'
              }
            })
            return next
          })
          return
        }
        if (event.type === 'message') {
          setMessages((current) => current.map((item) => (
            item.id === assistantId ? { ...item, content: item.content + event.content } : item
          )))
        }
      })
      // Skip the immediate history reload that selectedConversationId change would trigger,
      // so the in-memory assistant message (with suggestions) is not overwritten by the
      // historical version that has no suggestions attached.
      skipNextHistoryReloadRef.current = true
      await refreshConversations(activeConversationId)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('assistant.chatFailed'))
      setMessages((current) => current.filter((item) => item.id !== assistantId))
    } finally {
      setStreaming(false)
    }
  }

  async function refreshConversations(preferredConversationId?: string | null) {
    const items = await listAiChatConversations(draft.id)
    setConversations(items)
    if (preferredConversationId && items.some((item) => item.conversationId === preferredConversationId)) {
      setSelectedConversationId(preferredConversationId)
      return
    }
    setSelectedConversationId((current) => current ?? items[0]?.conversationId ?? null)
  }

  function startNewChat() {
    if (streaming) {
      return
    }
    setSelectedConversationId(null)
    setMessages([])
    setSuggestionStatus({})
    setActiveTab('chat')
    shouldAutoScrollRef.current = true
    lastMessageCountRef.current = 0
  }

  function selectConversation(conversationId: string) {
    if (streaming) {
      return
    }
    setSelectedConversationId(conversationId)
    setSuggestionStatus({})
    setActiveTab('chat')
    shouldAutoScrollRef.current = true
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const nextX = Math.max(12, Math.min(window.innerWidth - 76, drag.originX + event.clientX - drag.startX))
    const nextY = Math.max(12, Math.min(window.innerHeight - 76, drag.originY + event.clientY - drag.startY))
    setPosition({ x: nextX, y: nextY })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current
    dragState.current = null
    if (!drag) {
      return
    }
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (Math.abs(event.clientX - drag.startX) < 4 && Math.abs(event.clientY - drag.startY) < 4) {
      event.preventDefault()
      event.stopPropagation()
      window.setTimeout(handleOpen, 50)
    }
  }

  return (
    <>
      <button
        className="ai-floating-trigger"
        style={{ left: position.x, top: position.y }}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label={t('trigger.ariaLabel')}
      >
        <RobotOutlined />
        <span>{t('trigger.label')}</span>
      </button>

      <ResponsiveModal
        open={open}
        title={t('assistant.modalTitle')}
        onCancel={() => setOpen(false)}
        footer={null}
        width={900}
        destroyOnHidden={false}
        centered
        mobileHeight="100dvh"
        styles={{
          body: {
            height: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <div className="ai-chat-panel">
          <div className="ai-chat-toolbar">
            <Segmented
              value={activeTab}
              onChange={(value) => setActiveTab(value as 'chat' | 'history')}
              options={[
                { label: <span><MessageOutlined /> {t('assistant.tabChat')}</span>, value: 'chat' },
                { label: <span><HistoryOutlined /> {t('assistant.tabHistory')}</span>, value: 'history' },
              ]}
            />
            <Button icon={<PlusOutlined />} onClick={startNewChat} disabled={streaming}>
              {t('assistant.newChat')}
            </Button>
          </div>

          <div className="ai-chat-context">
            <Tag color="blue">{t('assistant.boundResume')}</Tag>
            <Text strong>{draft.title}</Text>
            {selectedConversationId ? <Tag color="default">{t('assistant.continuingChat')}</Tag> : <Tag color="green">{t('assistant.newChatTag')}</Tag>}
          </div>

          {activeTab === 'history' ? (
            <Spin spinning={loadingConversations}>
              <List
                className="ai-chat-conversation-list"
                dataSource={conversations}
                locale={{ emptyText: t('assistant.historyEmpty') }}
                renderItem={(item) => (
                  <List.Item
                    className={item.conversationId === selectedConversationId ? 'is-active' : ''}
                    onClick={() => selectConversation(item.conversationId)}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={new Date(item.updatedAt).toLocaleString()}
                    />
                  </List.Item>
                )}
              />
            </Spin>
          ) : (
            <div className="ai-chat-main">
              <Spin spinning={loadingMessages}>
                <div className="ai-chat-messages" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
                  {messages.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('assistant.chatEmpty')} />
                  ) : null}
                  {messages.map((item) => {
                    const isStreamingThis = streaming && item.role === 'assistant' && item.id === messages[messages.length - 1]?.id
                    return (
                    <div className={`ai-chat-message ai-chat-message--${item.role}`} key={item.id}>
                      <div className="ai-chat-message__bubble">
                        {item.content ? (
                          <MarkdownMessage content={item.content} streaming={isStreamingThis} />
                        ) : (
                          item.role === 'assistant' ? t('assistant.replyingPlaceholder') : ''
                        )}
                      </div>
                      {item.role === 'assistant' && item.suggestions && item.suggestions.length > 0 ? (
                        <SuggestionList
                          suggestions={item.suggestions}
                          statusMap={suggestionStatus}
                          onApply={handleApplySuggestion}
                          onSkip={handleSkipSuggestion}
                          onUndoSkip={handleUndoSkipSuggestion}
                          onApplyAll={handleApplyAllSuggestions}
                          onSkipAll={handleSkipAllSuggestions}
                        />
                      ) : null}
                    </div>
                    )
                  })}
                </div>
              </Spin>
              <div className="ai-chat-composer">
                <MarkdownComposer
                  value={input}
                  onChange={setInput}
                  onSubmit={() => void handleSend()}
                  placeholder={t('assistant.composerPlaceholder')}
                  disabled={streaming}
                  autoSize={{ minRows: 3, maxRows: 10 }}
                />
                <Button
                  type="primary"
                  icon={<MessageOutlined />}
                  loading={streaming}
                  onClick={() => void handleSend()}
                >
                  {t('assistant.send')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </>
  )
}

interface SuggestionListProps {
  suggestions: AiResumeSuggestion[]
  statusMap: Record<string, SuggestionStatus>
  onApply: (suggestion: AiResumeSuggestion) => void
  onSkip: (suggestion: AiResumeSuggestion) => void
  onUndoSkip: (suggestion: AiResumeSuggestion) => void
  onApplyAll: (suggestions: AiResumeSuggestion[]) => void
  onSkipAll: (suggestions: AiResumeSuggestion[]) => void
}

function SuggestionList({
  suggestions,
  statusMap,
  onApply,
  onSkip,
  onUndoSkip,
  onApplyAll,
  onSkipAll,
}: SuggestionListProps) {
  const { t } = useTranslation('ai')
  const hasPending = suggestions.some((s) => (statusMap[s.id] ?? 'pending') === 'pending')

  return (
    <div className="ai-chat-suggestion-list" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>{t('suggestion.groupTitle', { count: suggestions.length })}</Text>
        <Space size={6}>
          <Button size="small" type="primary" disabled={!hasPending} onClick={() => onApplyAll(suggestions)}>
            {t('suggestion.applyAll')}
          </Button>
          <Button size="small" disabled={!hasPending} onClick={() => onSkipAll(suggestions)}>
            {t('suggestion.skipAll')}
          </Button>
        </Space>
      </div>
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          status={statusMap[suggestion.id] ?? 'pending'}
          onApply={() => onApply(suggestion)}
          onSkip={() => onSkip(suggestion)}
          onUndoSkip={() => onUndoSkip(suggestion)}
        />
      ))}
    </div>
  )
}

interface SuggestionCardProps {
  suggestion: AiResumeSuggestion
  status: SuggestionStatus
  onApply: () => void
  onSkip: () => void
  onUndoSkip: () => void
}

function SuggestionCard({ suggestion, status, onApply, onSkip, onUndoSkip }: SuggestionCardProps) {
  const { t } = useTranslation('ai')
  const sectionLabelKey = SECTION_LABEL_KEYS[suggestion.section]
  const sectionLabel = sectionLabelKey ? t(sectionLabelKey) : suggestion.section
  const indexPart = typeof suggestion.index === 'number' ? t('suggestion.indexSuffix', { index: suggestion.index + 1 }) : ''
  const currentSummary = suggestion.currentValue ? truncate(suggestion.currentValue, 50) : ''
  const dimmed = status === 'dismissed'

  return (
    <Card
      size="small"
      className={`ai-chat-suggestion-card ai-chat-suggestion-card--${status}`}
      style={{ opacity: dimmed ? 0.6 : 1 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <Space size={4} wrap>
          <Tag color="blue">{sectionLabel}{indexPart}</Tag>
          <Tag color="default">{suggestion.field}</Tag>
          {status === 'applied' ? <Tag color="success">{t('suggestion.applied')}</Tag> : null}
          {status === 'dismissed' ? <Tag color="default">{t('suggestion.dismissed')}</Tag> : null}
        </Space>
        <Space size={4}>
          {status === 'pending' ? (
            <>
              <Button size="small" type="primary" onClick={onApply}>{t('suggestion.apply')}</Button>
              <Button size="small" onClick={onSkip}>{t('suggestion.skip')}</Button>
            </>
          ) : null}
          {status === 'applied' ? (
            <Button size="small" type="primary" disabled>{t('suggestion.applied')}</Button>
          ) : null}
          {status === 'dismissed' ? (
            <Button size="small" onClick={onUndoSkip}>{t('suggestion.undoSkip')}</Button>
          ) : null}
        </Space>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
        {currentSummary ? (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('suggestion.currentLabel')}</Text>
            <Text delete style={{ marginLeft: 4 }}>{currentSummary}</Text>
          </div>
        ) : null}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('suggestion.suggestedLabel')}</Text>
          <Text style={{ marginLeft: 4 }}>{suggestion.suggestedValue}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('suggestion.rationaleLabel')}</Text>
          <Text style={{ marginLeft: 4 }}>{suggestion.rationale}</Text>
        </div>
      </div>
    </Card>
  )
}

function AiConfigurationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('ai')
  const { message } = App.useApp()
  const [form] = Form.useForm<AiConfigurationRequest>()
  const selectedVendor = Form.useWatch('vendor', form)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [vendorMetadataList, setVendorMetadataList] = useState<VendorMetadata[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<string[] | null>(null)

  const currentVendorMeta = useMemo(
    () => vendorMetadataList.find((m) => m.vendor === selectedVendor),
    [vendorMetadataList, selectedVendor],
  )

  const modelOptions = useMemo(
    () => fetchedModels ?? currentVendorMeta?.suggestedModels ?? [],
    [fetchedModels, currentVendorMeta],
  )

  const vendorOptions = useMemo(() => {
    if (vendorMetadataList.length > 0) {
      return vendorMetadataList.map((m) => ({ label: m.vendor, value: m.vendor }))
    }
    return [
      { label: 'OpenAI', value: 'OpenAI' },
      { label: 'Ollama', value: 'Ollama' },
      { label: 'DeepSeek', value: 'DeepSeek' },
    ]
  }, [vendorMetadataList])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true)
        }
        return Promise.all([getAiConfiguration(), getAiVendors()])
      })
      .then(([configuration, vendors]) => {
        if (cancelled) {
          return
        }
        setConfigured(configuration.configured)
        setVendorMetadataList(vendors)
        form.setFieldsValue({
          vendor: configuration.vendor || 'OpenAI',
          baseUrl: configuration.baseUrl,
          apiKey: '',
          modelName: configuration.modelName,
        })
      })
      .catch((error) => {
        void message.error(error instanceof Error ? error.message : t('configuration.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [form, message, open, t])

  async function handleFetchModels() {
    const values = form.getFieldsValue()
    setFetchingModels(true)
    try {
      const response = await listAiModels({
        vendor: values.vendor,
        baseUrl: values.baseUrl || undefined,
        apiKey: values.apiKey || undefined,
      })
      setFetchedModels(response.models)
      if (response.models.length === 0) {
        void message.info(t('configuration.modelsEmpty'))
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('configuration.fetchModelsFailed'))
    } finally {
      setFetchingModels(false)
    }
  }

  async function handleSave() {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await saveAiConfiguration(values)
      void message.success(t('configuration.saveSuccess'))
      onClose()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('configuration.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      title={t('configuration.modalTitle')}
      onCancel={onClose}
      onOk={() => void handleSave()}
      okText={t('configuration.saveOk')}
      cancelText={t('configuration.cancel')}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={{ vendor: 'OpenAI' }}>
          <Form.Item name="vendor" label={t('configuration.vendorLabel')} rules={[{ required: true, message: t('configuration.vendorRequired') }]}>
            <Select options={vendorOptions} onChange={() => setFetchedModels(null)} />
          </Form.Item>
          <Form.Item name="baseUrl" label={t('configuration.baseUrlLabel')}>
            <Input placeholder={currentVendorMeta?.baseUrlPlaceholder ?? 'https://api.openai.com'} />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label={t('configuration.apiKeyLabel')}
            rules={configured || currentVendorMeta?.apiKeyRequired === false ? [] : [{ required: true, message: t('configuration.apiKeyRequired') }]}
            extra={configured ? t('configuration.apiKeyKeepHint') : (currentVendorMeta?.apiKeyRequired === false ? t('configuration.apiKeyNotRequired') : undefined)}
          >
            <Input.Password
              autoComplete="off"
              placeholder={currentVendorMeta?.apiKeyPlaceholder ?? (configured ? t('configuration.apiKeyKeepPlaceholder') : t('configuration.apiKeyPlaceholderDefault'))}
            />
          </Form.Item>
          <Form.Item label={t('configuration.modelLabel')} required>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="modelName" noStyle rules={[{ required: true, message: t('configuration.modelRequired') }]}>
                <Input placeholder={currentVendorMeta?.modelNamePlaceholder ?? t('configuration.modelPlaceholderDefault')} />
              </Form.Item>
              <Button
                icon={<CloudDownloadOutlined />}
                loading={fetchingModels}
                onClick={() => void handleFetchModels()}
              >
                {t('configuration.fetchModels')}
              </Button>
            </div>
            {modelOptions.length > 0 && (
              <ModelList models={modelOptions} onSelect={(model) => form.setFieldValue('modelName', model)} />
            )}
          </Form.Item>
        </Form>
      </Spin>
    </ResponsiveModal>
  )
}

function ModelList({ models, onSelect }: { models: string[]; onSelect: (model: string) => void }) {
  const { t } = useTranslation('ai')
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return models
    const keyword = filter.toLowerCase()
    return models.filter((m) => m.toLowerCase().includes(keyword))
  }, [models, filter])

  return (
    <div style={{ marginTop: 8, border: '1px solid #d9d9d9', borderRadius: 6, padding: 8, maxHeight: 180, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Input
        size="small"
        placeholder={t('modelList.searchPlaceholder')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        allowClear
        style={{ marginBottom: 6 }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modelList.noMatch')}</Text>
        ) : (
          filtered.map((model) => (
            <div
              key={model}
              onClick={() => onSelect(model)}
              style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {model}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
