import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  continueInterview,
  createInterview,
  endInterview,
  getInterview,
  listInterviews,
  nextInterviewRound,
  regenerateStreamInterviewMessage,
  streamInterviewMessage,
} from '../features/interview/api/interviewApi'
import { FileTextOutlined } from '@ant-design/icons'
import { useInterviewTimer } from '../features/interview/hooks/useInterviewTimer'
import { InterviewReportPanel } from '../features/interview/components/InterviewReportPanel'
import { MarkdownMessage } from '../lib/markdown/MarkdownMessage'
import { MarkdownComposer } from '../lib/markdown/MarkdownComposer'
import {
  INTERVIEW_DIFFICULTY_OPTIONS,
  INTERVIEW_STATUS_OPTIONS,
  INTERVIEWER_ROLE_OPTIONS,
  interviewDifficultyLabel,
  interviewReportStatusLabel,
  interviewStatusLabel,
  type InterviewCreatePayload,
  type InterviewDetail,
  type InterviewDifficulty,
  type InterviewPage as InterviewPageData,
  type InterviewStatus,
} from '../features/interview/types'
import { listResumes } from '../features/resume/api/resumeApi'
import type { ResumeSummary } from '../features/resume/types'

const { Text } = Typography
const INTERVIEWS_PER_PAGE = 6

interface InterviewPageProps {
  onLogout: () => void
}

type CreateFormValues = {
  resumeId?: string
  title: string
  jobDescription?: string
  difficulty: InterviewDifficulty
  interviewerRoles: string[]
}

