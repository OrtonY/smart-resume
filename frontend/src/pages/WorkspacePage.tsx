import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExportOutlined,
  EyeInvisibleOutlined,
  FileAddOutlined,
  LogoutOutlined,
  PlusOutlined,
  RollbackOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyPreview, ResumePreview } from '../features/resume/components/ResumePreview'
import { ResumeTemplatePicker } from '../features/resume/components/ResumeTemplatePicker'
import {
  createShare,
  createResume,
  deleteResume,
  getResume,
  listResumes,
  listShares,
  requestPdfExport,
  restoreResume,
  updateResume,
} from '../features/resume/api/resumeApi'
import { useResumeTemplateCatalog } from '../features/resume/hooks/useResumeTemplateCatalog'
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  getDefaultResumeTemplate,
  resolveResumeTemplate,
} from '../features/resume/templateCatalog'
import { createDefaultResumeLayout, normalizeResumeLayout } from '../features/resume/types'
import type {
  CertificateItem,
  EducationItem,
  HonorItem,
  ProjectExperienceItem,
  ResumeDetail,
  ResumeLayout,
  ResumeSectionKey,
  ResumeSummary,
  ShareLink,
  ShareMode,
  SkillItem,
  WorkExperienceItem,
} from '../features/resume/types'

const { Paragraph, Text } = Typography
const { TextArea } = Input

interface WorkspacePageProps {
  accessToken: string
  onLogout: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'save_failed'
type ResumeModuleId = 'personal-info' | ResumeSectionKey

interface ResumeModuleDefinition {
  key: ResumeModuleId
  title: string
  description: string
  removable: boolean
}
const DEFAULT_LAYOUT = createDefaultResumeLayout()
const MAX_AVATAR_FILE_SIZE_BYTES = 1024 * 1024

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
  const { resumeId } = useParams()
  const { message } = App.useApp()
  const { templates, loading: loadingTemplates } = useResumeTemplateCatalog()
  const [resumeList, setResumeList] = useState<ResumeSummary[]>([])
  const [draft, setDraft] = useState<ResumeDetail | null>(null)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [loadingResumeList, setLoadingResumeList] = useState(true)
  const [loadingResumeDetail, setLoadingResumeDetail] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createResumeTitle, setCreateResumeTitle] = useState('未命名简历')
  const [createTemplateKey, setCreateTemplateKey] = useState(getDefaultResumeTemplate(FALLBACK_RESUME_TEMPLATE_CATALOG).key)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedSignature, setLastSavedSignature] = useState('')
  const [expandedModules, setExpandedModules] = useState<ResumeModuleId[]>(['personal-info', ...DEFAULT_LAYOUT.sectionOrder])
  const deferredDraft = useDeferredValue(draft)
  const isEditorView = Boolean(resumeId)

  const loadResumeList = useCallback(async () => {
    setLoadingResumeList(true)
    try {
      const list = await listResumes(includeDeleted)
      setResumeList(list)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载简历列表。')
    } finally {
      setLoadingResumeList(false)
    }
  }, [includeDeleted, message])

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

  async function handleCreateResume() {
    try {
      const detail = await createResume({
        title: createResumeTitle.trim() || '未命名简历',
        templateKey: createTemplateKey,
      })

      setCreateModalOpen(false)
      setCreateResumeTitle('未命名简历')
      await loadResumeList()
      navigate(`/app/resumes/${detail.id}`)
      void message.success('简历已创建。')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法创建简历。')
    }
  }

  async function handleDeleteResume(targetResumeId: string) {
    await deleteResume(targetResumeId)
    void message.success('简历已移至回收站。')

    if (resumeId === targetResumeId) {
      navigate('/app')
    }

    await loadResumeList()
  }

  async function handleRestoreResume(targetResumeId: string) {
    await restoreResume(targetResumeId)
    void message.success('简历已恢复。')
    await loadResumeList()
  }

  async function handleCreateShare(mode: ShareMode) {
    if (!resumeId) {
      return
    }

    const share = await createShare(resumeId, mode)
    await navigator.clipboard.writeText(`${window.location.origin}${share.sharePath}`)
    void message.success(`${mode === 'LATEST' ? '最新版本' : '快照'}分享链接已复制。`)
  }

  async function handleExportPdf() {
    if (!resumeId) {
      return
    }

    const result = await requestPdfExport(resumeId)
    void message.info(result.message)
  }

  function moveSection(sectionKey: ResumeSectionKey, direction: -1 | 1) {
    updateLayout((layout) => {
      const currentIndex = layout.sectionOrder.indexOf(sectionKey)
      const targetIndex = currentIndex + direction

      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= layout.sectionOrder.length) {
        return
      }

      const next = [...layout.sectionOrder]
      const [currentItem] = next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, currentItem)
      layout.sectionOrder = next
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
        onExportPdf={handleExportPdf}
        onExpandedModulesChange={handleExpandedModulesChange}
        onFocusModule={focusModule}
        onHideSection={hideSection}
        onLogout={onLogout}
        onMoveSection={moveSection}
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
    <ResumeListView
      createResumeButton={
        <Button type="primary" size="large" icon={<FileAddOutlined />} onClick={() => setCreateModalOpen(true)}>
          创建简历
        </Button>
      }
      includeDeleted={includeDeleted}
      loadingResumeList={loadingResumeList}
      onDeleteResume={handleDeleteResume}
      onLogout={onLogout}
      onOpenResume={(targetResumeId) => navigate(`/app/resumes/${targetResumeId}`)}
      onRestoreResume={handleRestoreResume}
      resumeList={resumeList}
      setIncludeDeleted={setIncludeDeleted}
      selectedTemplateName={(templateKey) => resolveResumeTemplate(templates, templateKey).name}
    />
  )

  return (
    <>
      {pageContent}

      <Modal
        title="创建新简历"
        open={createModalOpen}
        onOk={() => void handleCreateResume()}
        onCancel={() => setCreateModalOpen(false)}
        okText="创建"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Input value={createResumeTitle} onChange={(event) => setCreateResumeTitle(event.target.value)} placeholder="简历标题" />
          <ResumeTemplatePicker
            templates={templates}
            value={createTemplateKey}
            onChange={setCreateTemplateKey}
            compact
            ariaLabel="创建简历时选择模板"
          />
        </Space>
      </Modal>
    </>
  )
}

