import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FileAddOutlined,
  HolderOutlined,
  MessageOutlined,
  LockOutlined,
  LogoutOutlined,
  PlusOutlined,
  RollbackOutlined,
  ShareAltOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Collapse,
  Dropdown,
  Empty,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Radio,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentProps, type ReactNode } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AiConfigurationButton, AiResumeAssistant } from '../features/ai/components/AiResumeAssistant'
import { ResumeScoreButton } from '../features/ai/components/ResumeScoreButton'
import { MarkdownTextArea } from '../features/resume/components/MarkdownTextArea'
import { EmptyPreview, ResumePreview } from '../features/resume/components/ResumePreview'
import {
  copyResume,
  createShare,
  deleteResume,
  deleteShare,
  getResume,
  getShareAccessLogs,
  listDeletedResumes,
  listResumes,
  listShares,
  restoreResume,
  toggleShare,
  updateResume,
} from '../features/resume/api/resumeApi'
import { exportResumeDocx } from '../features/resume/export/docxExport'
import { exportResumePdf } from '../features/resume/export/pdfExport'
import { useResumeTemplateCatalog } from '../features/resume/hooks/useResumeTemplateCatalog'
import {
  resolveResumeTemplate,
  type ResumeTemplateDefinition,
} from '../features/resume/templateCatalog'
import { createDefaultResumeLayout, normalizeResumeLayout } from '../features/resume/types'
import type {
  CertificateItem,
  EducationItem,
  HonorItem,
  ProjectExperienceItem,
  ResumeDetail,
  ResumeLayout,
  ResumePage,
  ResumeSectionKey,
  ResumeSummary,
  ShareAccessLog,
  ShareLink,
  ShareMode,
  SkillItem,
  WorkExperienceItem,
} from '../features/resume/types'

const { Paragraph, Text } = Typography

interface WorkspacePageProps {
  accessToken: string
  onLogout: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'save_failed'
type ExportFormat = 'pdf' | 'docx'
type ResumeModuleId = 'personal-info' | ResumeSectionKey
type ShareDialogState = {
  resumeId: string
  resumeTitle: string
} | null

interface ResumeModuleDefinition {
  key: ResumeModuleId
  title: string
  description: string
  removable: boolean
}
const DEFAULT_LAYOUT = createDefaultResumeLayout()
const MAX_AVATAR_FILE_SIZE_BYTES = 1024 * 1024
const RESUMES_PER_PAGE = 6
const AVATAR_INPUT_ID = 'resume-editor-avatar-input'

const MODULE_DEFINITIONS: ResumeModuleDefinition[] = [
  {
    key: 'personal-info',
    title: '个人信息',
    description: '姓名、职位、电话、邮箱和个人链接。',
    removable: false,
  },
  {
    key: 'summary',
    title: '个人简介',
    description: '用一小段文字快速交代你的定位和亮点。',
    removable: true,
  },
  {
    key: 'workExperience',
    title: '工作经历',
    description: '按时间组织公司、岗位和成果。',
    removable: true,
  },
  {
    key: 'projectExperience',
    title: '项目经历',
    description: '突出关键项目、角色和影响。',
    removable: true,
  },
  {
    key: 'education',
    title: '教育经历',
    description: '展示学校、学位和专业背景。',
    removable: true,
  },
  {
    key: 'skills',
    title: '技能特长',
    description: '放置技能标签和熟练度。',
    removable: true,
  },
  {
    key: 'honors',
    title: '荣誉奖项',
    description: '补充外部认可或内部荣誉。',
    removable: true,
  },
  {
    key: 'certificates',
    title: '资格证书',
    description: '展示资质、证书和编号信息。',
    removable: true,
  },
]

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Unable to read avatar file'))
    }

    reader.onerror = () => {
      reject(new Error('Unable to read avatar file'))
    }

    reader.readAsDataURL(file)
  })
}

function createResumeSignature(resume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'>) {
  return JSON.stringify({
    title: resume.title,
    templateKey: resume.templateKey,
    content: resume.content,
    layout: normalizeResumeLayout(resume.layout),
  })
}

