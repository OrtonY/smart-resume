import { App, Button, Space, Tag } from 'antd'
import { type UIEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { MarkdownMessage } from '../../../lib/markdown/MarkdownMessage'
import { getAssist, streamAssistAnswer, streamAssistScore } from '../api/interviewApi'
import { INTERVIEW_MODAL_WIDTH, INTERVIEW_SCROLL_BOTTOM_THRESHOLD } from '../constants'
import type { AssistStatus, InterviewAssistDto } from '../types'

interface AiAnswerModalProps {
  open: boolean
  onClose: () => void
  interviewId: string
  messageId: string
  questionContent: string
  currentInputContent: string
  candidateAnswerFromHistory: string | undefined
}

type AiAnswerView = 'answer' | 'score'

export function AiAnswerModal({
  open,
  onClose,
  interviewId,
  messageId,
  questionContent,
  currentInputContent,
  candidateAnswerFromHistory,
}: AiAnswerModalProps) {
  const { t } = useTranslation('interview')
  const { message } = App.useApp()

  const [assist, setAssist] = useState<InterviewAssistDto | null>(null)
  const [answerStreaming, setAnswerStreaming] = useState(false)
  const [answerStreamContent, setAnswerStreamContent] = useState('')
  const [scoreStreaming, setScoreStreaming] = useState(false)
  const [scoreStreamContent, setScoreStreamContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<AiAnswerView>('answer')

  const answerAbortRef = useRef<AbortController | null>(null)
  const scoreAbortRef = useRef<AbortController | null>(null)
  const contentPanelRef = useRef<HTMLDivElement | null>(null)
  const mountedRef = useRef(true)
  const shouldAutoScrollRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadAssist = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAssist(interviewId, messageId)
      if (mountedRef.current) {
        setAssist(data)
      }
      return data
    } catch {
      return null
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [interviewId, messageId])

  const startAnswerStream = useCallback(() => {
    answerAbortRef.current?.abort()
    const controller = new AbortController()
    answerAbortRef.current = controller
    setAnswerStreaming(true)
    setAnswerStreamContent('')

    streamAssistAnswer(
      interviewId,
      messageId,
      (event) => {
        if (event.type === 'message' && event.content) {
          setAnswerStreamContent((prev) => prev + event.content)
        }
      },
      { signal: controller.signal },
    )
      .then(() => {
        if (mountedRef.current) {
          void loadAssist()
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (mountedRef.current) void loadAssist()
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setAnswerStreaming(false)
          answerAbortRef.current = null
        }
      })
  }, [interviewId, messageId, loadAssist])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      await loadAssist()
    })()
    return () => {
      answerAbortRef.current?.abort()
      scoreAbortRef.current?.abort()
    }
  }, [open, loadAssist])

  function handleRegenerate() {
    answerAbortRef.current?.abort()
    startAnswerStream()
  }

  function handleStopAnswer() {
    answerAbortRef.current?.abort()
  }

  function handleStartScore() {
    const candidateText = candidateAnswerFromHistory ?? currentInputContent
    if (!candidateText || !candidateText.trim()) {
      void message.warning(t('aiAnswer.score.empty'))
      return
    }
    startScoreStream(candidateText.trim())
  }

  function handleRescore() {
    const candidateText = candidateAnswerFromHistory ?? currentInputContent
    if (!candidateText || !candidateText.trim()) {
      void message.warning(t('aiAnswer.score.empty'))
      return
    }
    scoreAbortRef.current?.abort()
    startScoreStream(candidateText.trim())
  }

  function startScoreStream(candidateText: string) {
    scoreAbortRef.current?.abort()
    const controller = new AbortController()
    scoreAbortRef.current = controller
    setScoreStreaming(true)
    setScoreStreamContent('')

    streamAssistScore(
      interviewId,
      messageId,
      candidateText,
      (event) => {
        if (event.type === 'message' && event.content) {
          setScoreStreamContent((prev) => prev + event.content)
        }
      },
      { signal: controller.signal },
    )
      .then(() => {
        if (mountedRef.current) void loadAssist()
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (mountedRef.current) void loadAssist()
        } else {
          void message.error(err instanceof Error ? err.message : t('feedback.operationFailed'))
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setScoreStreaming(false)
          scoreAbortRef.current = null
        }
      })
  }

  function handleClose() {
    answerAbortRef.current?.abort()
    scoreAbortRef.current?.abort()
    onClose()
  }

  function isNearBottom(target: HTMLDivElement) {
    return target.scrollHeight - target.scrollTop - target.clientHeight <= INTERVIEW_SCROLL_BOTTOM_THRESHOLD
  }

  function scrollContentToBottom(behavior: ScrollBehavior = 'auto') {
    const target = contentPanelRef.current
    if (!target) {
      return
    }
    target.scrollTo({ top: target.scrollHeight, behavior })
  }

  function handleContentScroll(event: UIEvent<HTMLDivElement>) {
    shouldAutoScrollRef.current = isNearBottom(event.currentTarget)
  }

  const answerStatus: AssistStatus = assist?.answerStatus ?? 'PENDING'
  const scoreStatus: AssistStatus = assist?.scoreStatus ?? 'PENDING'
  const hasAnswer = answerStatus === 'READY' && assist?.answerContent
  const hasScore = scoreStatus === 'READY' && assist?.feedback

  const candidateSource = candidateAnswerFromHistory
    ? t('aiAnswer.score.fromHistory')
    : t('aiAnswer.score.fromInput')

  useEffect(() => {
    if (!open) {
      return
    }
    shouldAutoScrollRef.current = true
    const frame = window.requestAnimationFrame(() => {
      scrollContentToBottom('auto')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, activeView])

  useEffect(() => {
    if (!open || activeView !== 'answer' || !shouldAutoScrollRef.current) {
      return
    }
    const shouldScroll = answerStreaming || loading || hasAnswer
    if (!shouldScroll) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      scrollContentToBottom(answerStreaming ? 'auto' : 'smooth')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, activeView, answerStreaming, answerStreamContent, hasAnswer, loading])

  useEffect(() => {
    if (!open || activeView !== 'score' || !shouldAutoScrollRef.current) {
      return
    }
    const shouldScroll = scoreStreaming || hasScore
    if (!shouldScroll) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      scrollContentToBottom(scoreStreaming ? 'auto' : 'smooth')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, activeView, scoreStreaming, scoreStreamContent, hasScore, assist?.candidateAnswer, assist?.score])

  return (
    <ResponsiveModal
      title={t('aiAnswer.modalTitle')}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={INTERVIEW_MODAL_WIDTH}
      destroyOnHidden
      className="ai-answer-modal"
      mobileHeight="92vh"
      styles={{ body: { maxHeight: '70vh', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <div className="ai-answer-modal__content">
        <div className="ai-answer-modal__question">
          <Tag color="blue">{t('message.interviewer')}</Tag>
          <MarkdownMessage content={questionContent} />
        </div>

        <div className="ai-answer-modal__view-switch" role="tablist" aria-label={t('aiAnswer.modalTitle')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'answer'}
            className={`ai-answer-modal__view-button${activeView === 'answer' ? ' ai-answer-modal__view-button--active' : ''}`}
            onClick={() => setActiveView('answer')}
          >
            {t('aiAnswer.answerTitle')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'score'}
            className={`ai-answer-modal__view-button${activeView === 'score' ? ' ai-answer-modal__view-button--active' : ''}`}
            onClick={() => setActiveView('score')}
          >
            {t('aiAnswer.score.title')}
          </button>
        </div>

        <div className="ai-answer-modal__panel" ref={contentPanelRef} onScroll={handleContentScroll}>
          {activeView === 'answer' ? (
            <div className="ai-answer-modal__section">
              <div className="ai-answer-modal__section-header">
                <strong>{t('aiAnswer.answerTitle')}</strong>
                <Space>
                  {answerStreaming ? (
                    <Button size="small" danger onClick={handleStopAnswer}>
                      {t('aiAnswer.stop')}
                    </Button>
                  ) : hasAnswer ? (
                    <Button size="small" onClick={handleRegenerate}>
                      {t('aiAnswer.regenerate')}
                    </Button>
                  ) : null}
                </Space>
              </div>
              <div className="ai-answer-modal__body">
                {answerStreaming ? (
                  answerStreamContent ? (
                    <MarkdownMessage content={answerStreamContent} streaming />
                  ) : (
                    <div className="ai-answer-modal__thinking">{t('aiAnswer.thinking')}</div>
                  )
                ) : hasAnswer ? (
                  <MarkdownMessage content={assist!.answerContent!} />
                ) : loading ? (
                  <div className="ai-answer-modal__thinking">{t('aiAnswer.thinking')}</div>
                ) : (
                  <Button type="primary" onClick={startAnswerStream}>
                    {t('aiAnswer.generate')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="ai-answer-modal__section">
              <div className="ai-answer-modal__section-header">
                <strong>{t('aiAnswer.score.title')}</strong>
                <Tag>{candidateSource}</Tag>
              </div>
              <div className="ai-answer-modal__body">
                {scoreStreaming ? (
                  scoreStreamContent ? (
                    <MarkdownMessage content={scoreStreamContent} streaming />
                  ) : (
                    <div className="ai-answer-modal__thinking">{t('aiAnswer.thinking')}</div>
                  )
                ) : hasScore ? (
                  <>
                    {assist!.score != null ? (
                      <div className="ai-answer-modal__score-badge">
                        <span className="ai-answer-modal__score-value">{assist!.score}</span>
                        <span className="ai-answer-modal__score-label">
                          {t('aiAnswer.score.scoreLabel', { value: assist!.score })}
                        </span>
                      </div>
                    ) : null}
                    <MarkdownMessage content={assist!.feedback!} />
                    {assist!.candidateAnswer ? (
                      <details className="ai-answer-modal__candidate-snapshot">
                        <summary>{t('aiAnswer.score.snapshotLabel')}</summary>
                        <MarkdownMessage content={assist!.candidateAnswer} />
                      </details>
                    ) : null}
                    <Button size="small" onClick={handleRescore} style={{ marginTop: 8 }}>
                      {t('aiAnswer.score.regenerate')}
                    </Button>
                  </>
                ) : (
                  <Button type="primary" onClick={handleStartScore} disabled={answerStreaming || scoreStreaming}>
                    {t('aiAnswer.score.start')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}
