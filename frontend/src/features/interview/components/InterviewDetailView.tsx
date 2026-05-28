import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MessageOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Popconfirm,
  Popover,
  Space,
  Spin,
  Tag,
} from 'antd'
import { type Dispatch, type SetStateAction, type UIEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { useIsMobile } from '../../../lib/hooks/useIsMobile'
import { MarkdownComposer } from '../../../lib/markdown/MarkdownComposer'
import { MarkdownMessage } from '../../../lib/markdown/MarkdownMessage'
import { getInterview } from '../api/interviewApi'
import {
  INTERVIEW_COMPOSER_MAX_ROWS,
  INTERVIEW_COMPOSER_MIN_ROWS,
  INTERVIEW_SCROLL_BOTTOM_THRESHOLD,
} from '../constants'
import { useInterviewTimer } from '../hooks/useInterviewTimer'
import { AiAnswerModal } from './AiAnswerModal'
import { InterviewReportPanel } from './InterviewReportPanel'
import {
  companyContextStatusLabel,
  interviewDifficultyLabel,
  type InterviewDetail,
} from '../types'
import { companyContextColor, difficultyColor } from '../interviewPageUtils'

interface InterviewDetailViewProps {
  detail: InterviewDetail | null
  loading: boolean
  messageDraft: string
  streaming: boolean
  streamingContent: string
  submittingMessage: boolean
  setDetail: Dispatch<SetStateAction<InterviewDetail | null>>
  onBack: () => void
  onPause: () => void
  onContinue: () => void
  onEnd: () => void
  onNextRound: () => Promise<InterviewDetail | null>
  onSubmitMessage: () => void
  onStopStreaming: () => void
  onRegenerate: () => void
  onUpdateMessageDraft: (value: string) => void
}

export function InterviewDetailView({
  detail,
  loading,
  messageDraft,
  streaming,
  streamingContent,
  submittingMessage,
  setDetail,
  onBack,
  onPause,
  onContinue,
  onEnd,
  onNextRound,
  onSubmitMessage,
  onStopStreaming,
  onRegenerate,
  onUpdateMessageDraft,
}: InterviewDetailViewProps) {
  const { t } = useTranslation('interview')
  const isMobile = useIsMobile()
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)
  const lastMessageCountRef = useRef(0)

  const initialTimerSeconds = useMemo(() => {
    if (!detail) {
      return 0
    }
    const base = detail.totalElapsedSeconds ?? 0
    if (detail.status === 'IN_PROGRESS' && detail.lastResumedAt) {
      const resumedAt = new Date(detail.lastResumedAt).getTime()
      // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for elapsed-time offset
      const diff = Math.floor((Date.now() - resumedAt) / 1000)
      return base + Math.max(0, diff)
    }
    return base
  }, [detail])

  const { formatted: timerDisplay } = useInterviewTimer(detail?.status === 'IN_PROGRESS', initialTimerSeconds)
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false)
  const [companyInfoOpen, setCompanyInfoOpen] = useState(false)
  const [activeRoundTab, setActiveRoundTab] = useState<number>(detail?.activeRoundIndex ?? 0)
  const [nextRoundLoading, setNextRoundLoading] = useState(false)
  const [aiAnswerModal, setAiAnswerModal] = useState<{ messageId: string; questionContent: string; candidateAnswerFromHistory: string | undefined } | null>(null)
  const safeActiveRoundTab = detail ? Math.min(activeRoundTab, Math.max(detail.interviewerRoles.length - 1, 0)) : 0
  const isViewingCurrentRound = detail ? safeActiveRoundTab === detail.activeRoundIndex : true

  const filteredMessages = useMemo(() => {
    if (!detail) {
      return []
    }
    return detail.messages.filter((messageItem) => messageItem.roundIndex === safeActiveRoundTab)
  }, [detail, safeActiveRoundTab])

  function isNearBottom(target: HTMLDivElement) {
    return target.scrollHeight - target.scrollTop - target.clientHeight <= INTERVIEW_SCROLL_BOTTOM_THRESHOLD
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = 'auto') {
    const target = messagesContainerRef.current
    if (!target) {
      return
    }
    target.scrollTo({ top: target.scrollHeight, behavior })
  }

  function handleMessageListScroll(event: UIEvent<HTMLDivElement>) {
    shouldAutoScrollRef.current = isNearBottom(event.currentTarget)
  }

  useEffect(() => {
    const messageCount = filteredMessages.length
    const hasNewMessage = messageCount > lastMessageCountRef.current
    lastMessageCountRef.current = messageCount

    if (!shouldAutoScrollRef.current) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom(hasNewMessage ? 'smooth' : 'auto')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [filteredMessages])

  useEffect(() => {
    shouldAutoScrollRef.current = true
    lastMessageCountRef.current = 0
    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom('auto')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [detail?.id, safeActiveRoundTab])

  useEffect(() => {
    if (!streaming || !streamingContent || !shouldAutoScrollRef.current || !isViewingCurrentRound) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom('auto')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [streaming, streamingContent, isViewingCurrentRound])

  async function handleNextRound() {
    setNextRoundLoading(true)
    try {
      const next = await onNextRound()
      if (next) {
        setActiveRoundTab(next.activeRoundIndex)
      }
    } finally {
      setNextRoundLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="workspace-layout">
        <div className="workspace-loading-state">
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="workspace-layout">
        <Card className="glass-card workspace-hub__empty" bordered={false}>
          <Empty description={t('detail.notFound')} />
          <Button type="primary" onClick={onBack}>
            {t('detail.backToCenter')}
          </Button>
        </Card>
      </div>
    )
  }

  const canMessage = detail.status === 'IN_PROGRESS' && isViewingCurrentRound
  const hasNextRound = detail.status === 'IN_PROGRESS' && detail.activeRoundIndex < detail.interviewerRoles.length - 1
  const companyInfoContent = detail.targetCompany ? (
    <div className="interview-company-popover__content">
      <div className="interview-company-popover__head">
        <span>{t('detail.targetCompanyLabel')}</span>
        <strong>{detail.targetCompany}</strong>
        <Tag color={companyContextColor(detail.companyContextStatus)}>
          {companyContextStatusLabel(detail.companyContextStatus, t)}
        </Tag>
      </div>
      {detail.companyContextSummary.length > 0 ? (
        <ul className="interview-company-popover__summary">
          {detail.companyContextSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="interview-company-popover__empty">{t('detail.companyPopoverEmpty')}</p>
      )}
    </div>
  ) : null

  return (
    <div className="workspace-layout">
      <div className="interview-detail">
        <div className="interview-detail__topbar">
          {isMobile ? (
            <div className="interview-detail__topbar-main">
              <strong className="interview-detail__topbar-title" style={{ fontSize: 16 }}>{detail.title}</strong>
              <div className="interview-detail__topbar-tag-strip">
                <div className="interview-detail__topbar-tag-strip-inner">
                  <Tag color="blue">{t('detail.roundTag', { current: detail.activeRoundIndex + 1, total: detail.interviewerRoles.length })}</Tag>
                  <Tag color={difficultyColor(detail.difficulty)}>{interviewDifficultyLabel(detail.difficulty, t)}</Tag>
                  {detail.targetCompany ? (
                    <button
                      type="button"
                      className="interview-company-chip"
                      aria-label={t('detail.companyChipLabel', { company: detail.targetCompany })}
                      onClick={() => setCompanyInfoOpen(true)}
                    >
                      <strong>{detail.targetCompany}</strong>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <Space align="center" className="interview-detail__topbar-meta">
              <strong className="interview-detail__topbar-title" style={{ fontSize: 16 }}>{detail.title}</strong>
              <Tag color="blue">{t('detail.roundTag', { current: detail.activeRoundIndex + 1, total: detail.interviewerRoles.length })}</Tag>
              <Tag color={difficultyColor(detail.difficulty)}>{interviewDifficultyLabel(detail.difficulty, t)}</Tag>
              {detail.targetCompany ? (
                <Popover
                  trigger="hover"
                  placement="bottomLeft"
                  overlayClassName="interview-company-popover"
                  content={companyInfoContent}
                >
                  <button
                    type="button"
                    className="interview-company-chip"
                    aria-label={t('detail.companyChipLabel', { company: detail.targetCompany })}
                  >
                    <strong>{detail.targetCompany}</strong>
                  </button>
                </Popover>
              ) : null}
            </Space>
          )}

          <Space align="center" className="interview-detail__topbar-actions">
            <Tag icon={<ClockCircleOutlined />} color="blue" className="interview-detail__timer-tag" style={{ fontSize: 13, padding: '2px 8px' }}>
              {timerDisplay}
            </Tag>
            {!isMobile ? (
              <>
                {detail.status === 'PAUSED' ? <Button onClick={onContinue}>{t('detail.continueInterview')}</Button> : null}
                {hasNextRound ? (
                  <Button type="primary" ghost icon={<ArrowRightOutlined />} title={t('detail.nextRoundTitle')} onClick={() => void handleNextRound()}>
                    {t('detail.nextRound')}
                  </Button>
                ) : null}
                {detail.status === 'IN_PROGRESS' ? (
                  <Button icon={<PauseCircleOutlined />} title={t('detail.pauseTitle')} onClick={onPause}>
                    {t('detail.pause')}
                  </Button>
                ) : null}
                {detail.status !== 'ENDED' ? (
                  <Popconfirm title={t('detail.endConfirm')} onConfirm={onEnd} okText={t('detail.endOk')} cancelText={t('common:actions.cancel')}>
                    <Button type="primary" ghost danger icon={<PoweroffOutlined />} title={t('detail.endTitle')}>
                      {t('detail.endOk')}
                    </Button>
                  </Popconfirm>
                ) : null}
                {detail.status === 'ENDED' || detail.reportStatus === 'READY' || detail.reportStatus === 'GENERATING' || detail.reportStatus === 'FAILED' ? (
                  <Button icon={<FileTextOutlined />} onClick={() => setReportDrawerOpen(true)}>
                    {t('detail.viewReport')}
                  </Button>
                ) : null}
                {detail.status === 'ENDED' ? (
                  <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
                    {t('detail.backToCenter')}
                  </Button>
                ) : null}
              </>
            ) : (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    ...(detail.status === 'PAUSED' ? [{ key: 'continue', label: t('detail.continueInterview'), icon: <PlayCircleOutlined />, onClick: onContinue }] : []),
                    ...(hasNextRound ? [{ key: 'nextRound', label: t('detail.nextRound'), icon: <ArrowRightOutlined />, onClick: () => void handleNextRound() }] : []),
                    ...(detail.status === 'IN_PROGRESS' ? [{ key: 'pause', label: t('detail.pause'), icon: <PauseCircleOutlined />, onClick: onPause }] : []),
                    ...(detail.status !== 'ENDED' ? [{ key: 'end', label: t('detail.endOk'), icon: <PoweroffOutlined />, danger: true, onClick: onEnd }] : []),
                    ...((detail.status === 'ENDED' || detail.reportStatus === 'READY' || detail.reportStatus === 'GENERATING' || detail.reportStatus === 'FAILED')
                      ? [{ key: 'report', label: t('detail.viewReport'), icon: <FileTextOutlined />, onClick: () => setReportDrawerOpen(true) }]
                      : []),
                    ...(detail.status === 'ENDED' ? [{ key: 'back', label: t('detail.backToCenter'), icon: <ArrowLeftOutlined />, onClick: onBack }] : []),
                  ],
                }}
              >
                <Button className="interview-detail__more-button" icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </Space>
        </div>

        <div className="interview-round-tabs" role="tablist">
          {detail.interviewerRoles.map((role, index) => (
            <button
              key={`round-${index}`}
              role="tab"
              aria-selected={safeActiveRoundTab === index}
              className={`interview-round-tab${safeActiveRoundTab === index ? ' interview-round-tab--active' : ''}`}
              onClick={() => setActiveRoundTab(index)}
            >
              {t('detail.roundTabLabel', { index: index + 1, role })}
            </button>
          ))}
        </div>

        <div className="interview-detail__layout">
          <Card className="glass-card interview-detail__main" bordered={false}>
            <div className="interview-message-list" ref={messagesContainerRef} onScroll={handleMessageListScroll}>
              {filteredMessages.map((item, index) => {
                const isLastInterviewerMessage =
                  item.role === 'INTERVIEWER' &&
                  index === filteredMessages.length - 1 &&
                  item.status === 'ABORTED'

                const isInterviewerMessage = item.role === 'INTERVIEWER'
                let candidateAnswerFromHistory: string | undefined
                if (isInterviewerMessage) {
                  for (let i = index + 1; i < filteredMessages.length; i += 1) {
                    if (filteredMessages[i].role === 'CANDIDATE') {
                      candidateAnswerFromHistory = filteredMessages[i].content
                      break
                    }
                    if (filteredMessages[i].role === 'INTERVIEWER') break
                  }
                }

                return (
                  <div className={`interview-message interview-message--${item.role.toLowerCase()}`} key={item.id}>
                    <div className="interview-message__role">
                      <MessageOutlined />
                      {item.role === 'CANDIDATE' ? t('message.candidate') : t('message.interviewer')}
                      {item.status === 'ABORTED' ? (
                        <Tag color="warning" style={{ marginLeft: 8 }}>
                          {t('message.aborted')}
                        </Tag>
                      ) : null}
                    </div>
                    <div className="interview-message__bubble">
                      <MarkdownMessage content={item.content} />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {isInterviewerMessage ? (
                        <div className="interview-message__actions">
                          <Button
                            className="interview-ai-answer-button"
                            size="small"
                            onClick={() => setAiAnswerModal({
                              messageId: item.id,
                              questionContent: item.content,
                              candidateAnswerFromHistory,
                            })}
                          >
                            {t('message.aiAnswer')}
                          </Button>
                          {isLastInterviewerMessage && canMessage && !streaming ? (
                            <Button className="interview-regenerate-button" size="small" onClick={onRegenerate}>
                              {t('message.regenerate')}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {streaming && isViewingCurrentRound ? (
                <div className="interview-message interview-message--interviewer">
                  <div className="interview-message__role">
                    <MessageOutlined />
                    {t('message.interviewer')}
                  </div>
                  <div className="interview-message__bubble">
                    {streamingContent ? (
                      <MarkdownMessage content={streamingContent} streaming />
                    ) : (
                      <div className="interview-thinking-bubble">
                        <div className="interview-thinking-bubble__dots">
                          <div className="interview-thinking-bubble__dot" />
                          <div className="interview-thinking-bubble__dot" />
                          <div className="interview-thinking-bubble__dot" />
                        </div>
                        <span>{t('message.thinking')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {canMessage ? (
              <div className="interview-composer">
                <MarkdownComposer
                  value={messageDraft}
                  onChange={onUpdateMessageDraft}
                  onSubmit={onSubmitMessage}
                  placeholder={t('message.composerPlaceholder')}
                  disabled={false}
                  autoSize={{ minRows: INTERVIEW_COMPOSER_MIN_ROWS, maxRows: INTERVIEW_COMPOSER_MAX_ROWS }}
                />
                {streaming ? (
                  <Button danger icon={<StopOutlined />} onClick={onStopStreaming}>
                    {t('common:actions.stop')}
                  </Button>
                ) : (
                  <Button type="primary" icon={<SendOutlined />} loading={submittingMessage} onClick={onSubmitMessage}>
                    {t('message.sendAnswer')}
                  </Button>
                )}
              </div>
            ) : !isViewingCurrentRound ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                {t('message.viewingHistory')}
              </div>
            ) : (
              <div className="interview-composer">
                <MarkdownComposer
                  value={messageDraft}
                  onChange={onUpdateMessageDraft}
                  onSubmit={undefined}
                  placeholder={t('message.disabledPlaceholder')}
                  disabled
                  autoSize={{ minRows: INTERVIEW_COMPOSER_MIN_ROWS, maxRows: INTERVIEW_COMPOSER_MAX_ROWS }}
                />
                <Button type="primary" icon={<SendOutlined />} disabled>
                  {t('message.sendAnswer')}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {nextRoundLoading ? (
        <div className="interview-next-round-overlay">
          <Spin size="large" />
          <p>{t('detail.nextRoundOverlay')}</p>
        </div>
      ) : null}

      <ResponsiveModal
        title={t('report.modalTitle')}
        open={reportDrawerOpen}
        width="66%"
        onCancel={() => setReportDrawerOpen(false)}
        footer={null}
        destroyOnHidden
        className="interview-report-modal"
        mobileHeight="92vh"
      >
        <InterviewReportPanel
          interviewId={detail.id}
          interviewEnded={detail.status === 'ENDED'}
          reportStatus={detail.reportStatus}
          reportContent={detail.reportContent}
          onStatusChange={(newStatus, newContent) => {
            setDetail((prev) => (prev ? { ...prev, reportStatus: newStatus, reportContent: newContent } : prev))
            if (newStatus === 'READY') {
              void getInterview(detail.id).then(setDetail)
            }
          }}
        />
      </ResponsiveModal>

      {detail.targetCompany ? (
        <ResponsiveModal
          title={t('detail.targetCompanyLabel')}
          open={companyInfoOpen}
          onCancel={() => setCompanyInfoOpen(false)}
          footer={null}
          destroyOnHidden
          mobileHeight="66vh"
        >
          {companyInfoContent}
        </ResponsiveModal>
      ) : null}

      {aiAnswerModal ? (
        <AiAnswerModal
          key={aiAnswerModal.messageId}
          open={!!aiAnswerModal}
          onClose={() => setAiAnswerModal(null)}
          interviewId={detail.id}
          messageId={aiAnswerModal.messageId}
          questionContent={aiAnswerModal.questionContent}
          currentInputContent={messageDraft}
          candidateAnswerFromHistory={aiAnswerModal.candidateAnswerFromHistory}
        />
      ) : null}
    </div>
  )
}
