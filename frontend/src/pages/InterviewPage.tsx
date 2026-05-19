import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ProfileOutlined,
  SendOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
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
  submitInterviewMessage,
} from '../features/interview/api/interviewApi'
import { useInterviewTimer } from '../features/interview/hooks/useInterviewTimer'
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

const { Paragraph, Text, Title } = Typography
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
  const [messageDraft, setMessageDraft] = useState('')
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
    if (!detail) return
    const trimmed = messageDraft.trim()
    if (!trimmed) {
      void message.warning('请输入回答内容。')
      return
    }
    setSubmittingMessage(true)
    try {
      const next = await submitInterviewMessage(detail.id, trimmed)
      setDetail(next)
      setMessageDraft('')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '发送失败。')
    } finally {
      setSubmittingMessage(false)
    }
  }

  if (interviewId) {
    return (
      <InterviewDetailView
        detail={detail}
        loading={loadingDetail}
        messageDraft={messageDraft}
        onBack={() => navigate('/app/interviews')}
        onContinue={() => detail && void refreshAfterAction(() => continueInterview(detail.id), '面试已继续。')}
        onEnd={() => detail && void refreshAfterAction(() => endInterview(detail.id), '面试已结束。')}
        onLogout={onLogout}
        onNextRound={() => detail && void refreshAfterAction(() => nextInterviewRound(detail.id), '已进入下一轮面试。')}
        onSubmitMessage={() => void handleSubmitMessage()}
        onUpdateMessageDraft={setMessageDraft}
        submittingMessage={submittingMessage}
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
              <Button size="large" icon={<ArrowLeftOutlined />}>返回首页</Button>
            </Link>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              新建面试
            </Button>
            <Button size="large" onClick={onLogout}>锁定工作区</Button>
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
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
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
          </Space>
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
    </div>
  )
}

function InterviewDetailView({
  detail,
  loading,
  messageDraft,
  onBack,
  onContinue,
  onEnd,
  onLogout,
  onNextRound,
  onSubmitMessage,
  onUpdateMessageDraft,
  submittingMessage,
}: {
  detail: InterviewDetail | null
  loading: boolean
  messageDraft: string
  onBack: () => void
  onContinue: () => void
  onEnd: () => void
  onLogout: () => void
  onNextRound: () => void
  onSubmitMessage: () => void
  onUpdateMessageDraft: (value: string) => void
  submittingMessage: boolean
}) {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)
  const lastMessageCountRef = useRef(0)
  const { formatted: timerDisplay } = useInterviewTimer(detail?.status === 'IN_PROGRESS')

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
    const messageCount = detail?.messages.length ?? 0
    const hasNewMessage = messageCount > lastMessageCountRef.current
    lastMessageCountRef.current = messageCount

    if (!shouldAutoScrollRef.current) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom(hasNewMessage ? 'smooth' : 'auto')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [detail])

  useEffect(() => {
    shouldAutoScrollRef.current = true
    lastMessageCountRef.current = 0
    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom('auto')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [detail?.id])

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

  const canMessage = detail.status === 'IN_PROGRESS'
  const hasNextRound = detail.status === 'IN_PROGRESS' && detail.activeRoundIndex < detail.interviewerRoles.length - 1

  return (
    <div className="workspace-layout">
      <div className="interview-detail">
        <div className="interview-detail__topbar">
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回面试中心</Button>
            <Tag color={statusColor(detail.status)}>{interviewStatusLabel(detail.status)}</Tag>
            <Tag color="purple">{interviewReportStatusLabel(detail.reportStatus)}</Tag>
            {detail.resumeTitle ? <Tag icon={<ProfileOutlined />}>{detail.resumeTitle}</Tag> : null}
          </Space>
          <Space wrap>
            <Tag icon={<ClockCircleOutlined />} color="blue" style={{ fontSize: 14, padding: '4px 10px' }}>
              {timerDisplay}
            </Tag>
            {detail.status === 'PAUSED' ? (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={onContinue}>继续</Button>
            ) : null}
            {hasNextRound ? (
              <Button icon={<ArrowRightOutlined />} onClick={onNextRound}>下一轮面试官</Button>
            ) : null}
            {detail.status !== 'ENDED' ? (
              <Popconfirm title="确定结束面试？" onConfirm={onEnd} okText="结束" cancelText="取消">
                <Button danger icon={<PoweroffOutlined />}>结束面试</Button>
              </Popconfirm>
            ) : null}
            <Button onClick={onLogout}>锁定</Button>
          </Space>
        </div>

        <div className="interview-detail__layout">
          <Card className="glass-card interview-detail__main" bordered={false}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Title level={2}>{detail.title}</Title>
              <Space wrap>
                {detail.interviewerRoles.map((role, index) => (
                  <Tag icon={<TeamOutlined />} key={`${role}-${index}`}>
                    {index === detail.activeRoundIndex ? `当前第 ${index + 1} 轮 · ${role}` : `第 ${index + 1} 轮 · ${role}`}
                  </Tag>
                ))}
                <Tag>{interviewDifficultyLabel(detail.difficulty)}</Tag>
                <Text type="secondary">创建于 {new Date(detail.createdAt).toLocaleString()}</Text>
              </Space>
              <Paragraph className="interview-detail__jd">{detail.jobDescription}</Paragraph>
            </Space>

            <div className="interview-message-list" ref={messagesContainerRef} onScroll={handleMessageListScroll}>
              {detail.messages.map((item) => (
                <div className={`interview-message interview-message--${item.role.toLowerCase()}`} key={item.id}>
                  <div className="interview-message__role">
                    <MessageOutlined />
                    {item.role === 'CANDIDATE' ? '候选人' : '面试官'}
                  </div>
                  <div className="interview-message__bubble">
                    <p>{item.content}</p>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="interview-composer">
              <Input.TextArea
                rows={4}
                value={messageDraft}
                disabled={!canMessage}
                placeholder={canMessage ? '输入你的回答...' : '当前状态不能继续回答。'}
                onChange={(event) => onUpdateMessageDraft(event.target.value)}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submittingMessage}
                disabled={!canMessage}
                onClick={onSubmitMessage}
              >
                发送回答
              </Button>
            </div>
          </Card>

          <Card className="glass-card interview-report-panel" bordered={false}>
            <Title level={4}>面试报告</Title>
            {detail.reportStatus === 'READY' && detail.reportContent ? (
              <pre>{detail.reportContent}</pre>
            ) : (
              <Empty description="面试报告功能开发中，敬请期待。" />
            )}
          </Card>
        </div>
      </div>
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
