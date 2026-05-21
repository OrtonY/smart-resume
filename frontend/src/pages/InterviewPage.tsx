import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  MessageOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PoweroffOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Popover,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  type Dispatch,
  type SetStateAction,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  continueInterview,
  createInterview,
  endInterview,
  getInterview,
  listInterviews,
  nextInterviewRound,
  pauseInterview,
  regenerateStreamInterviewMessage,
  streamInterviewMessage,
} from '../features/interview/api/interviewApi'
import { InterviewReportPanel } from '../features/interview/components/InterviewReportPanel'
import { InterviewerRoleSorter } from '../features/interview/components/InterviewerRoleSorter'
import { useInterviewTimer } from '../features/interview/hooks/useInterviewTimer'
import {
  companyContextStatusLabel,
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
import { MarkdownComposer } from '../lib/markdown/MarkdownComposer'
import { MarkdownMessage } from '../lib/markdown/MarkdownMessage'

const { Text } = Typography
const INTERVIEWS_PER_PAGE = 6

interface InterviewPageProps {
  onLogout: () => void
}

type CreateFormValues = {
  resumeId?: string
  targetCompany?: string
  title: string
  jobDescription?: string
  difficulty: InterviewDifficulty
  interviewerRoles: string[]
}

export function InterviewPage({ onLogout }: InterviewPageProps) {
  void onLogout

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
  const autoContinueInterviewIdRef = useRef<string | null>(null)
  const skipAutoContinueAfterPauseRef = useRef<string | null>(null)

  const [form] = Form.useForm<CreateFormValues>()
  const selectedInterviewerRoles = Form.useWatch('interviewerRoles', form) ?? []

  const page = Number(searchParams.get('page') ?? '1')
  const filterResumeId = searchParams.get('resumeId') ?? undefined
  const filterStatus = (searchParams.get('status') as InterviewStatus | null) ?? undefined
  const filterTargetCompany = searchParams.get('targetCompany') ?? ''
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
        targetCompany: filterTargetCompany || undefined,
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
  }, [filterResumeId, filterStatus, filterTargetCompany, keyword, message, page])

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
    if (!interviewId) {
      autoContinueInterviewIdRef.current = null
      skipAutoContinueAfterPauseRef.current = null
    }
  }, [interviewId])

  useEffect(() => {
    if (searchParams.get('create') !== '1') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCreateOpen(true)
      form.setFieldsValue({
        resumeId: searchParams.get('resumeId') ?? undefined,
        targetCompany: undefined,
        difficulty: 'MEDIUM',
        interviewerRoles: [],
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
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

  function openCreateModal() {
    form.setFieldsValue({
      resumeId: filterResumeId,
      targetCompany: undefined,
      difficulty: 'MEDIUM',
      interviewerRoles: [],
    })
    setCreateOpen(true)
    updateSearch({ create: '1' })
  }

  function closeCreateModal() {
    setCreateOpen(false)
    form.resetFields()
    updateSearch({ create: undefined })
  }

  async function handleCreate(values: CreateFormValues) {
    setCreating(true)
    try {
      const payload: InterviewCreatePayload = {
        resumeId: values.resumeId || null,
        targetCompany: values.targetCompany?.trim() || null,
        title: values.title.trim(),
        jobDescription: values.jobDescription?.trim() || null,
        difficulty: values.difficulty,
        interviewerRoles: values.interviewerRoles.map((role) => role.trim()).filter(Boolean),
      }
      const created = await createInterview(payload)

      if (payload.targetCompany && created.companyContextStatus === 'FAILED') {
        void message.warning('面试已开始，但目标公司的信息提炼失败，本场会按普通面试继续。')
      } else {
        void message.success('面试已开始。')
      }

      setCreateOpen(false)
      form.resetFields()
      updateSearch({ create: undefined })
      navigate(`/app/interviews/${created.id}`)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '创建面试失败。')
    } finally {
      setCreating(false)
    }
  }

  const refreshAfterAction = useCallback(
    async (action: () => Promise<InterviewDetail>, successText: string) => {
      try {
        const next = await action()
        setDetail(next)
        void message.success(successText)
        return next
      } catch (error) {
        void message.error(error instanceof Error ? error.message : '操作失败。')
        return null
      }
    },
    [message],
  )

  useEffect(() => {
    if (!detail || loadingDetail || detail.status !== 'PAUSED') {
      return
    }
    if (skipAutoContinueAfterPauseRef.current === detail.id) {
      return
    }
    if (autoContinueInterviewIdRef.current === detail.id) {
      return
    }

    autoContinueInterviewIdRef.current = detail.id
    void refreshAfterAction(
      () => continueInterview(detail.id),
      '面试已自动继续。',
    ).then((updated) => {
      if (!updated) {
        autoContinueInterviewIdRef.current = null
      }
    })
  }, [detail, loadingDetail, refreshAfterAction])

  async function handleSubmitMessage() {
    if (!detail || streaming) {
      return
    }

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
    setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, optimisticCandidate] } : prev))

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await streamInterviewMessage(
        detail.id,
        trimmed,
        (event) => {
          if (event.type === 'message' && event.content) {
            setStreamingContent((prev) => prev + event.content)
          }
        },
        { signal: controller.signal },
      )
      setDetail(await getInterview(detail.id))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setDetail(await getInterview(detail.id))
      } else {
        void message.error(error instanceof Error ? error.message : '发送失败。')
        setDetail((prev) => {
          if (!prev) {
            return prev
          }
          return { ...prev, messages: prev.messages.filter((item) => item.id !== optimisticCandidate.id) }
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
    if (!detail || streaming) {
      return
    }

    setStreaming(true)
    setStreamingContent('')
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await regenerateStreamInterviewMessage(
        detail.id,
        (event) => {
          if (event.type === 'message' && event.content) {
            setStreamingContent((prev) => prev + event.content)
          }
        },
        { signal: controller.signal },
      )
      setDetail(await getInterview(detail.id))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setDetail(await getInterview(detail.id))
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
        key={detail?.id ?? 'loading'}
        detail={detail}
        loading={loadingDetail}
        messageDraft={messageDraft}
        streaming={streaming}
        streamingContent={streamingContent}
        onBack={() => navigate('/app/interviews')}
        onPause={() => {
          if (!detail) {
            return
          }
          skipAutoContinueAfterPauseRef.current = detail.id
          void refreshAfterAction(
            () => pauseInterview(detail.id),
            '面试已暂停。',
          ).then(() => navigate('/app/interviews'))
        }}
        onContinue={() => detail && void refreshAfterAction(() => continueInterview(detail.id), '面试已继续。')}
        onEnd={() =>
          detail &&
          void refreshAfterAction(
            () => endInterview(detail.id),
            '面试已结束，报告正在生成，请稍后查看。',
          ).then((updated) => {
            if (updated) {
              navigate('/app/interviews')
            }
          })
        }
        onNextRound={() =>
          detail ? refreshAfterAction(() => nextInterviewRound(detail.id), '已进入下一轮面试。') : Promise.resolve(null)
        }
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
            <p>创建与简历绑定或不绑定的模拟面试，暂停后可继续，结束后可回看完整过程和分析报告。</p>
          </div>

          <div className="workspace-hub__actions">
            <Link to="/app">
              <Button icon={<ArrowLeftOutlined />}>返回首页</Button>
            </Link>
            <Button icon={<PlusOutlined />} onClick={openCreateModal}>
              新建面试
            </Button>
          </div>
        </div>

        <Card className="glass-card interview-filter-card" bordered={false}>
          <Space wrap align="center">
            <Input.Search
              key={`keyword-${keyword}`}
              allowClear
              placeholder="搜索标题或 JD"
              defaultValue={keyword}
              onSearch={(value) => updateSearch({ keyword: value.trim() || undefined, page: '1' })}
              style={{ width: 260 }}
            />
            <Input.Search
              key={`company-${filterTargetCompany}`}
              allowClear
              placeholder="筛选目标公司"
              defaultValue={filterTargetCompany}
              onSearch={(value) => updateSearch({ targetCompany: value.trim() || undefined, page: '1' })}
              style={{ width: 220 }}
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
                  {item.targetCompany ? (
                    <div className="interview-card__company">
                      <Tag color="gold">{item.targetCompany}</Tag>
                      <Tag color={companyContextColor(item.companyContextStatus)}>
                        {companyContextStatusLabel(item.companyContextStatus)}
                      </Tag>
                    </div>
                  ) : null}
                  <p>{item.jobDescription || '未提供岗位 JD，将主要依据简历和角色设定出题。'}</p>
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

      <Modal
        title="新建面试"
        open={createOpen}
        centered
        width={720}
        className="interview-create-modal"
        footer={null}
        onCancel={closeCreateModal}
        destroyOnHidden
      >
        <div className="interview-create-modal__body">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ difficulty: 'MEDIUM', resumeId: filterResumeId, interviewerRoles: [] }}
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
                    return Promise.reject(new Error('简历和 JD 至少填写一个。'))
                  },
                },
              ]}
            >
              <Select allowClear placeholder="选择简历" options={resumeOptions} />
            </Form.Item>

            <Form.Item name="title" label="面试标题" rules={[{ required: true, message: '请输入面试标题。' }]}>
              <Input maxLength={200} placeholder="例如：Java 后端 Leader 面" />
            </Form.Item>

            <Form.Item
              name="targetCompany"
              label="目标公司（可选）"
              extra="仅在创建时调用 AI 提炼该公司的业务和特点，后续面试直接复用这些信息。"
            >
              <Input maxLength={200} placeholder="例如：字节跳动、阿里云、腾讯云" />
            </Form.Item>

            <Form.Item
              name="jobDescription"
              label="岗位 JD（可选）"
              rules={[
                {
                  validator: (_, value) => {
                    if (value?.trim() || form.getFieldValue('resumeId')) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('简历和 JD 至少填写一个。'))
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={8}
                placeholder="粘贴或输入岗位职责、任职要求。若不填写，则主要基于简历和面试官角色出题。"
              />
            </Form.Item>

            <Form.Item name="difficulty" label="面试难度" rules={[{ required: true, message: '请选择面试难度。' }]}>
              <Select options={INTERVIEW_DIFFICULTY_OPTIONS} />
            </Form.Item>

            <Form.Item
              name="interviewerRoles"
              label="面试官"
              rules={[{ required: true, message: '请至少选择一位面试官角色。' }]}
            >
              <Select
                mode="tags"
                placeholder="选择或输入一个或多个角色"
                options={INTERVIEWER_ROLE_OPTIONS.map((role) => ({ value: role, label: role }))}
              />
            </Form.Item>

            <div className="interview-create-modal__tips">
              <Tag color="blue">支持拖拽排序</Tag>
              <Tag color="default">首位角色会最先开始</Tag>
              <Tag color="gold">可混合预设角色和自定义角色</Tag>
            </div>

            <InterviewerRoleSorter
              roles={selectedInterviewerRoles}
              onChange={(roles) => form.setFieldValue('interviewerRoles', roles)}
            />

            <Space style={{ marginTop: 20 }}>
              <Button type="primary" htmlType="submit" loading={creating} icon={<PlayCircleOutlined />}>
                开始面试
              </Button>
              <Button onClick={closeCreateModal}>取消</Button>
            </Space>
          </Form>
        </div>
      </Modal>

      {creating ? (
        <div className="interview-creating-overlay">
          <Spin size="large" />
          <p>AI 正在准备面试题目和公司背景，请稍候...</p>
        </div>
      ) : null}
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
  onPause,
  onContinue,
  onEnd,
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
  onPause: () => void
  onContinue: () => void
  onEnd: () => void
  onNextRound: () => Promise<InterviewDetail | null>
  onSubmitMessage: () => void
  onStopStreaming: () => void
  onRegenerate: () => void
  onUpdateMessageDraft: (value: string) => void
  submittingMessage: boolean
  setDetail: Dispatch<SetStateAction<InterviewDetail | null>>
}) {
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
  const [activeRoundTab, setActiveRoundTab] = useState<number>(detail?.activeRoundIndex ?? 0)
  const [nextRoundLoading, setNextRoundLoading] = useState(false)
  const safeActiveRoundTab = detail ? Math.min(activeRoundTab, Math.max(detail.interviewerRoles.length - 1, 0)) : 0
  const isViewingCurrentRound = detail ? safeActiveRoundTab === detail.activeRoundIndex : true

  const filteredMessages = useMemo(() => {
    if (!detail) {
      return []
    }
    return detail.messages.filter((messageItem) => messageItem.roundIndex === safeActiveRoundTab)
  }, [detail, safeActiveRoundTab])

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
          <Empty description="没有找到这场面试。" />
          <Button type="primary" onClick={onBack}>
            返回面试中心
          </Button>
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
            <strong style={{ fontSize: 16 }}>{detail.title}</strong>
            <Tag color="blue">{`第 ${detail.activeRoundIndex + 1} / ${detail.interviewerRoles.length} 轮`}</Tag>
            <Tag color={difficultyColor(detail.difficulty)}>{interviewDifficultyLabel(detail.difficulty)}</Tag>
            {detail.targetCompany ? (
              <Popover
                trigger="hover"
                placement="bottomLeft"
                overlayClassName="interview-company-popover"
                content={
                  <div className="interview-company-popover__content">
                    <div className="interview-company-popover__head">
                      <span>目标公司</span>
                      <strong>{detail.targetCompany}</strong>
                      <Tag color={companyContextColor(detail.companyContextStatus)}>
                        {companyContextStatusLabel(detail.companyContextStatus)}
                      </Tag>
                    </div>
                    {detail.companyContextSummary.length > 0 ? (
                      <ul className="interview-company-popover__summary">
                        {detail.companyContextSummary.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="interview-company-popover__empty">
                        未提炼到可复用的公司背景，本场面试将主要依据简历、JD 和面试官角色进行。
                      </p>
                    )}
                  </div>
                }
              >
                <button
                  type="button"
                  className="interview-company-chip"
                  aria-label={`查看 ${detail.targetCompany} 的公司信息`}
                >
                  <span className="interview-company-chip__label">目标公司</span>
                  <strong>{detail.targetCompany}</strong>
                  <span className="interview-company-chip__hint">
                    <EyeOutlined />
                    悬停查看画像
                  </span>
                </button>
              </Popover>
            ) : null}
          </Space>

          <Space align="center">
            <Tag icon={<ClockCircleOutlined />} color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
              {timerDisplay}
            </Tag>
            {detail.status === 'PAUSED' ? <Button onClick={onContinue}>继续面试</Button> : null}
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
            {detail.status === 'IN_PROGRESS' ? (
              <Button icon={<PauseCircleOutlined />} title="暂停面试" onClick={onPause}>
                暂停
              </Button>
            ) : null}
            {detail.status !== 'ENDED' ? (
              <Popconfirm title="确定结束面试？" onConfirm={onEnd} okText="结束" cancelText="取消">
                <Button type="primary" ghost danger icon={<PoweroffOutlined />} title="结束面试">
                  结束
                </Button>
              </Popconfirm>
            ) : null}
            {detail.status === 'ENDED' ||
            detail.reportStatus === 'READY' ||
            detail.reportStatus === 'GENERATING' ||
            detail.reportStatus === 'FAILED' ? (
              <Button icon={<FileTextOutlined />} onClick={() => setReportDrawerOpen(true)}>
                查看报告
              </Button>
            ) : null}
            {detail.status === 'ENDED' ? (
              <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
                返回面试中心
              </Button>
            ) : null}
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
              {`第 ${index + 1} 轮 · ${role}`}
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
                        <Tag color="warning" style={{ marginLeft: 8 }}>
                          回复中断
                        </Tag>
                      ) : null}
                    </div>
                    <div className="interview-message__bubble">
                      <MarkdownMessage content={item.content} />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {isLastInterviewerMessage && canMessage && !streaming ? (
                        <div className="interview-message__actions">
                          <Button className="interview-regenerate-button" size="small" onClick={onRegenerate}>
                            重新生成
                          </Button>
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
              ) : null}
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
                  <Button danger icon={<StopOutlined />} onClick={onStopStreaming}>
                    停止
                  </Button>
                ) : (
                  <Button type="primary" icon={<SendOutlined />} loading={submittingMessage} onClick={onSubmitMessage}>
                    发送回答
                  </Button>
                )}
              </div>
            ) : !isViewingCurrentRound ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                当前正在查看历史轮次，只读模式
              </div>
            ) : (
              <div className="interview-composer">
                <MarkdownComposer
                  value={messageDraft}
                  onChange={onUpdateMessageDraft}
                  onSubmit={undefined}
                  placeholder="当前状态下无法继续作答。"
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

      {nextRoundLoading ? (
        <div className="interview-next-round-overlay">
          <Spin size="large" />
          <p>AI 面试官准备中...</p>
        </div>
      ) : null}

      <Modal
        title="面试报告"
        open={reportDrawerOpen}
        width="66%"
        onCancel={() => setReportDrawerOpen(false)}
        footer={null}
        destroyOnHidden
        className="interview-report-modal"
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

function companyContextColor(status: InterviewDetail['companyContextStatus']) {
  switch (status) {
    case 'READY':
      return 'green'
    case 'FAILED':
      return 'orange'
    default:
      return 'default'
  }
}