export function WorkspacePage({ accessToken, onLogout }: WorkspacePageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { resumeId } = useParams()
  const { message } = App.useApp()
  const { templates, loading: loadingTemplates } = useResumeTemplateCatalog()
  const [resumeList, setResumeList] = useState<ResumeSummary[]>([])
  const [resumePage, setResumePage] = useState<ResumePage | null>(null)
  const [draft, setDraft] = useState<ResumeDetail | null>(null)
  const [loadingResumeList, setLoadingResumeList] = useState(true)
  const [loadingResumeDetail, setLoadingResumeDetail] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)
  const [lastSavedSignature, setLastSavedSignature] = useState('')
  const [expandedModules, setExpandedModules] = useState<ResumeModuleId[]>(['personal-info', ...DEFAULT_LAYOUT.sectionOrder])
  const deferredDraft = useDeferredValue(draft)
  const isEditorView = Boolean(resumeId)
  const isRecycleBinView = location.pathname === '/app/recycle-bin'

  const loadResumeList = useCallback(async () => {
    setLoadingResumeList(true)
    try {
      const page = isRecycleBinView ? await listDeletedResumes(1, RESUMES_PER_PAGE) : await listResumes(false, 1, RESUMES_PER_PAGE)
      setResumePage(page)
      setResumeList(page.items)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载简历列表。')
    } finally {
      setLoadingResumeList(false)
    }
  }, [isRecycleBinView, message])

  const loadResumeDetail = useCallback(
    async (targetResumeId: string) => {
      setLoadingResumeDetail(true)
      try {
        const detail = await getResume(targetResumeId)
        const normalizedDetail = {
          ...detail,
          layout: normalizeResumeLayout(detail.layout),
        }

        setDraft(normalizedDetail)
        setLastSavedSignature(createResumeSignature(normalizedDetail))
        setExpandedModules(['personal-info', ...normalizedDetail.layout.sectionOrder])
        setSaveState('saved')
      } catch (error) {
        setDraft(null)
        void message.error(error instanceof Error ? error.message : '无法加载简历详情。')
      } finally {
        setLoadingResumeDetail(false)
      }
    },
    [message],
  )

  const persistDraft = useCallback(
    async (targetResumeId: string, currentDraft: ResumeDetail) => {
      setSaveState('saving')
      try {
        const saved = await updateResume(targetResumeId, {
          title: currentDraft.title,
          templateKey: currentDraft.templateKey,
          content: currentDraft.content,
          layout: normalizeResumeLayout(currentDraft.layout),
        })
        const normalizedSaved = {
          ...saved,
          layout: normalizeResumeLayout(saved.layout),
        }
        const signature = createResumeSignature(normalizedSaved)

        setLastSavedSignature(signature)
        setSaveState('saved')
        setResumeList((current) =>
          current.map((item) =>
            item.id === normalizedSaved.id
              ? {
                  ...item,
                  title: normalizedSaved.title,
                  templateKey: normalizedSaved.templateKey,
                  updatedAt: normalizedSaved.updatedAt,
                }
              : item,
          ),
        )
      } catch (error) {
        setSaveState('save_failed')
        void message.error(error instanceof Error ? error.message : '自动保存失败。')
      }
    },
    [message],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResumeList()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [accessToken, loadResumeList])

  useEffect(() => {
    if (!resumeId) {
      const timeoutId = window.setTimeout(() => {
        setDraft(null)
        setSaveState('idle')
        setLastSavedSignature('')
        setExpandedModules(['personal-info', ...DEFAULT_LAYOUT.sectionOrder])
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    const timeoutId = window.setTimeout(() => {
      void loadResumeDetail(resumeId)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadResumeDetail, resumeId])

  useEffect(() => {
    if (!draft || !resumeId) {
      return
    }

    const draftSignature = createResumeSignature(draft)

    if (draftSignature === lastSavedSignature) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void persistDraft(resumeId, draft)
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [draft, lastSavedSignature, persistDraft, resumeId])

  const layout = useMemo(() => normalizeResumeLayout(draft?.layout), [draft?.layout])
  const sectionOrder = layout.sectionOrder
  const hiddenSections = layout.hiddenSections

  const orderedModuleDefinitions = useMemo(
    () => [
      MODULE_DEFINITIONS[0],
      ...sectionOrder
        .map((key) => MODULE_DEFINITIONS.find((item) => item.key === key))
        .filter((item): item is ResumeModuleDefinition => Boolean(item)),
    ],
    [sectionOrder],
  )

  const updateDraft = useCallback((mutator: (next: ResumeDetail) => void) => {
    setDraft((current) => {
      if (!current) {
        return current
      }

      const next = structuredClone(current)
      mutator(next)
      return next
    })
  }, [])

  const updateLayout = useCallback(
    (mutator: (next: ResumeLayout) => void) => {
      updateDraft((next) => {
        const layout = normalizeResumeLayout(next.layout)
        mutator(layout)
        next.layout = normalizeResumeLayout(layout)
      })
    },
    [updateDraft],
  )

  const handlePageChange = useCallback(
    async (nextPage: number) => {
      setLoadingResumeList(true)
      try {
        const page = isRecycleBinView
          ? await listDeletedResumes(nextPage, RESUMES_PER_PAGE)
          : await listResumes(false, nextPage, RESUMES_PER_PAGE)
        setResumePage(page)
        setResumeList(page.items)
      } catch (error) {
        void message.error(error instanceof Error ? error.message : '无法加载简历列表。')
      } finally {
        setLoadingResumeList(false)
      }
    },
    [isRecycleBinView, message],
  )

  async function handleDeleteResume(targetResumeId: string) {
    await deleteResume(targetResumeId)
    void message.success('简历已移至回收站。')

    if (resumeId === targetResumeId) {
      navigate('/app')
    }

    await loadResumeList()
  }

  async function handleCopyResume(targetResumeId: string, title: string) {
    await copyResume(targetResumeId, { title })
    void message.success('简历已复制。')
    await loadResumeList()
  }

  async function handleRestoreResume(targetResumeId: string) {
    await restoreResume(targetResumeId)
    void message.success('简历已恢复。')
    await loadResumeList()
  }

  async function handleCreateShare(mode: ShareMode, password?: string) {
    if (!resumeId) {
      return
    }

    const share = await createShare(resumeId, mode, password)
    await navigator.clipboard.writeText(`${window.location.origin}${share.sharePath}`)
    void message.success(`${mode === 'LATEST' ? '最新版本' : '快照'}分享链接已复制。`)
  }

  async function handleExport(format: ExportFormat, template: ResumeTemplateDefinition, previewRoot?: HTMLElement | null) {
    if (!resumeId || !draft || exportingFormat) {
      return
    }

    setExportingFormat(format)
    try {
      if (format === 'pdf') {
        if (!previewRoot) {
          throw new Error('未找到可导出的简历预览。')
        }

        await exportResumePdf(previewRoot, draft.title)
        void message.success('PDF 已开始下载。')
        return
      }

      await exportResumeDocx(draft, template)
      void message.success('DOCX 已开始下载。')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '导出失败，请重试。')
    } finally {
      setExportingFormat(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    updateLayout((layout) => {
      const oldIndex = layout.sectionOrder.indexOf(active.id as ResumeSectionKey)
      const newIndex = layout.sectionOrder.indexOf(over.id as ResumeSectionKey)
      if (oldIndex !== -1 && newIndex !== -1) {
        layout.sectionOrder = arrayMove(layout.sectionOrder, oldIndex, newIndex)
      }
    })
  }

function hideSection(sectionKey: ResumeSectionKey) {
  updateLayout((layout) => {
    if (!layout.hiddenSections.includes(sectionKey)) {
      layout.hiddenSections = [...layout.hiddenSections, sectionKey]
    }
  })
}

function showSection(sectionKey: ResumeSectionKey) {
  updateLayout((layout) => {
    layout.hiddenSections = layout.hiddenSections.filter((key) => key !== sectionKey)
  })
}

  function focusModule(moduleKey: ResumeModuleId) {
    if (moduleKey !== 'personal-info') {
      setExpandedModules((current) => (current.includes(moduleKey) ? current : [...current, moduleKey]))
    }

    window.setTimeout(() => {
      document.getElementById(moduleAnchorId(moduleKey))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 50)
  }

  function handleExpandedModulesChange(keys: string | string[]) {
    const nextKeys = Array.isArray(keys) ? keys : [keys]
    setExpandedModules(nextKeys as ResumeModuleId[])
  }

  const pageContent = isEditorView ? (
    loadingResumeDetail ? (
      <div className="workspace-loading-state">
        <Spin size="large" tip="正在加载简历编辑器..." />
      </div>
    ) : draft ? (
      <ResumeEditorView
        draft={draft}
        deferredDraft={deferredDraft}
        expandedModules={expandedModules}
        hiddenSections={hiddenSections}
        loadingTemplates={loadingTemplates}
        onCreateShare={handleCreateShare}
        exportingFormat={exportingFormat}
        onExport={handleExport}
        onExpandedModulesChange={handleExpandedModulesChange}
        onFocusModule={focusModule}
        onHideSection={hideSection}
        onLogout={onLogout}
        onDragEnd={handleDragEnd}
        onShowSection={showSection}
        onUpdateDraft={updateDraft}
        saveState={saveState}
        sectionOrder={sectionOrder}
        templates={templates}
        orderedModuleDefinitions={orderedModuleDefinitions}
      />
    ) : (
      <div className="workspace-empty-shell">
        <Card className="glass-card" bordered={false}>
          <Empty description="没有找到这份简历，返回列表后重新选择。" />
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/app')}>
              返回简历列表
            </Button>
          </Space>
        </Card>
      </div>
    )
  ) : (
    isRecycleBinView ? (
      <RecycleBinView
        loadingResumeList={loadingResumeList}
        onPageChange={handlePageChange}
        onLogout={onLogout}
        onRestoreResume={handleRestoreResume}
        resumePage={resumePage}
        resumeList={resumeList}
        selectedTemplateName={(templateKey) => resolveResumeTemplate(templates, templateKey).name}
        templates={templates}
      />
    ) : (
      <ResumeListView
        loadingResumeList={loadingResumeList}
        onCopyResume={handleCopyResume}
        onDeleteResume={handleDeleteResume}
        onPageChange={handlePageChange}
        onLogout={onLogout}
        onOpenResume={(targetResumeId) => navigate(`/app/resumes/${targetResumeId}`)}
        resumePage={resumePage}
        resumeList={resumeList}
        selectedTemplateName={(templateKey) => resolveResumeTemplate(templates, templateKey).name}
        templates={templates}
      />
    )
  )

  return pageContent
}

function ResumeListView({
  loadingResumeList,
  onCopyResume,
  onDeleteResume,
  onPageChange,
  onLogout,
  onOpenResume,
  resumePage,
  resumeList,
  selectedTemplateName,
  templates,
}: {
  loadingResumeList: boolean
  onCopyResume: (resumeId: string, title: string) => Promise<void>
  onDeleteResume: (resumeId: string) => Promise<void>
  onPageChange: (page: number) => Promise<void>
  onLogout: () => void
  onOpenResume: (resumeId: string) => void
  resumePage: ResumePage | null
  resumeList: ResumeSummary[]
  selectedTemplateName: (templateKey: string) => string
  templates: ReturnType<typeof useResumeTemplateCatalog>['templates']
}) {
  const { message } = App.useApp()
  const [shareDialog, setShareDialog] = useState<ShareDialogState>(null)
  const [loadingShareResumeId, setLoadingShareResumeId] = useState<string | null>(null)
  const [shareLinksByResumeId, setShareLinksByResumeId] = useState<Record<string, ShareLink[]>>({})
  const [previewDetailsByResumeId, setPreviewDetailsByResumeId] = useState<Record<string, ResumeDetail>>({})
  const visibleResumes = resumeList
  const visibleResumeIds = useMemo(() => visibleResumes.map((item) => item.id), [visibleResumes])
  const loadingPreviewIds = visibleResumeIds.filter((id) => !previewDetailsByResumeId[id])
  const emptySlotCount = Math.max(0, RESUMES_PER_PAGE - visibleResumes.length)

  const openShareDialog = useCallback(async (resume: ResumeSummary) => {
    setShareDialog({
      resumeId: resume.id,
      resumeTitle: resume.title,
    })
    setLoadingShareResumeId(resume.id)
    try {
      const shares = await listShares(resume.id)
      setShareLinksByResumeId((current) => ({
        ...current,
        [resume.id]: shares,
      }))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载分享链接。')
    } finally {
      setLoadingShareResumeId((current) => (current === resume.id ? null : current))
    }
  }, [message])

  const refreshShareLinks = useCallback(async () => {
    if (!shareDialog) return
    try {
      const shares = await listShares(shareDialog.resumeId)
      setShareLinksByResumeId((current) => ({
        ...current,
        [shareDialog.resumeId]: shares,
      }))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法刷新分享链接。')
    }
  }, [shareDialog, message])

  useEffect(() => {
    const missingResumes = visibleResumes.filter((item) => !previewDetailsByResumeId[item.id])
    if (missingResumes.length === 0) {
      return
    }

    let cancelled = false
    const missingIds = missingResumes.map((item) => item.id)

    Promise.allSettled(missingIds.map((id) => getResume(id)))
      .then((results) => {
        if (cancelled) {
          return
        }

        const loadedDetails = results.reduce<Record<string, ResumeDetail>>((next, result) => {
          if (result.status === 'fulfilled') {
            next[result.value.id] = {
              ...result.value,
              layout: normalizeResumeLayout(result.value.layout),
            }
          }
          return next
        }, {})

        if (Object.keys(loadedDetails).length > 0) {
          setPreviewDetailsByResumeId((current) => ({
            ...current,
            ...loadedDetails,
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [previewDetailsByResumeId, visibleResumes])

  return (
    <div className="workspace-layout">
      <div className="workspace-hub">
        <div className="workspace-hub__hero">
          <div className="workspace-hub__copy">
            <h1>智慧简历</h1>
            <p>选择简历开始编辑，实时预览效果。</p>
          </div>

          <div className="workspace-hub__actions">
            <Link to="/app/templates">
              <Button type="primary" size="large" icon={<FileAddOutlined />}>
                模板目录
              </Button>
            </Link>
            <Link to="/app/interviews">
              <Button size="large" icon={<MessageOutlined />}>
                面试中心
              </Button>
            </Link>
            <Link to="/app/recycle-bin">
              <Button size="large" icon={<InboxOutlined />}>
                回收桶
              </Button>
            </Link>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              锁定工作区
            </Button>
          </div>
        </div>

        <div className="workspace-hub__toolbar">
          <Space wrap align="center">
            <Text strong>我的简历</Text>
            <Tag color="blue">{resumePage?.total ?? resumeList.length} 份</Tag>
          </Space>
          {(resumePage?.total ?? resumeList.length) > RESUMES_PER_PAGE ? (
            <Text type="secondary">每页最多展示 {RESUMES_PER_PAGE} 份简历</Text>
          ) : null}
        </div>

        {loadingResumeList ? (
          <div className="workspace-loading-state">
            <Spin size="large" />
          </div>
        ) : resumeList.length === 0 ? (
          <Card className="glass-card workspace-hub__empty" bordered={false}>
            <Empty description="还没有简历，先创建一份试试。" />
          </Card>
        ) : (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div className="resume-list-grid">
              {visibleResumes.map((item) => (
                <ResumeVisualCard
                  key={item.id}
                  item={item}
                  loadingPreview={loadingPreviewIds.includes(item.id)}
                  onCopyResume={onCopyResume}
                  onDeleteResume={onDeleteResume}
                  onOpenResume={onOpenResume}
                  onOpenShareDialog={openShareDialog}
                  previewDetail={previewDetailsByResumeId[item.id]}
                  selectedTemplateName={selectedTemplateName(item.templateKey)}
                  templates={templates}
                />
              ))}
              {Array.from({ length: emptySlotCount }).map((_, index) => (
                <div className="resume-list-card resume-list-card--empty" key={`empty-slot-${index}`} aria-hidden="true" />
              ))}
            </div>

            {resumePage && resumePage.totalPages > 1 ? (
              <div className="resume-list-pagination">
                <Pagination
                  current={resumePage.page}
                  pageSize={RESUMES_PER_PAGE}
                  total={resumePage.total}
                  onChange={(nextPage) => void onPageChange(nextPage)}
                  showSizeChanger={false}
                />
              </div>
            ) : null}
          </Space>
        )}
      </div>

      <ShareLinksModal
        loading={loadingShareResumeId === shareDialog?.resumeId}
        onClose={() => setShareDialog(null)}
        onRefresh={() => void refreshShareLinks()}
        shareDialog={shareDialog}
        shareLinks={shareDialog ? shareLinksByResumeId[shareDialog.resumeId] ?? [] : []}
      />
    </div>
  )
}

function ResumeVisualCard({
  item,
  loadingPreview,
  onCopyResume,
  onDeleteResume,
  onOpenResume,
  onOpenShareDialog,
  onRestoreResume,
  previewDetail,
  selectedTemplateName,
  status = 'active',
  templates,
}: {
  item: ResumeSummary
  loadingPreview: boolean
  onCopyResume?: (resumeId: string, title: string) => Promise<void>
  onDeleteResume?: (resumeId: string) => Promise<void>
  onOpenResume?: (resumeId: string) => void
  onOpenShareDialog?: (resume: ResumeSummary) => Promise<void>
  onRestoreResume?: (resumeId: string) => Promise<void>
  previewDetail?: ResumeDetail
  selectedTemplateName: string
  status?: 'active' | 'deleted'
  templates: ReturnType<typeof useResumeTemplateCatalog>['templates']
}) {
  const { message: cardMessage } = App.useApp()
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copyTitle, setCopyTitle] = useState('')
  const [copying, setCopying] = useState(false)

  const openCopyDialog = () => {
    setCopyTitle(`${item.title} 副本`)
    setCopyDialogOpen(true)
  }

  const closeCopyDialog = () => {
    if (copying) return
    setCopyDialogOpen(false)
  }

  const submitCopy = async () => {
    if (!onCopyResume) return
    const trimmed = copyTitle.trim()
    if (!trimmed) {
      void cardMessage.warning('请输入简历名称。')
      return
    }
    setCopying(true)
    try {
      await onCopyResume(item.id, trimmed)
      setCopyDialogOpen(false)
    } catch (error) {
      void cardMessage.error(error instanceof Error ? error.message : '复制简历失败。')
    } finally {
      setCopying(false)
    }
  }
  const preview = (
    <div className="resume-list-card__preview">
      {previewDetail ? (
        <ResumePreview
          resume={previewDetail}
          templates={templates}
          previewMode="a4-fit"
        />
      ) : (
        <div className="resume-list-card__preview-fallback">
          {loadingPreview ? <Spin size="small" /> : <FileAddOutlined />}
          <Text type="secondary">{loadingPreview ? '正在生成预览' : selectedTemplateName}</Text>
        </div>
      )}
    </div>
  )

  return (
    <article className="resume-list-card">
      {onOpenResume ? (
        <button
          className="resume-list-card__preview-button"
          type="button"
          onClick={() => onOpenResume(item.id)}
          aria-label={`打开 ${item.title}`}
        >
          {preview}
        </button>
      ) : (
        <div className="resume-list-card__preview-button" aria-label={`${item.title} 预览`}>
          {preview}
        </div>
      )}

      {onOpenShareDialog ? (
        <Button
          className="resume-list-card__share-action"
          shape="circle"
          icon={<ShareAltOutlined />}
          onClick={() => void onOpenShareDialog(item)}
          aria-label={`查看 ${item.title} 的分享链接`}
        />
      ) : null}

      <div className="resume-list-card__body">
        <div className="resume-list-card__topline">
          <Tag color="default">{selectedTemplateName}</Tag>
          <Tag color={status === 'deleted' ? 'red' : 'blue'}>{status === 'deleted' ? '已删除' : '可编辑'}</Tag>
        </div>
        <strong>{item.title}</strong>
        <p>{status === 'deleted' ? '删除于' : '更新于'} {new Date(item.updatedAt).toLocaleString()}</p>
      </div>

      <div className="resume-list-card__actions">
        {onRestoreResume ? (
          <Button
            type="primary"
            icon={<RollbackOutlined />}
            onClick={() => {
              void onRestoreResume(item.id)
            }}
          >
            恢复
          </Button>
        ) : null}

        {onCopyResume ? (
          <Button
            icon={<CopyOutlined />}
            onClick={openCopyDialog}
          >
            复制
          </Button>
        ) : null}

        {onDeleteResume ? (
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              void onDeleteResume(item.id)
            }}
          >
            删除
          </Button>
        ) : null}
      </div>

      {onCopyResume ? (
        <Modal
          title="复制简历"
          open={copyDialogOpen}
          onCancel={closeCopyDialog}
          onOk={() => void submitCopy()}
          okText="复制"
          cancelText="取消"
          confirmLoading={copying}
          destroyOnHidden
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text>请输入新简历的名称：</Text>
            <Input
              autoFocus
              value={copyTitle}
              maxLength={200}
              placeholder="新简历名称"
              onChange={(event) => setCopyTitle(event.target.value)}
              onPressEnter={() => void submitCopy()}
            />
          </Space>
        </Modal>
      ) : null}
    </article>
  )
}

function ShareLinksModal({
  loading,
  onClose,
  onRefresh,
  shareDialog,
  shareLinks,
}: {
  loading: boolean
  onClose: () => void
  onRefresh: () => void
  shareDialog: ShareDialogState
  shareLinks: ShareLink[]
}) {
  const { message } = App.useApp()
  const [expandedShare, setExpandedShare] = useState<string | null>(null)
  const [accessLogs, setAccessLogs] = useState<ShareAccessLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const handleToggleLogs = async (share: ShareLink) => {
    if (expandedShare === share.shareCode) {
      setExpandedShare(null)
      setAccessLogs([])
      return
    }

    if (!shareDialog) return
    setExpandedShare(share.shareCode)
    setLoadingLogs(true)
    try {
      const result = await getShareAccessLogs(shareDialog.resumeId, share.shareCode)
      setAccessLogs(result.logs)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载访问记录')
      setAccessLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleToggleActive = async (share: ShareLink) => {
    if (!shareDialog) return
    try {
      await toggleShare(shareDialog.resumeId, share.shareCode)
      void message.success(share.active ? '已禁用分享链接' : '已启用分享链接')
      onRefresh()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const handleDelete = async (share: ShareLink) => {
    if (!shareDialog) return
    try {
      await deleteShare(shareDialog.resumeId, share.shareCode)
      void message.success('分享链接已删除')
      onRefresh()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  return (
    <Modal
      title={shareDialog ? `${shareDialog.resumeTitle} 的分享链接` : '分享链接'}
      open={Boolean(shareDialog)}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
    >
      {loading ? (
        <div className="resume-list-card__share-loading">
          <Spin />
        </div>
      ) : shareLinks.length === 0 ? (
        <Empty description="还没有分享链接，进入编辑页后可以创建最新版或快照链接。" />
      ) : (
        <div className="share-list">
          {shareLinks.map((share) => {
            const fullUrl = `${window.location.origin}${share.sharePath}`
            const isExpanded = expandedShare === share.shareCode

            return (
              <div className="share-row" key={share.shareCode} style={{ flexDirection: 'column', alignItems: 'stretch', opacity: share.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Space direction="vertical" size={4}>
                    <Space wrap>
                      <Tag color={share.shareMode === 'LATEST' ? 'blue' : 'orange'}>
                        {share.shareMode === 'LATEST' ? '最新版' : '快照'}
                      </Tag>
                      {share.hasPassword ? <Tag icon={<LockOutlined />} color="red">密码保护</Tag> : null}
                      {!share.active ? <Tag color="default">已禁用</Tag> : null}
                      <Tag>{share.viewCount} 次访问</Tag>
                    </Space>
                    <Text copyable={{ text: fullUrl }} style={share.active ? undefined : { textDecoration: 'line-through' }}>{fullUrl}</Text>
                    <Space size={16}>
                      <Text type="secondary" style={{ fontSize: 12 }}>创建: {new Date(share.createdAt).toLocaleString()}</Text>
                      {share.lastAccessedAt ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>最近访问: {new Date(share.lastAccessedAt).toLocaleString()}</Text>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>暂无访问</Text>
                      )}
                    </Space>
                  </Space>

                  <Space size={4}>
                    <Button
                      size="small"
                      onClick={() => void handleToggleLogs(share)}
                    >
                      {isExpanded ? '收起' : '详情'}
                    </Button>
                    <Tooltip title={share.active ? '禁用' : '启用'}>
                      <Button
                        size="small"
                        icon={share.active ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => void handleToggleActive(share)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="确定删除此分享链接？"
                      description="删除后访问记录也会一并清除，无法恢复。"
                      onConfirm={() => void handleDelete(share)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="删除">
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={async () => {
                        await navigator.clipboard.writeText(fullUrl)
                        void message.success('分享链接已复制。')
                      }}
                    >
                      复制
                    </Button>
                  </Space>
                </div>

                {isExpanded ? (
                  <div style={{ marginTop: 12, paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
                    {loadingLogs ? (
                      <Spin size="small" />
                    ) : accessLogs.length === 0 ? (
                      <Text type="secondary">暂无访问记录</Text>
                    ) : (
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {accessLogs.map((log) => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                            <Text type="secondary">{new Date(log.accessedAt).toLocaleString()}</Text>
                            <Text code style={{ fontSize: 12 }}>{log.ipAddress}</Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

function RecycleBinView({
  loadingResumeList,
  onPageChange,
  onLogout,
  onRestoreResume,
  resumePage,
  resumeList,
  selectedTemplateName,
  templates,
}: {
  loadingResumeList: boolean
  onPageChange: (page: number) => Promise<void>
  onLogout: () => void
  onRestoreResume: (resumeId: string) => Promise<void>
  resumePage: ResumePage | null
  resumeList: ResumeSummary[]
  selectedTemplateName: (templateKey: string) => string
  templates: ReturnType<typeof useResumeTemplateCatalog>['templates']
}) {
  const [previewDetailsByResumeId, setPreviewDetailsByResumeId] = useState<Record<string, ResumeDetail>>({})
  const visibleResumes = resumeList
  const visibleResumeIds = useMemo(() => visibleResumes.map((item) => item.id), [visibleResumes])
  const loadingPreviewIds = visibleResumeIds.filter((id) => !previewDetailsByResumeId[id])
  const emptySlotCount = Math.max(0, RESUMES_PER_PAGE - visibleResumes.length)

  useEffect(() => {
    const missingResumes = visibleResumes.filter((item) => !previewDetailsByResumeId[item.id])
    if (missingResumes.length === 0) {
      return
    }

    let cancelled = false
    const missingIds = missingResumes.map((item) => item.id)

    Promise.allSettled(missingIds.map((id) => getResume(id)))
      .then((results) => {
        if (cancelled) {
          return
        }

        const loadedDetails = results.reduce<Record<string, ResumeDetail>>((next, result) => {
          if (result.status === 'fulfilled') {
            next[result.value.id] = {
              ...result.value,
              layout: normalizeResumeLayout(result.value.layout),
            }
          }
          return next
        }, {})

        if (Object.keys(loadedDetails).length > 0) {
          setPreviewDetailsByResumeId((current) => ({
            ...current,
            ...loadedDetails,
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [previewDetailsByResumeId, visibleResumes])

  return (
    <div className="workspace-layout">
      <div className="workspace-hub workspace-hub--recycle">
        <div className="workspace-hub__hero">
          <div className="workspace-hub__copy">
            <Tag color="default">Recycle Bin</Tag>
            <h1>回收桶</h1>
            <p>这里仅展示已删除简历。恢复后，简历会重新回到首页列表。</p>
          </div>

          <div className="workspace-hub__actions">
            <Link to="/app">
              <Button type="primary" size="large" icon={<ArrowLeftOutlined />}>
                返回首页
              </Button>
            </Link>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              锁定工作区
            </Button>
          </div>
        </div>

        <div className="workspace-hub__toolbar">
          <Space wrap align="center">
            <Text strong>已删除简历</Text>
            <Tag color="red">{resumePage?.total ?? resumeList.length} 份</Tag>
          </Space>
        </div>

        {loadingResumeList ? (
          <div className="workspace-loading-state">
            <Spin size="large" />
          </div>
        ) : resumeList.length === 0 ? (
          <Card className="glass-card workspace-hub__empty" bordered={false}>
            <Empty description="回收桶为空。" />
          </Card>
        ) : (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div className="resume-list-grid">
              {visibleResumes.map((item) => (
                <ResumeVisualCard
                  key={item.id}
                  item={item}
                  loadingPreview={loadingPreviewIds.includes(item.id)}
                  onRestoreResume={onRestoreResume}
                  previewDetail={previewDetailsByResumeId[item.id]}
                  selectedTemplateName={selectedTemplateName(item.templateKey)}
                  status="deleted"
                  templates={templates}
                />
              ))}
              {Array.from({ length: emptySlotCount }).map((_, index) => (
                <div className="resume-list-card resume-list-card--empty" key={`recycle-empty-slot-${index}`} aria-hidden="true" />
              ))}
            </div>

            {resumePage && resumePage.totalPages > 1 ? (
              <div className="resume-list-pagination">
                <Pagination
                  current={resumePage.page}
                  pageSize={RESUMES_PER_PAGE}
                  total={resumePage.total}
                  onChange={(nextPage) => void onPageChange(nextPage)}
                  showSizeChanger={false}
                />
              </div>
            ) : null}
          </Space>
        )}
      </div>
    </div>
  )
}

function ResumeEditorView({
  draft,
  deferredDraft,
  expandedModules,
  hiddenSections,
  loadingTemplates,
  onCreateShare,
  exportingFormat,
  onExpandedModulesChange,
  onExport,
  onFocusModule,
  onHideSection,
  onLogout,
  onDragEnd,
  onShowSection,
  onUpdateDraft,
  saveState,
  sectionOrder,
  templates,
  orderedModuleDefinitions,
}: {
  draft: ResumeDetail
  deferredDraft: ResumeDetail | null
  expandedModules: ResumeModuleId[]
  hiddenSections: ResumeSectionKey[]
  loadingTemplates: boolean
  onCreateShare: (mode: ShareMode, password?: string) => Promise<void>
  exportingFormat: ExportFormat | null
  onExpandedModulesChange: (keys: string | string[]) => void
  onExport: (format: ExportFormat, template: ResumeTemplateDefinition, previewRoot?: HTMLElement | null) => Promise<void>
  onFocusModule: (moduleKey: ResumeModuleId) => void
  onHideSection: (sectionKey: ResumeSectionKey) => void
  onLogout: () => void
  onDragEnd: (event: DragEndEvent) => void
  onShowSection: (sectionKey: ResumeSectionKey) => void
  onUpdateDraft: (mutator: (next: ResumeDetail) => void) => void
  saveState: SaveState
  sectionOrder: ResumeSectionKey[]
  templates: ReturnType<typeof useResumeTemplateCatalog>['templates']
  orderedModuleDefinitions: ResumeModuleDefinition[]
}) {
  const { message } = App.useApp()
  const selectedTemplate = resolveResumeTemplate(templates, draft.templateKey)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareMode, setShareMode] = useState<ShareMode>('LATEST')
  const [sharePasswordEnabled, setSharePasswordEnabled] = useState(false)
  const [sharePassword, setSharePassword] = useState('')
  const [creatingShare, setCreatingShare] = useState(false)
  const exportPreviewRef = useRef<HTMLDivElement | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const personalInfoModule = orderedModuleDefinitions.find((module) => module.key === 'personal-info')
  const sortableModules = orderedModuleDefinitions.filter((module) => module.key !== 'personal-info')

  const exportMenuItems = [
    { key: 'pdf', label: '导出 PDF', icon: <FilePdfOutlined /> },
    { key: 'docx', label: '导出 DOCX', icon: <FileWordOutlined /> },
  ]

  const handleAvatarPickerOpen = useCallback(() => {
    document.getElementById(AVATAR_INPUT_ID)?.click()
  }, [])

  const handleAvatarRemove = useCallback(() => {
    onUpdateDraft((next) => {
      next.content.personalInfo.avatar = ''
    })

    const input = document.getElementById(AVATAR_INPUT_ID)
    if (input instanceof HTMLInputElement) {
      input.value = ''
    }
  }, [onUpdateDraft])

  const handleAvatarFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      void message.error('仅支持上传图片文件。')
      return
    }

    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      void message.error('头像图片需控制在 1 MB 以内。')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)

      onUpdateDraft((next) => {
        next.content.personalInfo.avatar = dataUrl
      })
      void message.success('头像已更新。')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '头像读取失败，请重试。')
    }
  }, [message, onUpdateDraft])

  return (
    <div className="workspace-layout">
      <div className="resume-editor-shell">
        <input
          id={AVATAR_INPUT_ID}
          className="resume-editor-avatar-field__input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleAvatarFileChange}
        />

        <div className="resume-editor-shell__topbar">
          <div className="resume-editor-shell__title">
            <Space wrap>
              <Link to="/app">
                <Button icon={<ArrowLeftOutlined />}>返回列表</Button>
              </Link>
              <Tag color="gold">{selectedTemplate.category}</Tag>
              <Tag className="save-state" color={saveStateColor(saveState)}>
                {saveStateLabel(saveState)}
              </Tag>
              {loadingTemplates ? <Tag color="processing">模板目录同步中</Tag> : null}
            </Space>

            <Input
              size="large"
              value={draft.title}
              onChange={(event) => onUpdateDraft((next) => { next.title = event.target.value })}
              placeholder="简历标题"
            />
          </div>

          <Space wrap className="resume-editor-shell__actions">
            <Link to={`/app/templates?resumeId=${draft.id}`}>
              <Button>修改模板</Button>
            </Link>
            <Link to={`/app/interviews?create=1&resumeId=${draft.id}`}>
              <Button icon={<MessageOutlined />}>发起面试</Button>
            </Link>
            <Link to={`/app/interviews?resumeId=${draft.id}`}>
              <Button>相关面试</Button>
            </Link>
            <ResumeScoreButton draft={draft} />
            <AiConfigurationButton />
            <Button icon={<ShareAltOutlined />} onClick={() => {
              setShareModalOpen(true)
              setShareMode('LATEST')
              setSharePasswordEnabled(false)
              setSharePassword('')
            }}>分享</Button>
            <Dropdown menu={{ items: exportMenuItems, onClick: ({ key }) => void onExport(key as ExportFormat, selectedTemplate, key === 'pdf' ? exportPreviewRef.current : undefined) }}>
              <Button icon={<DownloadOutlined />} loading={Boolean(exportingFormat)} disabled={Boolean(exportingFormat)}>导出</Button>
            </Dropdown>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              锁定
            </Button>
          </Space>
        </div>

<div className="resume-editor-layout">
          <Card className="glass-card resume-editor-rail" bordered={false}>
            <div className="resume-editor-rail__head">
              <div>
                <Text strong>简历结构</Text>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  直接在这里调整顺序和显隐，右侧预览会同步更新。
                </Paragraph>
              </div>
              <Tag color="blue">{orderedModuleDefinitions.length} 个模块</Tag>
            </div>

            <div className="resume-editor-rail__list">
              {personalInfoModule ? (
                <div className="resume-editor-module-row" key="personal-info">
                  <button
                    className="resume-editor-module-row__button"
                    type="button"
                    onClick={() => onFocusModule('personal-info')}
                  >
                    <span>{personalInfoModule.title}</span>
                    <small>{personalInfoModule.description}</small>
                  </button>
                  <Tag color="default">固定</Tag>
                </div>
              ) : null}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  {sortableModules.map((module) => (
                    <SortableModuleRow
                      key={module.key}
                      module={module}
                      isHidden={hiddenSections.includes(module.key as ResumeSectionKey)}
                      onFocusModule={onFocusModule}
                      onHideSection={onHideSection}
                      onShowSection={onShowSection}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </Card>

          <div className="resume-editor-stack">
            <Card className="glass-card resume-editor-stack__card" bordered={false}>
              <Collapse
                activeKey={expandedModules}
                className="resume-editor-collapse"
                size="large"
                onChange={onExpandedModulesChange}
                items={orderedModuleDefinitions.map((module) => {
                  const isHidden = module.key !== 'personal-info' && hiddenSections.includes(module.key as ResumeSectionKey)

                  return {
                    key: module.key,
                    label: (
                      <div className="resume-editor-collapse__label">
                        <span>
                          {module.title}
                          {isHidden ? <Tag color="default">预览已隐藏</Tag> : null}
                        </span>
                        <small>{module.description}</small>
                      </div>
                    ),
                    extra: module.removable ? (
                      <Button
                        size="small"
                        type="text"
                        icon={isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (isHidden) {
                            onShowSection(module.key as ResumeSectionKey)
                          } else {
                            onHideSection(module.key as ResumeSectionKey)
                          }
                        }}
                      />
                    ) : null,
                    children: (
                      <div id={moduleAnchorId(module.key)}>
                        {renderModuleContent(
                          module.key,
                          draft,
                          onUpdateDraft,
                          handleAvatarPickerOpen,
                          handleAvatarRemove,
                        )}
                      </div>
                    ),
                  }
                })}
              />
            </Card>
          </div>

          <div className="resume-editor-preview">
            <div className="resume-editor-preview__sticky">
              {deferredDraft ? (
                <>
                  <ResumePreview
                    resume={deferredDraft}
                    sectionOrder={sectionOrder}
                    hiddenSections={hiddenSections}
                    templates={templates}
                    previewMode="a4-paged"
                    onClick={() => setPreviewDialogOpen(true)}
                  />
                  <Paragraph type="secondary" className="resume-editor-preview__hint">
                    点击右侧预览，可在屏幕中间打开标准 A4 视图。
                  </Paragraph>
                </>
              ) : (
                <EmptyPreview />
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={previewDialogOpen}
        onCancel={() => setPreviewDialogOpen(false)}
        footer={null}
        centered
        width={1040}
        destroyOnHidden
        title="标准 A4 预览"
      >
        <div className="resume-preview-modal">
          {deferredDraft ? (
            <ResumePreview
              resume={deferredDraft}
              sectionOrder={sectionOrder}
              hiddenSections={hiddenSections}
              templates={templates}
              previewMode="a4-paged"
            />
          ) : null}
        </div>
      </Modal>

      <div className="resume-export-source" ref={exportPreviewRef} aria-hidden="true">
        <ResumePreview
          resume={draft}
          sectionOrder={sectionOrder}
          hiddenSections={hiddenSections}
          templates={templates}
          previewMode="a4-paged"
        />
      </div>

      <Modal
        open={shareModalOpen}
        title="创建分享链接"
        onCancel={() => setShareModalOpen(false)}
        onOk={async () => {
          if (sharePasswordEnabled && !sharePassword.trim()) {
            void message.warning('请输入密码')
            return
          }
          setCreatingShare(true)
          try {
            await onCreateShare(shareMode, sharePasswordEnabled ? sharePassword.trim() : undefined)
            setShareModalOpen(false)
          } catch (error) {
            void message.error(error instanceof Error ? error.message : '创建分享失败')
          } finally {
            setCreatingShare(false)
          }
        }}
        okText="创建并复制链接"
        cancelText="取消"
        confirmLoading={creatingShare}
        destroyOnHidden
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>分享类型</Text>
            <Radio.Group value={shareMode} onChange={(e) => setShareMode(e.target.value)}>
              <Radio.Button value="LATEST">最新版本</Radio.Button>
              <Radio.Button value="SNAPSHOT">当前快照</Radio.Button>
            </Radio.Group>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {shareMode === 'LATEST' ? '链接始终展示简历的最新内容' : '链接展示此刻的简历内容，后续编辑不影响'}
              </Text>
            </div>
          </div>

          <div>
            <Space style={{ marginBottom: 8 }}>
              <Text strong>密码保护</Text>
              <Switch size="small" checked={sharePasswordEnabled} onChange={setSharePasswordEnabled} />
            </Space>
            {sharePasswordEnabled ? (
              <Input.Password
                placeholder="设置访问密码"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                autoFocus
              />
            ) : (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>开启后，访问者需输入密码才能查看</Text>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <AiResumeAssistant draft={draft} />
    </div>
  )
}

function saveStateColor(saveState: SaveState) {
  switch (saveState) {
    case 'saving':
      return 'processing'
    case 'saved':
      return 'success'
    case 'save_failed':
      return 'error'
    default:
      return 'default'
  }
}

function saveStateLabel(saveState: SaveState) {
  switch (saveState) {
    case 'saving':
      return '保存中...'
    case 'saved':
      return '已保存'
    case 'save_failed':
      return '保存失败'
    default:
      return '待保存'
  }
}

function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="resume-editor-section-grid">{children}</div>
}

function SectionGridFullWidth({ children }: { children: ReactNode }) {
  return <div className="resume-editor-section-grid__full">{children}</div>
}

function MarkdownLongTextArea(props: ComponentProps<typeof MarkdownTextArea>) {
  const { className, ...rest } = props

  return (
    <MarkdownTextArea
      {...rest}
      className={['resume-editor-long-textarea', className].filter(Boolean).join(' ')}
      wrap="off"
    />
  )
}

function renderModuleContent(
  moduleKey: ResumeModuleId,
  draft: ResumeDetail,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  onAvatarPickerOpen: () => void,
  onAvatarRemove: () => void,
) {
  if (moduleKey === 'personal-info') {
    return (
      <div className="resume-editor-personal-info">
        <div className="resume-editor-avatar-field">
          <div className="resume-editor-avatar-field__preview">
            {draft.content.personalInfo.avatar ? (
              <img src={draft.content.personalInfo.avatar} alt="Avatar preview" />
            ) : (
              <div className="resume-editor-avatar-field__placeholder">Avatar</div>
            )}
          </div>
          <div className="resume-editor-avatar-field__body">
            <Text strong>头像</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              上传后会自动转换为 base64 保存。建议使用 1 MB 以内的方形职业头像。
            </Paragraph>
            <Space wrap>
              <Button type="default" icon={<PlusOutlined />} onClick={onAvatarPickerOpen}>
                {draft.content.personalInfo.avatar ? '更换头像' : '上传头像'}
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={onAvatarRemove}
                disabled={!draft.content.personalInfo.avatar}
              >
                移除头像
              </Button>
            </Space>
          </div>
        </div>

        <SectionGrid>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>姓名</Text>
            <Input
              value={draft.content.personalInfo.fullName}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.fullName = event.target.value })}
              placeholder="姓名"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>职位/头衔</Text>
            <Input
              value={draft.content.personalInfo.headline}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.headline = event.target.value })}
              placeholder="职位 / 头衔"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>电话</Text>
            <Input
              value={draft.content.personalInfo.phone}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.phone = event.target.value })}
              placeholder="电话"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>邮箱</Text>
            <Input
              value={draft.content.personalInfo.email}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.email = event.target.value })}
              placeholder="邮箱"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>所在城市</Text>
            <Input
              value={draft.content.personalInfo.city}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.city = event.target.value })}
              placeholder="所在城市"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>个人网站</Text>
            <Input
              value={draft.content.personalInfo.website}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.website = event.target.value })}
              placeholder="个人网站 / 作品集"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>期望薪资</Text>
            <Input
              value={draft.content.personalInfo.expectedSalary}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.expectedSalary = event.target.value })}
              placeholder="期望薪资"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>年龄</Text>
            <Input
              value={draft.content.personalInfo.age}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.age = event.target.value })}
              placeholder="年龄"
            />
          </div>
        </SectionGrid>
      </div>
    )
  }

  switch (moduleKey) {
    case 'summary':
      return (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>个人简介</Text>
          <MarkdownLongTextArea
            rows={6}
            value={draft.content.personalSummary}
            onChange={(event) => updateDraft((next) => { next.content.personalSummary = event.target.value })}
            placeholder="用一段短文概括你的优势、方向和关键成果。（支持 **粗体** 和 *斜体*）"
          />
        </div>
      )
    case 'education':
      return renderEducationSection(draft.content.education, () => {
        updateDraft((next) => {
          next.content.education.push({
            school: '',
            degree: '',
            major: '',
            startDate: '',
            endDate: '',
            description: '',
          })
        })
      }, updateDraft)
    case 'workExperience':
      return renderWorkSection(draft.content.workExperience, () => {
        updateDraft((next) => {
          next.content.workExperience.push({
            company: '',
            role: '',
            startDate: '',
            endDate: '',
            description: '',
          })
        })
      }, updateDraft)
    case 'projectExperience':
      return renderProjectSection(draft.content.projectExperience, () => {
        updateDraft((next) => {
          next.content.projectExperience.push({
            name: '',
            role: '',
            startDate: '',
            endDate: '',
            description: '',
          })
        })
      }, updateDraft)
    case 'skills':
      return renderSkillSection(draft.content.skills, () => {
        updateDraft((next) => {
          next.content.skills.push({ name: '', level: '' })
        })
      }, updateDraft)
    case 'honors':
      return renderHonorSection(draft.content.honors, () => {
        updateDraft((next) => {
          next.content.honors.push({
            title: '',
            issuer: '',
            awardedAt: '',
            description: '',
          })
        })
      }, updateDraft)
    case 'certificates':
      return renderCertificateSection(draft.content.certificates, () => {
        updateDraft((next) => {
          next.content.certificates.push({
            name: '',
            issuer: '',
            issuedAt: '',
            credentialId: '',
          })
        })
      }, updateDraft)
    default:
      return null
  }
}

function renderEducationSection(
  items: EducationItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<EducationItem>(
    items,
    addItem,
    (index) => `教育经历 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>学校</Text>
          <Input value={item.school} placeholder="学校" onChange={(event) => updateDraft((next) => { next.content.education[index].school = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>学位</Text>
          <Input value={item.degree} placeholder="学位" onChange={(event) => updateDraft((next) => { next.content.education[index].degree = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>专业</Text>
          <Input value={item.major} placeholder="专业" onChange={(event) => updateDraft((next) => { next.content.education[index].major = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>开始日期</Text>
          <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.education[index].startDate = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>结束日期</Text>
          <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.education[index].endDate = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>亮点描述</Text>
            <MarkdownLongTextArea rows={3} value={item.description} placeholder="亮点描述（支持 **粗体** 和 *斜体*）" onChange={(event) => updateDraft((next) => { next.content.education[index].description = event.target.value })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.education.splice(index, 1) }),
  )
}

function renderWorkSection(
  items: WorkExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<WorkExperienceItem>(
    items,
    addItem,
    (index) => `工作经历 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>公司</Text>
          <Input value={item.company} placeholder="公司" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].company = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>职位</Text>
          <Input value={item.role} placeholder="职位" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].role = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>开始日期</Text>
          <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].startDate = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>结束日期</Text>
          <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].endDate = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>工作内容</Text>
            <MarkdownLongTextArea rows={4} value={item.description} placeholder="工作内容、范围和成果（支持 **粗体** 和 *斜体*）" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].description = event.target.value })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.workExperience.splice(index, 1) }),
  )
}

function renderProjectSection(
  items: ProjectExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<ProjectExperienceItem>(
    items,
    addItem,
    (index) => `项目经历 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>项目名称</Text>
          <Input value={item.name} placeholder="项目名称" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].name = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>角色</Text>
          <Input value={item.role} placeholder="角色" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].role = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>开始日期</Text>
          <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].startDate = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>结束日期</Text>
          <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].endDate = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>项目描述</Text>
            <MarkdownLongTextArea rows={4} value={item.description} placeholder="项目描述、技术栈和成果（支持 **粗体** 和 *斜体*）" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].description = event.target.value })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.projectExperience.splice(index, 1) }),
  )
}

function renderSkillSection(
  items: SkillItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<SkillItem>(
    items,
    addItem,
    (index) => `技能 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>技能名称</Text>
          <Input value={item.name} placeholder="技能名称" onChange={(event) => updateDraft((next) => { next.content.skills[index].name = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>熟练度</Text>
          <Input value={item.level} placeholder="熟练度 / 等级" onChange={(event) => updateDraft((next) => { next.content.skills[index].level = event.target.value })} />
        </div>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.skills.splice(index, 1) }),
  )
}

function renderHonorSection(
  items: HonorItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<HonorItem>(
    items,
    addItem,
    (index) => `奖项 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>奖项名称</Text>
          <Input value={item.title} placeholder="奖项名称" onChange={(event) => updateDraft((next) => { next.content.honors[index].title = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>颁发机构</Text>
          <Input value={item.issuer} placeholder="颁发机构" onChange={(event) => updateDraft((next) => { next.content.honors[index].issuer = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>获奖时间</Text>
          <Input value={item.awardedAt} placeholder="获奖时间" onChange={(event) => updateDraft((next) => { next.content.honors[index].awardedAt = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>奖项说明</Text>
            <MarkdownLongTextArea rows={3} value={item.description} placeholder="奖项说明（支持 **粗体** 和 *斜体*）" onChange={(event) => updateDraft((next) => { next.content.honors[index].description = event.target.value })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.honors.splice(index, 1) }),
  )
}

function renderCertificateSection(
  items: CertificateItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<CertificateItem>(
    items,
    addItem,
    (index) => `证书 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>证书名称</Text>
          <Input value={item.name} placeholder="证书名称" onChange={(event) => updateDraft((next) => { next.content.certificates[index].name = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>签发机构</Text>
          <Input value={item.issuer} placeholder="签发机构" onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuer = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>签发时间</Text>
          <Input value={item.issuedAt} placeholder="签发时间" onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuedAt = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>证书编号</Text>
          <Input value={item.credentialId} placeholder="证书编号" onChange={(event) => updateDraft((next) => { next.content.certificates[index].credentialId = event.target.value })} />
        </div>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.certificates.splice(index, 1) }),
  )
}

function renderRepeatableCards<T>(
  items: T[],
  addItem: () => void,
  titleForIndex: (index: number) => string,
  renderFields: (item: T, index: number) => ReactNode,
  removeItem: (index: number) => void,
) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {items.length === 0 ? (
        <div className="empty-state">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无条目" />
        </div>
      ) : null}

      {items.map((item, index) => (
        <Card
          key={index}
          size="small"
          title={titleForIndex(index)}
          extra={(
            <Button danger type="text" onClick={() => removeItem(index)}>
              删除
            </Button>
          )}
        >
          {renderFields(item, index)}
        </Card>
      ))}

      <Button onClick={addItem} icon={<PlusOutlined />}>
        添加条目
      </Button>
    </Space>
  )
}

function SortableModuleRow({
  module,
  isHidden,
  onFocusModule,
  onHideSection,
  onShowSection,
}: {
  module: ResumeModuleDefinition
  isHidden: boolean
  onFocusModule: (key: ResumeModuleId) => void
  onHideSection: (key: ResumeSectionKey) => void
  onShowSection: (key: ResumeSectionKey) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.key })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`resume-editor-module-row${isHidden ? ' resume-editor-module-row--hidden' : ''}`}
    >
      <button
        className="resume-editor-module-row__button"
        type="button"
        onClick={() => onFocusModule(module.key)}
      >
        <span>
          {module.title}
          {isHidden ? <Tag color="default">已隐藏</Tag> : null}
        </span>
        <small>{module.description}</small>
      </button>

      <Space size={4}>
        <span className="resume-editor-module-row__handle" {...attributes} {...listeners}>
          <HolderOutlined />
        </span>
        <Button
          size="small"
          type="text"
          icon={isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          onClick={() => (isHidden ? onShowSection(module.key as ResumeSectionKey) : onHideSection(module.key as ResumeSectionKey))}
        />
      </Space>
    </div>
  )
}

function moduleAnchorId(moduleKey: ResumeModuleId) {
  return `resume-module-${moduleKey}`
}