export function InterviewPage({ onLogout }: InterviewPageProps) {
  const navigate = useNavigate()
  const { interviewId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { message } = App.useApp()
  const [interviewPage, setInterviewPage] = useState<InterviewPageData | null>(null)
  const [detail, setDetail] = useState<InterviewDetail | null>(null)
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(Boolean(interviewId))
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1')
  const [submittingMessage, setSubmittingMessage] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [messageDraft, setMessageDraft] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const [form] = Form.useForm<CreateFormValues>()

  const page = Number(searchParams.get('page') ?? '1')
  const filterResumeId = searchParams.get('resumeId') ?? undefined
  const filterStatus = (searchParams.get('status') as InterviewStatus | null) ?? undefined
  const keyword = searchParams.get('keyword') ?? ''

  const resumeOptions = useMemo(
    () => resumes.map((resume) => ({ value: resume.id, label: resume.title })),
    [resumes],
  )

  const loadResumes = useCallback(async () => {
    try {
      const pageResult = await listResumes(false, 1, 100)
      setResumes(pageResult.items)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载简历选项。')
    }
  }, [message])

  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const result = await listInterviews({
        resumeId: filterResumeId,
        status: filterStatus,
        keyword,
        page,
        pageSize: INTERVIEWS_PER_PAGE,
      })
      setInterviewPage(result)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载面试列表。')
    } finally {
      setLoadingList(false)
    }
  }, [filterResumeId, filterStatus, keyword, message, page])

  const loadDetail = useCallback(async () => {
    if (!interviewId) {
      setDetail(null)
      setLoadingDetail(false)
      return
    }
    setLoadingDetail(true)
    try {
      setDetail(await getInterview(interviewId))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载面试详情。')
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [interviewId, message])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResumes()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadResumes])

  useEffect(() => {
    if (!interviewId) {
      const timeoutId = window.setTimeout(() => {
        void loadList()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [interviewId, loadList])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDetail()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadDetail])

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      const timeoutId = window.setTimeout(() => {
        setCreateOpen(true)
        form.setFieldsValue({
          resumeId: searchParams.get('resumeId') ?? undefined,
          difficulty: 'MEDIUM',
        })
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [form, searchParams])

  function updateSearch(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    setSearchParams(params)
  }

  function openCreateDrawer() {
    form.setFieldsValue({
      resumeId: filterResumeId,
      difficulty: 'MEDIUM',
    })
    setCreateOpen(true)
  }

  function closeCreateDrawer() {
    setCreateOpen(false)
    updateSearch({ create: undefined })
  }

  async function handleCreate(values: CreateFormValues) {
    setCreating(true)
    try {
      const payload: InterviewCreatePayload = {
        resumeId: values.resumeId || null,
        title: values.title.trim(),
        jobDescription: values.jobDescription?.trim() || null,
        difficulty: values.difficulty,
        interviewerRoles: values.interviewerRoles.map((role) => role.trim()).filter(Boolean),
      }
      const created = await createInterview(payload)
      void message.success('面试已开始。')
      setCreateOpen(false)
      form.resetFields()
      navigate(`/app/interviews/${created.id}`)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '创建面试失败。')
    } finally {
      setCreating(false)
    }
  }

  async function refreshAfterAction(action: () => Promise<InterviewDetail>, successText: string) {
    try {
      const next = await action()
      setDetail(next)
      void message.success(successText)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '操作失败。')
    }
  }

  async function handleSubmitMessage() {
    if (!detail || streaming) return
    const trimmed = messageDraft.trim()
    if (!trimmed) {
      void message.warning('请输入回答内容。')
      return
    }
    setSubmittingMessage(true)
    setStreaming(true)
    setStreamingContent('')
    setMessageDraft('')

    const optimisticCandidate = {
      id: `temp-${Date.now()}`,
      role: 'CANDIDATE' as const,
      content: trimmed,
      sortOrder: (detail.messages.at(-1)?.sortOrder ?? 0) + 1,
      roundIndex: detail.activeRoundIndex,
      createdAt: new Date().toISOString(),
    }
    setDetail((prev) => prev ? { ...prev, messages: [...prev.messages, optimisticCandidate] } : prev)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await streamInterviewMessage(detail.id, trimmed, (event) => {
        if (event.type === 'message' && event.content) {
          setStreamingContent((prev) => prev + event.content)
        }
      }, { signal: controller.signal })
      const refreshed = await getInterview(detail.id)
      setDetail(refreshed)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const refreshed = await getInterview(detail.id)
        setDetail(refreshed)
      } else {
        void message.error(error instanceof Error ? error.message : '发送失败。')
        setDetail((prev) => {
          if (!prev) return prev
          return { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticCandidate.id) }
        })
      }
    } finally {
      abortControllerRef.current = null
      setSubmittingMessage(false)
      setStreaming(false)
      setStreamingContent('')
    }
  }

  function handleStopStreaming() {
    abortControllerRef.current?.abort()
  }

  async function handleRegenerate() {
    if (!detail || streaming) return
    setStreaming(true)
    setStreamingContent('')

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await regenerateStreamInterviewMessage(detail.id, (event) => {
        if (event.type === 'message' && event.content) {
          setStreamingContent((prev) => prev + event.content)
        }
      }, { signal: controller.signal })
      const refreshed = await getInterview(detail.id)
      setDetail(refreshed)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const refreshed = await getInterview(detail.id)
        setDetail(refreshed)
      } else {
        void message.error(error instanceof Error ? error.message : '重新生成失败。')
      }
    } finally {
      abortControllerRef.current = null
      setStreaming(false)
      setStreamingContent('')
    }
  }

  if (interviewId) {
    return (
      <InterviewDetailView
        detail={detail}
        loading={loadingDetail}
        messageDraft={messageDraft}
        streaming={streaming}
        streamingContent={streamingContent}
        onBack={() => navigate('/app/interviews')}
        onContinue={() => detail && void refreshAfterAction(() => continueInterview(detail.id), '面试已继续。')}
        onEnd={() => detail && void refreshAfterAction(() => endInterview(detail.id), '面试已结束。')}
        onLogout={onLogout}
        onNextRound={() => detail ? refreshAfterAction(() => nextInterviewRound(detail.id), '已进入下一轮面试。') : Promise.resolve()}
        onSubmitMessage={() => void handleSubmitMessage()}
        onStopStreaming={handleStopStreaming}
        onRegenerate={() => void handleRegenerate()}
        onUpdateMessageDraft={setMessageDraft}
        submittingMessage={submittingMessage}
        setDetail={setDetail}
      />
    )
  }

  return (
    <div className="workspace-layout">
      <div className="interview-center">
        <div className="workspace-hub__hero">
          <div className="workspace-hub__copy">
            <Tag color="blue">Interview Center</Tag>
            <h1>面试中心</h1>
            <p>创建不绑定或绑定简历的模拟面试，暂停后可继续，结束后可回看内容和报告。</p>
          </div>

          <div className="workspace-hub__actions">
            <Link to="/app">
              <Button icon={<ArrowLeftOutlined />}>返回首页</Button>
            </Link>
            <Button icon={<PlusOutlined />} onClick={openCreateDrawer}>
              新建面试
            </Button>
          </div>
        </div>

        <Card className="glass-card interview-filter-card" bordered={false}>
          <Space wrap align="center">
            <Input.Search
              allowClear
              placeholder="搜索标题或 JD"
              defaultValue={keyword}
              onSearch={(value) => updateSearch({ keyword: value.trim() || undefined, page: '1' })}
              style={{ width: 260 }}
            />
            <Select
              allowClear
              placeholder="关联简历"
              value={filterResumeId}
              options={resumeOptions}
              onChange={(value?: string) => updateSearch({ resumeId: value, page: '1' })}
              style={{ width: 220 }}
            />
            <Select
              allowClear
              placeholder="面试状态"
              value={filterStatus}
              options={INTERVIEW_STATUS_OPTIONS}
              onChange={(value?: InterviewStatus) => updateSearch({ status: value, page: '1' })}
              style={{ width: 160 }}
            />
          </Space>
        </Card>

        {loadingList ? (
          <div className="workspace-loading-state">
            <Spin size="large" />
          </div>
        ) : !interviewPage || interviewPage.items.length === 0 ? (
          <Card className="glass-card workspace-hub__empty" bordered={false}>
            <Empty description="还没有面试记录。" />
          </Card>
        ) : (
          <>
            <div className="interview-card-grid">
              {interviewPage.items.map((item) => (
                <button
                  className="interview-card"
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/app/interviews/${item.id}`)}
                >
                  <div className="interview-card__head">
                    <Tag color={statusColor(item.status)}>{interviewStatusLabel(item.status)}</Tag>
                    <Tag color="purple">{interviewReportStatusLabel(item.reportStatus)}</Tag>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.jobDescription}</p>
                  <div className="interview-card__meta">
                    <span>{interviewDifficultyLabel(item.difficulty)}</span>
                    <span>{`第 ${Math.min(item.activeRoundIndex + 1, item.interviewerRoles.length)} 轮`}</span>
                    <span>{item.interviewerRoles.join(' / ')}</span>
                    <span>{item.resumeTitle ?? '未绑定简历'}</span>
                  </div>
                  <Text type="secondary">更新于 {new Date(item.updatedAt).toLocaleString()}</Text>
                </button>
              ))}
            </div>
            {interviewPage.totalPages > 1 ? (
              <div className="resume-list-pagination">
                <Pagination
                  current={interviewPage.page}
                  pageSize={INTERVIEWS_PER_PAGE}
                  total={interviewPage.total}
                  showSizeChanger={false}
                  onChange={(nextPage) => updateSearch({ page: String(nextPage) })}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <Drawer
        title="开始新面试"
        open={createOpen}
        width={520}
        onClose={closeCreateDrawer}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ difficulty: 'MEDIUM', resumeId: filterResumeId }}
          onFinish={(values) => void handleCreate(values)}
        >
          <Form.Item
            name="resumeId"
            label="关联简历（可选）"
            rules={[
              {
                validator: (_, value) => {
                  if (value || form.getFieldValue('jobDescription')?.trim()) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('简历和 JD 至少填写一个'))
                },
              },
            ]}
          >
            <Select allowClear placeholder="选择简历" options={resumeOptions} />
          </Form.Item>
          <Form.Item name="title" label="面试标题" rules={[{ required: true, message: '请输入面试标题' }]}>
            <Input maxLength={200} placeholder="例如：Java 后端 Leader 面" />
          </Form.Item>
          <Form.Item
            name="jobDescription"
            label="面试 JD（可选）"
            rules={[
              {
                validator: (_, value) => {
                  if (value?.trim() || form.getFieldValue('resumeId')) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('简历和 JD 至少填写一个'))
                },
              },
            ]}
          >
            <Input.TextArea rows={8} placeholder="粘贴或输入岗位 JD、职责和要求（不填则纯基于简历出题）" />
          </Form.Item>
          <Form.Item name="difficulty" label="面试难度" rules={[{ required: true, message: '请选择面试难度' }]}>
            <Select options={INTERVIEW_DIFFICULTY_OPTIONS} />
          </Form.Item>
          <Form.Item name="interviewerRoles" label="面试官" rules={[{ required: true, message: '请选择或输入至少一个面试官角色' }]}>
            <Select
              mode="tags"
              placeholder="选择或输入一个或多个角色"
              options={INTERVIEWER_ROLE_OPTIONS.map((role) => ({ value: role, label: role }))}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={creating} icon={<PlayCircleOutlined />}>
              开始面试
            </Button>
            <Button onClick={closeCreateDrawer}>取消</Button>
          </Space>
        </Form>
      </Drawer>

      {creating && (
        <div className="interview-creating-overlay">
          <Spin size="large" />
          <p>AI 正在准备面试题目，请稍候...</p>
        </div>
      )}
    </div>
  )
}

function InterviewDetailView({
  detail,
  loading,
  messageDraft,
  streaming,
  streamingContent,
  onBack,
  onContinue,
  onEnd,
  onLogout,
  onNextRound,
  onSubmitMessage,
  onStopStreaming,
  onRegenerate,
  onUpdateMessageDraft,
  submittingMessage,
  setDetail,
}: {
  detail: InterviewDetail | null
  loading: boolean
  messageDraft: string
  streaming: boolean
  streamingContent: string
  onBack: () => void
  onContinue: () => void
  onEnd: () => void
  onLogout: () => void
  onNextRound: () => Promise<void>
  onSubmitMessage: () => void
  onStopStreaming: () => void
  onRegenerate: () => void
  onUpdateMessageDraft: (value: string) => void
  submittingMessage: boolean
  setDetail: React.Dispatch<React.SetStateAction<InterviewDetail | null>>
}) {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)
  const lastMessageCountRef = useRef(0)
  const { formatted: timerDisplay } = useInterviewTimer(detail?.status === 'IN_PROGRESS')
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false)
  const [activeRoundTab, setActiveRoundTab] = useState<number>(detail?.activeRoundIndex ?? 0)
  const [nextRoundLoading, setNextRoundLoading] = useState(false)

  useEffect(() => {
    if (detail) {
      setActiveRoundTab(detail.activeRoundIndex)
    }
  }, [detail?.activeRoundIndex])

  const isViewingCurrentRound = detail ? activeRoundTab === detail.activeRoundIndex : true

  const filteredMessages = useMemo(() => {
    if (!detail) return []
    return detail.messages.filter((msg) => msg.roundIndex === activeRoundTab)
  }, [detail, activeRoundTab])

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
  }, [detail?.id, activeRoundTab])

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
      await onNextRound()
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
          <Empty description="没有找到这场面试。" />
          <Button type="primary" onClick={onBack}>返回面试中心</Button>
        </Card>
      </div>
    )
  }

  const canMessage = detail.status === 'IN_PROGRESS' && isViewingCurrentRound
  const hasNextRound = detail.status === 'IN_PROGRESS' && detail.activeRoundIndex < detail.interviewerRoles.length - 1

  return (
    <div className="workspace-layout">
      <div className="interview-detail">
        <div className="interview-detail__topbar">
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack} />
            <strong style={{ fontSize: 16 }}>{detail.title}</strong>
            <Tag color="blue">第 {detail.activeRoundIndex + 1} / {detail.interviewerRoles.length} 轮</Tag>
            <Tag color={difficultyColor(detail.difficulty)}>{interviewDifficultyLabel(detail.difficulty)}</Tag>
          </Space>
          <Space align="center">
            <Tag icon={<ClockCircleOutlined />} color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
              {timerDisplay}
            </Tag>
            {detail.status === 'PAUSED' ? (
              <Button type="text" icon={<PlayCircleOutlined />} title="继续面试" onClick={onContinue} />
            ) : null}
            {hasNextRound ? (
              <Button
                type="primary"
                ghost
                icon={<ArrowRightOutlined />}
                title="下一轮面试官"
                onClick={() => void handleNextRound()}
              >
                下一轮
              </Button>
            ) : null}
            {detail.status !== 'ENDED' ? (
              <Popconfirm title="确定结束面试？" onConfirm={onEnd} okText="结束" cancelText="取消">
                <Button type="primary" ghost danger icon={<PoweroffOutlined />} title="结束面试">
                  结束
                </Button>
              </Popconfirm>
            ) : null}
            {(detail.status === 'ENDED' || detail.reportStatus === 'READY' || detail.reportStatus === 'GENERATING' || detail.reportStatus === 'FAILED') && (
              <Button
                icon={<FileTextOutlined />}
                onClick={() => setReportDrawerOpen(true)}
              >
                查看报告
              </Button>
            )}
          </Space>
        </div>

        <div className="interview-round-tabs" role="tablist">
          {detail.interviewerRoles.map((role, index) => (
            <button
              key={`round-${index}`}
              role="tab"
              aria-selected={activeRoundTab === index}
              className={`interview-round-tab${activeRoundTab === index ? ' interview-round-tab--active' : ''}`}
              onClick={() => setActiveRoundTab(index)}
            >
              第 {index + 1} 轮 · {role}
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
                return (
                  <div className={`interview-message interview-message--${item.role.toLowerCase()}`} key={item.id}>
                    <div className="interview-message__role">
                      <MessageOutlined />
                      {item.role === 'CANDIDATE' ? '候选人' : '面试官'}
                      {item.status === 'ABORTED' ? (
                        <Tag color="warning" style={{ marginLeft: 8 }}>回复中断</Tag>
                      ) : null}
                    </div>
                    <div className="interview-message__bubble">
                      <MarkdownMessage content={item.content} />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {isLastInterviewerMessage && canMessage && !streaming ? (
                        <div style={{ marginTop: 8 }}>
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={onRegenerate}
                          >
                            重新生成
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {streaming && isViewingCurrentRound && (
                <div className="interview-message interview-message--interviewer">
                  <div className="interview-message__role">
                    <MessageOutlined />
                    面试官
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
                        <span>思考中...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {canMessage ? (
              <div className="interview-composer">
                <MarkdownComposer
                  value={messageDraft}
                  onChange={onUpdateMessageDraft}
                  onSubmit={onSubmitMessage}
                  placeholder="输入你的回答..."
                  disabled={false}
                  autoSize={{ minRows: 3, maxRows: 8 }}
                />
                {streaming ? (
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={onStopStreaming}
                  >
                    停止
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={submittingMessage}
                    onClick={onSubmitMessage}
                  >
                    发送回答
                  </Button>
                )}
              </div>
            ) : !isViewingCurrentRound ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                正在查看历史轮次（只读）
              </div>
            ) : (
              <div className="interview-composer">
                <MarkdownComposer
                  value={messageDraft}
                  onChange={onUpdateMessageDraft}
                  onSubmit={undefined}
                  placeholder="当前状态不能继续回答。"
                  disabled
                  autoSize={{ minRows: 3, maxRows: 8 }}
                />
                <Button type="primary" icon={<SendOutlined />} disabled>
                  发送回答
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {nextRoundLoading && (
        <div className="interview-next-round-overlay">
          <Spin size="large" />
          <p>AI 面试官准备中...</p>
        </div>
      )}

      <Modal
        title="面试报告"
        open={reportDrawerOpen}
        width="66%"
        onCancel={() => setReportDrawerOpen(false)}
        footer={null}
        destroyOnHidden
        className="interview-report-modal"
      >
        {detail && (
          <InterviewReportPanel
            interviewId={detail.id}
            interviewEnded={detail.status === 'ENDED'}
            reportStatus={detail.reportStatus}
            reportContent={detail.reportContent}
            onStatusChange={(newStatus, newContent) => {
              setDetail((prev) =>
                prev ? { ...prev, reportStatus: newStatus, reportContent: newContent } : prev,
              )
              if (newStatus === 'READY' && detail) {
                void getInterview(detail.id).then(setDetail)
              }
            }}
          />
        )}
      </Modal>
    </div>
  )
}

function statusColor(status: InterviewStatus) {
  switch (status) {
    case 'ENDED':
      return 'default'
    case 'PAUSED':
      return 'orange'
    default:
      return 'green'
  }
}

function difficultyColor(difficulty: InterviewDifficulty) {
  switch (difficulty) {
    case 'EASY':
      return 'green'
    case 'HARD':
      return 'gold'
    default:
      return 'orange'
  }
}