function ResumeListView({
  createResumeButton,
  includeDeleted,
  loadingResumeList,
  onDeleteResume,
  onLogout,
  onOpenResume,
  onRestoreResume,
  resumeList,
  selectedTemplateName,
  setIncludeDeleted,
}: {
  createResumeButton: ReactNode
  includeDeleted: boolean
  loadingResumeList: boolean
  onDeleteResume: (resumeId: string) => Promise<void>
  onLogout: () => void
  onOpenResume: (resumeId: string) => void
  onRestoreResume: (resumeId: string) => Promise<void>
  resumeList: ResumeSummary[]
  selectedTemplateName: (templateKey: string) => string
  setIncludeDeleted: (nextValue: boolean) => void
}) {
  const { message } = App.useApp()
  const [expandedShareResumeId, setExpandedShareResumeId] = useState<string | null>(null)
  const [loadingShareResumeId, setLoadingShareResumeId] = useState<string | null>(null)
  const [shareLinksByResumeId, setShareLinksByResumeId] = useState<Record<string, ShareLink[]>>({})

  const toggleSharePanel = useCallback(async (resumeId: string) => {
    if (expandedShareResumeId === resumeId) {
      setExpandedShareResumeId(null)
      return
    }

    setExpandedShareResumeId(resumeId)
    setLoadingShareResumeId(resumeId)
    try {
      const shares = await listShares(resumeId)
      setShareLinksByResumeId((current) => ({
        ...current,
        [resumeId]: shares,
      }))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载分享链接。')
    } finally {
      setLoadingShareResumeId((current) => (current === resumeId ? null : current))
    }
  }, [expandedShareResumeId, message])

  return (
    <div className="workspace-layout">
      <div className="workspace-hub">
        <div className="workspace-hub__hero">
          <div className="workspace-hub__copy">
            <Tag color="gold">Resume Studio</Tag>
            <h1>选择一份简历开始编辑</h1>
            <p>列表负责管理，编辑器负责专注写作。进入单份简历后，你会看到模块结构、内容编辑和实时预览三栏工作台。</p>
          </div>

          <div className="workspace-hub__actions">
            {createResumeButton}
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              锁定工作区
            </Button>
          </div>
        </div>

        <div className="workspace-hub__toolbar">
          <Space align="center">
            <Text strong>显示已删除</Text>
            <Switch checked={includeDeleted} onChange={setIncludeDeleted} />
          </Space>
          <Tag color="blue">{resumeList.length} 份简历</Tag>
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
          <div className="resume-list-grid">
            {resumeList.map((item) => (
              <article className="resume-list-card" key={item.id}>
                <button
                  className="resume-list-card__link"
                  type="button"
                  onClick={() => onOpenResume(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenResume(item.id)
                    }
                  }}
                >
                  <div className="resume-list-card__topline">
                    <Tag color="default">{selectedTemplateName(item.templateKey)}</Tag>
                    {item.deleted ? <Tag color="red">已删除</Tag> : <Tag color="blue">可编辑</Tag>}
                  </div>

                  <div className="resume-list-card__body">
                    <strong>{item.title}</strong>
                    <p>更新于 {new Date(item.updatedAt).toLocaleString()}</p>
                  </div>
                </button>

                <div className="resume-list-card__actions">
                  <Button type="primary" onClick={() => onOpenResume(item.id)}>
                    打开编辑器
                  </Button>

                  {!item.deleted ? (
                    <Button onClick={() => void toggleSharePanel(item.id)}>
                      {expandedShareResumeId === item.id ? '收起分享' : '查看分享'}
                    </Button>
                  ) : null}

                  {item.deleted ? (
                    <Button
                      icon={<RollbackOutlined />}
                      onClick={() => {
                        void onRestoreResume(item.id)
                      }}
                    >
                      恢复
                    </Button>
                  ) : (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        void onDeleteResume(item.id)
                      }}
                    >
                      删除
                    </Button>
                  )}
                </div>

                {!item.deleted && expandedShareResumeId === item.id ? (
                  <div className="resume-list-card__share-panel">
                    <div className="resume-list-card__share-head">
                      <Text strong>分享链接</Text>
                      {loadingShareResumeId === item.id ? <Tag color="processing">加载中</Tag> : null}
                    </div>

                    {loadingShareResumeId === item.id ? (
                      <div className="resume-list-card__share-loading">
                        <Spin size="small" />
                      </div>
                    ) : (shareLinksByResumeId[item.id] ?? []).length === 0 ? (
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        还没有分享链接，进入编辑页后可以创建最新版或快照链接。
                      </Paragraph>
                    ) : (
                      <div className="resume-list-card__share-list">
                        {(shareLinksByResumeId[item.id] ?? []).map((share) => (
                          <div className="share-row" key={share.shareCode}>
                            <Space direction="vertical" size={2}>
                              <Space wrap>
                                <Tag color={share.shareMode === 'LATEST' ? 'blue' : 'orange'}>{share.shareMode}</Tag>
                                <Text code>{share.shareCode}</Text>
                              </Space>
                              <Text type="secondary">{new Date(share.createdAt).toLocaleString()}</Text>
                            </Space>

                            <Button
                              icon={<CopyOutlined />}
                              onClick={async () => {
                                await navigator.clipboard.writeText(`${window.location.origin}${share.sharePath}`)
                                void message.success('分享链接已复制。')
                              }}
                            >
                              复制链接
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
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
  onExpandedModulesChange,
  onExportPdf,
  onFocusModule,
  onHideSection,
  onLogout,
  onMoveSection,
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
  onCreateShare: (mode: ShareMode) => Promise<void>
  onExpandedModulesChange: (keys: string | string[]) => void
  onExportPdf: () => Promise<void>
  onFocusModule: (moduleKey: ResumeModuleId) => void
  onHideSection: (sectionKey: ResumeSectionKey) => void
  onLogout: () => void
  onMoveSection: (sectionKey: ResumeSectionKey, direction: -1 | 1) => void
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const handleAvatarPickerOpen = useCallback(() => {
    avatarInputRef.current?.click()
  }, [])

  const handleAvatarRemove = useCallback(() => {
    onUpdateDraft((next) => {
      next.content.personalInfo.avatar = ''
    })

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
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
              <Button>模板中心</Button>
            </Link>
            <Button icon={<ShareAltOutlined />} onClick={() => void onCreateShare('LATEST')}>
              分享最新版
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={() => void onCreateShare('SNAPSHOT')}>
              分享快照
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => void onExportPdf()}>
              导出 PDF
            </Button>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              锁定
            </Button>
          </Space>
        </div>

        <div className="resume-editor-shell__meta">
          <div>
            <Text strong>{selectedTemplate.name}</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {selectedTemplate.summary}
            </Paragraph>
          </div>
          <Tag color="blue">右侧预览常驻</Tag>
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
              {orderedModuleDefinitions.map((module) => {
                const isHidden = module.key !== 'personal-info' && hiddenSections.includes(module.key as ResumeSectionKey)

                return (
                <div className={`resume-editor-module-row${isHidden ? ' resume-editor-module-row--hidden' : ''}`} key={module.key}>
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

                  {module.removable ? (
                    <Space size={4}>
                      <Button
                        size="small"
                        type="text"
                        icon={<ArrowUpOutlined />}
                        onClick={() => onMoveSection(module.key as ResumeSectionKey, -1)}
                        disabled={sectionOrder.indexOf(module.key as ResumeSectionKey) === 0}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<ArrowDownOutlined />}
                        onClick={() => onMoveSection(module.key as ResumeSectionKey, 1)}
                        disabled={sectionOrder.indexOf(module.key as ResumeSectionKey) === sectionOrder.length - 1}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        onClick={() => (isHidden ? onShowSection(module.key as ResumeSectionKey) : onHideSection(module.key as ResumeSectionKey))}
                      />
                    </Space>
                  ) : (
                    <Tag color="default">固定</Tag>
                  )}
                </div>
                )
              })}
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
                      <Space
                        size={4}
                        onClick={(event) => {
                          event.stopPropagation()
                        }}
                      >
                        <Button
                          size="small"
                          type="text"
                          icon={<ArrowUpOutlined />}
                          onClick={() => onMoveSection(module.key as ResumeSectionKey, -1)}
                          disabled={sectionOrder.indexOf(module.key as ResumeSectionKey) === 0}
                        />
                        <Button
                          size="small"
                          type="text"
                          icon={<ArrowDownOutlined />}
                          onClick={() => onMoveSection(module.key as ResumeSectionKey, 1)}
                          disabled={sectionOrder.indexOf(module.key as ResumeSectionKey) === sectionOrder.length - 1}
                        />
                        <Button
                          size="small"
                          type="text"
                          icon={isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          onClick={() => (isHidden ? onShowSection(module.key as ResumeSectionKey) : onHideSection(module.key as ResumeSectionKey))}
                        />
                      </Space>
                    ) : null,
                    children: (
                      <div id={moduleAnchorId(module.key)}>
                        {renderModuleContent(
                          module.key,
                          draft,
                          onUpdateDraft,
                          avatarInputRef,
                          handleAvatarFileChange,
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
                    previewMode="a4-fit"
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
              previewMode="a4-fit"
            />
          ) : null}
        </div>
      </Modal>
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
  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}
    >
      {children}
    </div>
  )
}

function renderModuleContent(
  moduleKey: ResumeModuleId,
  draft: ResumeDetail,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  avatarInputRef: { current: HTMLInputElement | null },
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void,
  onAvatarPickerOpen: () => void,
  onAvatarRemove: () => void,
) {
  if (moduleKey === 'personal-info') {
    return (
      <div className="resume-editor-personal-info">
        <div className="resume-editor-avatar-field">
          <input
            ref={avatarInputRef}
            className="resume-editor-avatar-field__input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onAvatarFileChange}
          />
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
          <Input
            value={draft.content.personalInfo.fullName}
            onChange={(event) => updateDraft((next) => { next.content.personalInfo.fullName = event.target.value })}
            placeholder="姓名"
          />
          <Input
            value={draft.content.personalInfo.headline}
            onChange={(event) => updateDraft((next) => { next.content.personalInfo.headline = event.target.value })}
            placeholder="职位 / 头衔"
          />
          <Input
            value={draft.content.personalInfo.phone}
            onChange={(event) => updateDraft((next) => { next.content.personalInfo.phone = event.target.value })}
            placeholder="电话"
          />
          <Input
            value={draft.content.personalInfo.email}
            onChange={(event) => updateDraft((next) => { next.content.personalInfo.email = event.target.value })}
            placeholder="邮箱"
          />
          <Input
            value={draft.content.personalInfo.city}
            onChange={(event) => updateDraft((next) => { next.content.personalInfo.city = event.target.value })}
            placeholder="所在城市"
          />
          <Input
            value={draft.content.personalInfo.website}
            onChange={(event) => updateDraft((next) => { next.content.personalInfo.website = event.target.value })}
            placeholder="个人网站 / 作品集"
          />
          <Input
            value={draft.content.personalInfo.expectedSalary}
            onChange={(event) => updateDraft((next) => { next.content.personalInfo.expectedSalary = event.target.value })}
            placeholder="期望薪资"
          />
        </SectionGrid>
      </div>
    )
  }

  switch (moduleKey) {
    case 'summary':
      return (
        <TextArea
          rows={6}
          value={draft.content.personalSummary}
          onChange={(event) => updateDraft((next) => { next.content.personalSummary = event.target.value })}
          placeholder="用一段短文概括你的优势、方向和关键成果。"
        />
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
        <Input value={item.school} placeholder="学校" onChange={(event) => updateDraft((next) => { next.content.education[index].school = event.target.value })} />
        <Input value={item.degree} placeholder="学位" onChange={(event) => updateDraft((next) => { next.content.education[index].degree = event.target.value })} />
        <Input value={item.major} placeholder="专业" onChange={(event) => updateDraft((next) => { next.content.education[index].major = event.target.value })} />
        <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.education[index].startDate = event.target.value })} />
        <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.education[index].endDate = event.target.value })} />
        <TextArea rows={3} value={item.description} placeholder="亮点描述" onChange={(event) => updateDraft((next) => { next.content.education[index].description = event.target.value })} />
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
        <Input value={item.company} placeholder="公司" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].company = event.target.value })} />
        <Input value={item.role} placeholder="职位" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].role = event.target.value })} />
        <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].startDate = event.target.value })} />
        <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].endDate = event.target.value })} />
        <TextArea rows={4} value={item.description} placeholder="工作内容、范围和成果" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].description = event.target.value })} />
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
        <Input value={item.name} placeholder="项目名称" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].name = event.target.value })} />
        <Input value={item.role} placeholder="角色" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].role = event.target.value })} />
        <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].startDate = event.target.value })} />
        <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].endDate = event.target.value })} />
        <TextArea rows={4} value={item.description} placeholder="项目描述、技术栈和成果" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].description = event.target.value })} />
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
        <Input value={item.name} placeholder="技能名称" onChange={(event) => updateDraft((next) => { next.content.skills[index].name = event.target.value })} />
        <Input value={item.level} placeholder="熟练度 / 等级" onChange={(event) => updateDraft((next) => { next.content.skills[index].level = event.target.value })} />
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
        <Input value={item.title} placeholder="奖项名称" onChange={(event) => updateDraft((next) => { next.content.honors[index].title = event.target.value })} />
        <Input value={item.issuer} placeholder="颁发机构" onChange={(event) => updateDraft((next) => { next.content.honors[index].issuer = event.target.value })} />
        <Input value={item.awardedAt} placeholder="获奖时间" onChange={(event) => updateDraft((next) => { next.content.honors[index].awardedAt = event.target.value })} />
        <TextArea rows={3} value={item.description} placeholder="奖项说明" onChange={(event) => updateDraft((next) => { next.content.honors[index].description = event.target.value })} />
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
        <Input value={item.name} placeholder="证书名称" onChange={(event) => updateDraft((next) => { next.content.certificates[index].name = event.target.value })} />
        <Input value={item.issuer} placeholder="签发机构" onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuer = event.target.value })} />
        <Input value={item.issuedAt} placeholder="签发时间" onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuedAt = event.target.value })} />
        <Input value={item.credentialId} placeholder="证书编号" onChange={(event) => updateDraft((next) => { next.content.certificates[index].credentialId = event.target.value })} />
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

function moduleAnchorId(moduleKey: ResumeModuleId) {
  return `resume-module-${moduleKey}`
}
