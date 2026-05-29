import { App, Form, Spin } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  continueInterview,
  createInterview,
  deleteInterview,
  endInterview,
  getInterview,
  listInterviews,
  nextInterviewRound,
  pauseInterview,
  regenerateStreamInterviewMessage,
  streamInterviewMessage,
} from '../features/interview/api/interviewApi'
import { InterviewCenterView } from '../features/interview/components/InterviewCenterView'
import { InterviewCreateModal } from '../features/interview/components/InterviewCreateModal'
import { InterviewDetailView } from '../features/interview/components/InterviewDetailView'
import {
  type InterviewCreatePayload,
  type InterviewDetail,
  type InterviewPage as InterviewPageData,
  type InterviewStatus,
} from '../features/interview/types'
import { INTERVIEWS_PER_PAGE, type CreateFormValues } from '../features/interview/interviewPageUtils'
import { listResumes } from '../features/resume/api/resumeApi'
import type { ResumeSummary } from '../features/resume/types'

interface InterviewPageProps {
  onLogout: () => void
}

export function InterviewPage({ onLogout }: InterviewPageProps) {
  void onLogout

  const { t } = useTranslation('interview')
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
  const deletingInterviewIdsRef = useRef(new Set<string>())

  const [form] = Form.useForm<CreateFormValues>()
  const selectedInterviewerRoles = Form.useWatch('interviewerRoles', form) ?? []

  const page = Number(searchParams.get('page') ?? '1')
  const filterResumeId = searchParams.get('resumeId') ?? undefined
  const filterStatus = (searchParams.get('status') as InterviewStatus | null) ?? undefined
  const filterTargetCompany = searchParams.get('targetCompany') ?? ''
  const keyword = searchParams.get('keyword') ?? ''

  const resumeOptions = useMemo(() => resumes.map((resume) => ({ value: resume.id, label: resume.title })), [resumes])

  const loadResumes = useCallback(async () => {
    try {
      const pageResult = await listResumes(false, 1, 100)
      setResumes(pageResult.items)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.loadResumeFailed'))
    }
  }, [message, t])

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
      void message.error(error instanceof Error ? error.message : t('feedback.loadListFailed'))
    } finally {
      setLoadingList(false)
    }
  }, [filterResumeId, filterStatus, filterTargetCompany, keyword, message, page, t])

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
      void message.error(error instanceof Error ? error.message : t('feedback.loadDetailFailed'))
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [interviewId, message, t])

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
        void message.warning(t('feedback.createCompanyFailed'))
      } else {
        void message.success(t('feedback.createSuccess'))
      }

      setCreateOpen(false)
      form.resetFields()
      updateSearch({ create: undefined })
      navigate(`/app/interviews/${created.id}`)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const refreshAfterAction = useCallback(async (action: () => Promise<InterviewDetail>, successText: string) => {
    try {
      const next = await action()
      setDetail(next)
      void message.success(successText)
      return next
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.operationFailed'))
      return null
    }
  }, [message, t])

  const handleDeleteInterview = useCallback(async (targetInterviewId: string) => {
    deletingInterviewIdsRef.current.add(targetInterviewId)
    try {
      abortControllerRef.current?.abort()
      await deleteInterview(targetInterviewId)
      void message.success(t('feedback.deleted'))
      setInterviewPage((prev) => {
        if (!prev) {
          return prev
        }
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== targetInterviewId),
          total: Math.max(0, prev.total - 1),
        }
      })
      if (interviewId === targetInterviewId) {
        setDetail(null)
        navigate('/app/interviews')
      } else {
        void loadList()
      }
    } catch (error) {
      deletingInterviewIdsRef.current.delete(targetInterviewId)
      void message.error(error instanceof Error ? error.message : t('feedback.deleteFailed'))
    }
  }, [interviewId, loadList, message, navigate, t])

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
    void refreshAfterAction(() => continueInterview(detail.id), t('feedback.autoContinued')).then((updated) => {
      if (!updated) {
        autoContinueInterviewIdRef.current = null
      }
    })
  }, [detail, loadingDetail, refreshAfterAction, t])

  async function handleSubmitMessage() {
    if (!detail || streaming) {
      return
    }

    const trimmed = messageDraft.trim()
    if (!trimmed) {
      void message.warning(t('feedback.emptyMessage'))
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
        if (!deletingInterviewIdsRef.current.has(detail.id)) {
          setDetail(await getInterview(detail.id))
        }
      } else {
        void message.error(error instanceof Error ? error.message : t('feedback.sendFailed'))
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
        if (!deletingInterviewIdsRef.current.has(detail.id)) {
          setDetail(await getInterview(detail.id))
        }
      } else {
        void message.error(error instanceof Error ? error.message : t('feedback.regenerateFailed'))
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
          void refreshAfterAction(() => pauseInterview(detail.id), t('feedback.paused')).then(() => navigate('/app/interviews'))
        }}
        onContinue={() => detail && void refreshAfterAction(() => continueInterview(detail.id), t('feedback.continued'))}
        onDelete={() => detail && void handleDeleteInterview(detail.id)}
        onEnd={() =>
          detail &&
          void refreshAfterAction(() => endInterview(detail.id), t('feedback.ended')).then((updated) => {
            if (updated) {
              navigate('/app/interviews')
            }
          })
        }
        onNextRound={() => detail ? refreshAfterAction(() => nextInterviewRound(detail.id), t('feedback.nextRound')) : Promise.resolve(null)}
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
    <>
      <InterviewCenterView
        filterResumeId={filterResumeId}
        filterStatus={filterStatus}
        filterTargetCompany={filterTargetCompany}
        interviewPage={interviewPage}
        keyword={keyword}
        loading={loadingList}
        resumeOptions={resumeOptions}
        onCreate={openCreateModal}
        onDelete={(targetInterviewId) => void handleDeleteInterview(targetInterviewId)}
        onOpenDetail={(targetInterviewId) => navigate(`/app/interviews/${targetInterviewId}`)}
        onUpdateSearch={updateSearch}
      />

      <InterviewCreateModal
        creating={creating}
        filterResumeId={filterResumeId}
        form={form}
        open={createOpen}
        resumes={resumes}
        selectedInterviewerRoles={selectedInterviewerRoles}
        onCancel={closeCreateModal}
        onSubmit={(values) => void handleCreate(values)}
      />

      {creating ? (
        <div className="interview-creating-overlay">
          <Spin size="large" />
          <p>{t('create.creatingOverlay')}</p>
        </div>
      ) : null}
    </>
  )
}
