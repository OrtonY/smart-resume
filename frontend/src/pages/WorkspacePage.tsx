import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FileAddOutlined,
  HolderOutlined,
  MenuOutlined,
  MessageOutlined,
  LockOutlined,
  LogoutOutlined,
  MoreOutlined,
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
  Drawer,
  Dropdown,
  Empty,
  Input,
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
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ResponsiveModal } from '../components/shared/ResponsiveModal'
import { useIsMobile } from '../lib/hooks/useIsMobile'
import { AiConfigurationButton, AiResumeAssistant } from '../features/ai/components/AiResumeAssistant'
import type { AiResumeSuggestion } from '../features/ai/types'
import { ResumeScoreButton } from '../features/ai/components/ResumeScoreButton'
import { WorkspaceSessionCard } from '../features/system/components/WorkspaceSessionCard'
import { LanguageSwitcher } from '../components/shared/LanguageSwitcher'
import { MarkdownComposer } from '../lib/markdown/MarkdownComposer'
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
import { exportResumePdf } from '../features/resume/export/pdfExport'
import { exportResumeServerPdf } from '../features/resume/export/serverPdfExport'
import { useResumeTemplateCatalog } from '../features/resume/hooks/useResumeTemplateCatalog'
import {
  resolveResumeTemplate,
} from '../features/resume/templateCatalog'
import type {
  RegistrationSettingsResponse,
  SessionUser,
} from '../features/system/types'
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
  currentUser: SessionUser
  onLogout: () => void
  registrationEnabled: boolean
  onRegistrationEnabledChange: (enabled: boolean) => Promise<RegistrationSettingsResponse>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'save_failed'
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

const MODULE_KEYS: Array<{ key: ResumeModuleId; titleKey: string; descKey: string; removable: boolean }> = [
  { key: 'personal-info', titleKey: 'modules.personalInfo.title', descKey: 'modules.personalInfo.description', removable: false },
  { key: 'summary', titleKey: 'modules.summary.title', descKey: 'modules.summary.description', removable: true },
  { key: 'workExperience', titleKey: 'modules.workExperience.title', descKey: 'modules.workExperience.description', removable: true },
  { key: 'projectExperience', titleKey: 'modules.projectExperience.title', descKey: 'modules.projectExperience.description', removable: true },
  { key: 'education', titleKey: 'modules.education.title', descKey: 'modules.education.description', removable: true },
  { key: 'skills', titleKey: 'modules.skills.title', descKey: 'modules.skills.description', removable: true },
  { key: 'honors', titleKey: 'modules.honors.title', descKey: 'modules.honors.description', removable: true },
  { key: 'certificates', titleKey: 'modules.certificates.title', descKey: 'modules.certificates.description', removable: true },
]

function useModuleDefinitions(): ResumeModuleDefinition[] {
  const { t } = useTranslation('workspace')
  return useMemo(
    () => MODULE_KEYS.map((m) => ({ key: m.key, title: t(m.titleKey), description: t(m.descKey), removable: m.removable })),
    [t],
  )
}

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

export function WorkspacePage({
  currentUser,
  onLogout,
  registrationEnabled,
  onRegistrationEnabledChange,
}: WorkspacePageProps) {
  const { t } = useTranslation('workspace')
  const navigate = useNavigate()
  const location = useLocation()
  const { resumeId } = useParams()
  const { message } = App.useApp()
  const { templates, loading: loadingTemplates } = useResumeTemplateCatalog({ scope: 'managed' })
  const MODULE_DEFINITIONS = useModuleDefinitions()
  const [resumeList, setResumeList] = useState<ResumeSummary[]>([])
  const [resumePage, setResumePage] = useState<ResumePage | null>(null)
  const [draft, setDraft] = useState<ResumeDetail | null>(null)
  const [loadingResumeList, setLoadingResumeList] = useState(true)
  const [loadingResumeDetail, setLoadingResumeDetail] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [exportingPdf, setExportingPdf] = useState(false)
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
      void message.error(error instanceof Error ? error.message : t('feedback.loadListFailed'))
    } finally {
      setLoadingResumeList(false)
    }
  }, [isRecycleBinView, message, t])

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
        void message.error(error instanceof Error ? error.message : t('feedback.loadDetailFailed'))
      } finally {
        setLoadingResumeDetail(false)
      }
    },
    [message, t],
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
        void message.error(error instanceof Error ? error.message : t('feedback.saveAutoFailed'))
      }
    },
    [message, t],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResumeList()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [currentUser.userId, loadResumeList])

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
    [MODULE_DEFINITIONS, sectionOrder],
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
        void message.error(error instanceof Error ? error.message : t('feedback.loadListFailed'))
      } finally {
        setLoadingResumeList(false)
      }
    },
    [isRecycleBinView, message, t],
  )

  async function handleDeleteResume(targetResumeId: string) {
    await deleteResume(targetResumeId)
    void message.success(t('feedback.moveToBinSuccess'))

    if (resumeId === targetResumeId) {
      navigate('/app')
    }

    await loadResumeList()
  }

  async function handleCopyResume(targetResumeId: string, title: string) {
    await copyResume(targetResumeId, { title })
    void message.success(t('feedback.copySuccess'))
    await loadResumeList()
  }

  async function handleRestoreResume(targetResumeId: string) {
    await restoreResume(targetResumeId)
    void message.success(t('feedback.restoreSuccess'))
    await loadResumeList()
  }

  async function handleCreateShare(title: string, mode: ShareMode, password?: string) {
    if (!resumeId) {
      return
    }

    const share = await createShare(resumeId, title, mode, password)
    await navigator.clipboard.writeText(`${window.location.origin}${share.sharePath}`)
    void message.success(mode === 'LATEST' ? t('feedback.shareCopiedLatest') : t('feedback.shareCopiedSnapshot'))
  }

  async function handleExportPdf(previewRoot?: HTMLElement | null) {
    if (!resumeId || !draft || exportingPdf) {
      return
    }

    setExportingPdf(true)
    try {
      if (!previewRoot) {
        throw new Error(t('feedback.exportPreviewMissing'))
      }

      await exportResumePdf(previewRoot, draft.title)
      void message.success(t('feedback.exportPdfStart'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.exportPdfFailed'))
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleExportServerPdf() {
    if (!resumeId || !draft || exportingPdf) {
      return
    }

    setExportingPdf(true)
    try {
      await exportResumeServerPdf(resumeId, draft.title)
      void message.success(t('feedback.exportPdfStart'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.exportPdfFailed'))
    } finally {
      setExportingPdf(false)
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

  const handleApplyPatch = useCallback((patch: AiResumeSuggestion) => {
    updateDraft((next) => {
      const { section, field, suggestedValue, index } = patch
      switch (section) {
        case 'personalSummary': {
          next.content.personalSummary = suggestedValue
          return
        }
        case 'personalInfo': {
          const target = next.content.personalInfo as unknown as Record<string, string>
          if (!(field in target)) {
            console.warn('[AI patch] unknown personalInfo field:', field)
            return
          }
          target[field] = suggestedValue
          return
        }
        case 'education':
        case 'workExperience':
        case 'projectExperience':
        case 'skills':
        case 'honors':
        case 'certificates': {
          const list = next.content[section] as unknown as Array<Record<string, string>>
          if (typeof index !== 'number' || index < 0 || index >= list.length) {
            console.warn('[AI patch] index out of range for', section, index)
            return
          }
          const target = list[index]
          if (!(field in target)) {
            console.warn('[AI patch] unknown field for', section, field)
            return
          }
          target[field] = suggestedValue
          return
        }
        default: {
          console.warn('[AI patch] unknown section:', section)
        }
      }
    })
  }, [updateDraft])

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
        <Spin size="large" tip={t('editor.loading')} />
      </div>
    ) : draft ? (
      <ResumeEditorView
        draft={draft}
        deferredDraft={deferredDraft}
        expandedModules={expandedModules}
        hiddenSections={hiddenSections}
        loadingTemplates={loadingTemplates}
        onApplyPatch={handleApplyPatch}
        onCreateShare={handleCreateShare}
        exportingPdf={exportingPdf}
        onExportPdf={handleExportPdf}
        onExportServerPdf={handleExportServerPdf}
        onExpandedModulesChange={handleExpandedModulesChange}
        onFocusModule={focusModule}
        onHideSection={hideSection}
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
          <Empty description={t('editor.missing')} />
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/app')}>
              {t('actions.backToResumeList')}
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
        onRestoreResume={handleRestoreResume}
        resumePage={resumePage}
        resumeList={resumeList}
        selectedTemplateName={(templateKey) => resolveResumeTemplate(templates, templateKey).name}
        templates={templates}
      />
    ) : (
      <ResumeListView
        currentUser={currentUser}
        loadingResumeList={loadingResumeList}
        onCopyResume={handleCopyResume}
        onDeleteResume={handleDeleteResume}
        onPageChange={handlePageChange}
        onRegistrationEnabledChange={onRegistrationEnabledChange}
        onLogout={onLogout}
        onOpenResume={(targetResumeId) => navigate(`/app/resumes/${targetResumeId}`)}
        registrationEnabled={registrationEnabled}
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
  currentUser,
  loadingResumeList,
  onCopyResume,
  onDeleteResume,
  onPageChange,
  onRegistrationEnabledChange,
  onLogout,
  onOpenResume,
  registrationEnabled,
  resumePage,
  resumeList,
  selectedTemplateName,
  templates,
}: {
  currentUser: SessionUser
  loadingResumeList: boolean
  onCopyResume: (resumeId: string, title: string) => Promise<void>
  onDeleteResume: (resumeId: string) => Promise<void>
  onPageChange: (page: number) => Promise<void>
  onRegistrationEnabledChange: (enabled: boolean) => Promise<RegistrationSettingsResponse>
  onLogout: () => void
  onOpenResume: (resumeId: string) => void
  registrationEnabled: boolean
  resumePage: ResumePage | null
  resumeList: ResumeSummary[]
  selectedTemplateName: (templateKey: string) => string
  templates: ReturnType<typeof useResumeTemplateCatalog>['templates']
}) {
  const { t } = useTranslation('workspace')
  const { message } = App.useApp()
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
      void message.error(error instanceof Error ? error.message : t('feedback.loadShareLinksFailed'))
    } finally {
      setLoadingShareResumeId((current) => (current === resume.id ? null : current))
    }
  }, [message, t])

  const refreshShareLinks = useCallback(async () => {
    if (!shareDialog) return
    try {
      const shares = await listShares(shareDialog.resumeId)
      setShareLinksByResumeId((current) => ({
        ...current,
        [shareDialog.resumeId]: shares,
      }))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.refreshShareLinksFailed'))
    }
  }, [shareDialog, message, t])

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
            <Tag color="blue">{t('hero.tag')}</Tag>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.subtitle')}</p>
          </div>

          <div className="workspace-hub__actions">
            {isMobile ? (
              <>
                <LanguageSwitcher />
                <WorkspaceSessionCard
                  currentUser={currentUser}
                  registrationEnabled={registrationEnabled}
                  onRegistrationEnabledChange={onRegistrationEnabledChange}
                  onLogout={onLogout}
                />
                <Button icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} />
                <Drawer
                  open={mobileMenuOpen}
                  onClose={() => setMobileMenuOpen(false)}
                  placement="right"
                  width={260}
                  title={null}
                  push={false}
                  className="workspace-mobile-drawer"
                >
                  <div className="workspace-mobile-drawer-list">
                    <Link to="/app/templates" onClick={() => setMobileMenuOpen(false)}>
                      <Button icon={<FileAddOutlined />} block>
                        {t('actions.templateGallery')}
                      </Button>
                    </Link>
                    <Link to="/app/interviews" onClick={() => setMobileMenuOpen(false)}>
                      <Button icon={<MessageOutlined />} block>
                        {t('actions.interviewCenter')}
                      </Button>
                    </Link>
                    <AiConfigurationButton />
                    <Link to="/app/recycle-bin" onClick={() => setMobileMenuOpen(false)}>
                      <Button icon={<InboxOutlined />} block>
                        {t('actions.recycleBin')}
                      </Button>
                    </Link>
                    <div className="workspace-mobile-drawer__divider" />
                    <Button icon={<LogoutOutlined />} onClick={onLogout} block>
                      {t('actions.lockWorkspace')}
                    </Button>
                  </div>
                </Drawer>
              </>
            ) : (
              <>
                <Link to="/app/templates">
                  <Button icon={<FileAddOutlined />}>
                    {t('actions.templateGallery')}
                  </Button>
                </Link>
                <Link to="/app/interviews">
                  <Button icon={<MessageOutlined />}>
                    {t('actions.interviewCenter')}
                  </Button>
                </Link>
                <AiConfigurationButton />
                <Link to="/app/recycle-bin">
                  <Button icon={<InboxOutlined />}>
                    {t('actions.recycleBin')}
                  </Button>
                </Link>
                <WorkspaceSessionCard
                  currentUser={currentUser}
                  registrationEnabled={registrationEnabled}
                  onRegistrationEnabledChange={onRegistrationEnabledChange}
                  onLogout={onLogout}
                />
                <LanguageSwitcher />
                <Button icon={<LogoutOutlined />} onClick={onLogout}>
                  {t('actions.lockWorkspace')}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="workspace-hub__toolbar">
          <Space wrap align="center">
            <Text strong>{t('list.myResumes')}</Text>
            <Tag color="blue">{t('list.totalCount', { count: resumePage?.total ?? resumeList.length })}</Tag>
          </Space>
          {(resumePage?.total ?? resumeList.length) > RESUMES_PER_PAGE ? (
            <Text type="secondary">{t('list.perPageHint', { count: RESUMES_PER_PAGE })}</Text>
          ) : null}
        </div>

        {loadingResumeList ? (
          <div className="workspace-loading-state">
            <Spin size="large" />
          </div>
        ) : resumeList.length === 0 ? (
          <Card className="glass-card workspace-hub__empty" bordered={false}>
            <Empty description={t('list.empty')} />
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
  const { t } = useTranslation('workspace')
  const { message: cardMessage } = App.useApp()
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copyTitle, setCopyTitle] = useState('')
  const [copying, setCopying] = useState(false)

  const openCopyDialog = () => {
    setCopyTitle(`${item.title} ${t('copyDialog.copySuffix')}`)
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
      void cardMessage.warning(t('copyDialog.warningEmpty'))
      return
    }
    setCopying(true)
    try {
      await onCopyResume(item.id, trimmed)
      setCopyDialogOpen(false)
    } catch (error) {
      void cardMessage.error(error instanceof Error ? error.message : t('copyDialog.errorFailed'))
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
          <Text type="secondary">{loadingPreview ? t('list.previewGenerating') : selectedTemplateName}</Text>
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
          aria-label={t('list.openResume', { title: item.title })}
        >
          {preview}
        </button>
      ) : (
        <div className="resume-list-card__preview-button" aria-label={t('list.previewLabel', { title: item.title })}>
          {preview}
        </div>
      )}

      {onOpenShareDialog ? (
        <Button
          className="resume-list-card__share-action"
          shape="circle"
          icon={<ShareAltOutlined />}
          onClick={() => void onOpenShareDialog(item)}
          aria-label={t('actions.openShareDialog')}
        />
      ) : null}

      <div className="resume-list-card__body">
        <div className="resume-list-card__topline">
          <Tag color="default">{selectedTemplateName}</Tag>
          <Tag color={status === 'deleted' ? 'red' : 'blue'}>{status === 'deleted' ? t('list.tagDeleted') : t('list.tagEditable')}</Tag>
        </div>
        <strong>{item.title}</strong>
        <p>{status === 'deleted' ? t('list.deletedAt') : t('list.updatedAt')} {new Date(item.updatedAt).toLocaleString()}</p>
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
            {t('card.restore')}
          </Button>
        ) : null}

        {onCopyResume ? (
          <Button
            icon={<CopyOutlined />}
            onClick={openCopyDialog}
          >
            {t('card.copy')}
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
            {t('card.delete')}
          </Button>
        ) : null}
      </div>

      {onCopyResume ? (
        <ResponsiveModal
          title={t('copyDialog.title')}
          open={copyDialogOpen}
          onCancel={closeCopyDialog}
          onOk={() => void submitCopy()}
          okText={t('copyDialog.okText')}
          cancelText={t('copyDialog.cancelText')}
          confirmLoading={copying}
          destroyOnHidden
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text>{t('copyDialog.prompt')}</Text>
            <Input
              autoFocus
              value={copyTitle}
              maxLength={200}
              placeholder={t('copyDialog.placeholder')}
              onChange={(event) => setCopyTitle(event.target.value)}
              onPressEnter={() => void submitCopy()}
            />
          </Space>
        </ResponsiveModal>
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
  const { t } = useTranslation('workspace')
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
      void message.error(error instanceof Error ? error.message : t('share.feedback2.loadLogsFailed'))
      setAccessLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleToggleActive = async (share: ShareLink) => {
    if (!shareDialog) return
    try {
      await toggleShare(shareDialog.resumeId, share.shareCode)
      void message.success(share.active ? t('share.feedback2.disabled') : t('share.feedback2.enabled'))
      onRefresh()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('share.feedback2.operationFailed'))
    }
  }

  const handleDelete = async (share: ShareLink) => {
    if (!shareDialog) return
    try {
      await deleteShare(shareDialog.resumeId, share.shareCode)
      void message.success(t('share.feedback2.deleted'))
      onRefresh()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('share.feedback2.deleteFailed'))
    }
  }

  return (
    <ResponsiveModal
      title={shareDialog ? t('share.linksTitle', { title: shareDialog.resumeTitle }) : t('share.linksTitleFallback')}
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
        <Empty description={t('share.linksEmpty')} />
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
                      <Text strong>{share.title?.trim() ? share.title : t('share.linkUntitled')}</Text>
                      <Tag color={share.shareMode === 'LATEST' ? 'blue' : 'orange'}>
                        {share.shareMode === 'LATEST' ? t('share.modeTagLatest') : t('share.modeTagSnapshot')}
                      </Tag>
                      {share.hasPassword ? <Tag icon={<LockOutlined />} color="red">{t('share.passwordProtected')}</Tag> : null}
                      {!share.active ? <Tag color="default">{t('share.disabled')}</Tag> : null}
                      <Tag>{t('share.viewCount', { count: share.viewCount })}</Tag>
                    </Space>
                    <Text copyable={{ text: fullUrl }} style={share.active ? undefined : { textDecoration: 'line-through' }}>{fullUrl}</Text>
                    <Space size={16}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{t('share.createdAt', { value: new Date(share.createdAt).toLocaleString() })}</Text>
                      {share.lastAccessedAt ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('share.lastAccessedAt', { value: new Date(share.lastAccessedAt).toLocaleString() })}</Text>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('share.noVisits')}</Text>
                      )}
                    </Space>
                  </Space>

                  <Space size={4}>
                    <Button
                      size="small"
                      onClick={() => void handleToggleLogs(share)}
                    >
                      {isExpanded ? t('common:actions.collapse') : t('common:actions.details')}
                    </Button>
                    <Tooltip title={share.active ? t('share.toggleDisable') : t('share.toggleEnable')}>
                      <Button
                        size="small"
                        icon={share.active ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => void handleToggleActive(share)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title={t('share.deleteConfirmTitle')}
                      description={t('share.deleteConfirmDescription')}
                      onConfirm={() => void handleDelete(share)}
                      okText={t('share.deleteOk')}
                      cancelText={t('common:actions.cancel')}
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title={t('common:actions.delete')}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={async () => {
                        await navigator.clipboard.writeText(fullUrl)
                        void message.success(t('share.feedback2.linkCopied'))
                      }}
                    >
                      {t('common:actions.copy')}
                    </Button>
                  </Space>
                </div>

                {isExpanded ? (
                  <div style={{ marginTop: 12, paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
                    {loadingLogs ? (
                      <Spin size="small" />
                    ) : accessLogs.length === 0 ? (
                      <Text type="secondary">{t('share.noLogs')}</Text>
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
    </ResponsiveModal>
  )
}

function RecycleBinView({
  loadingResumeList,
  onPageChange,
  onRestoreResume,
  resumePage,
  resumeList,
  selectedTemplateName,
  templates,
}: {
  loadingResumeList: boolean
  onPageChange: (page: number) => Promise<void>
  onRestoreResume: (resumeId: string) => Promise<void>
  resumePage: ResumePage | null
  resumeList: ResumeSummary[]
  selectedTemplateName: (templateKey: string) => string
  templates: ReturnType<typeof useResumeTemplateCatalog>['templates']
}) {
  const { t } = useTranslation('workspace')
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
            <Tag color="default">{t('recycle.tag')}</Tag>
            <h1>{t('recycle.title')}</h1>
            <p>{t('recycle.subtitle')}</p>
          </div>

          <div className="workspace-hub__actions">
            <Link to="/app">
              <Button icon={<ArrowLeftOutlined />}>
                {t('actions.backToHome')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="workspace-hub__toolbar">
          <Space wrap align="center">
            <Text strong>{t('recycle.deletedHeading')}</Text>
            <Tag color="red">{t('recycle.totalCount', { count: resumePage?.total ?? resumeList.length })}</Tag>
          </Space>
        </div>

        {loadingResumeList ? (
          <div className="workspace-loading-state">
            <Spin size="large" />
          </div>
        ) : resumeList.length === 0 ? (
          <Card className="glass-card workspace-hub__empty" bordered={false}>
            <Empty description={t('recycle.empty')} />
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
  onApplyPatch,
  onCreateShare,
  exportingPdf,
  onExpandedModulesChange,
  onExportPdf,
  onExportServerPdf,
  onFocusModule,
  onHideSection,
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
  onApplyPatch: (patch: AiResumeSuggestion) => void
  onCreateShare: (title: string, mode: ShareMode, password?: string) => Promise<void>
  exportingPdf: boolean
  onExpandedModulesChange: (keys: string | string[]) => void
  onExportPdf: (previewRoot?: HTMLElement | null) => Promise<void>
  onExportServerPdf: () => Promise<void>
  onFocusModule: (moduleKey: ResumeModuleId) => void
  onHideSection: (sectionKey: ResumeSectionKey) => void
  onDragEnd: (event: DragEndEvent) => void
  onShowSection: (sectionKey: ResumeSectionKey) => void
  onUpdateDraft: (mutator: (next: ResumeDetail) => void) => void
  saveState: SaveState
  sectionOrder: ResumeSectionKey[]
  templates: ReturnType<typeof useResumeTemplateCatalog>['templates']
  orderedModuleDefinitions: ResumeModuleDefinition[]
}) {
  const { t } = useTranslation('workspace')
  const { message } = App.useApp()
  const isMobile = useIsMobile()
  const [mobileEditorTab, setMobileEditorTab] = useState<'structure' | 'content' | 'preview'>('content')
  const selectedTemplate = resolveResumeTemplate(templates, draft.templateKey)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareTitle, setShareTitle] = useState('')
  const [shareMode, setShareMode] = useState<ShareMode>('LATEST')
  const [sharePasswordEnabled, setSharePasswordEnabled] = useState(false)
  const [sharePassword, setSharePassword] = useState('')
  const [creatingShare, setCreatingShare] = useState(false)
  const exportPreviewRef = useRef<HTMLDivElement | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const personalInfoModule = orderedModuleDefinitions.find((module) => module.key === 'personal-info')
  const sortableModules = orderedModuleDefinitions.filter((module) => module.key !== 'personal-info')

  const interviewMenuItems = [
    {
      key: 'create',
      label: <Link to={`/app/interviews?create=1&resumeId=${draft.id}`}>{t('editor.interviewMenu.create')}</Link>,
    },
    {
      key: 'related',
      label: <Link to={`/app/interviews?resumeId=${draft.id}`}>{t('editor.interviewMenu.related')}</Link>,
    },
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
      void message.error(t('modules.personalInfo.avatarOnlyImage'))
      return
    }

    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      void message.error(t('modules.personalInfo.avatarTooLarge'))
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)

      onUpdateDraft((next) => {
        next.content.personalInfo.avatar = dataUrl
      })
      void message.success(t('modules.personalInfo.avatarUpdated'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('modules.personalInfo.avatarReadFailed'))
    }
  }, [message, onUpdateDraft, t])

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
                <Button icon={<ArrowLeftOutlined />}>{t('actions.backToList')}</Button>
              </Link>
              <Tag color="gold">{selectedTemplate.category}</Tag>
              <Tag className="save-state" color={saveStateColor(saveState)}>
                {saveStateLabel(saveState, t)}
              </Tag>
              {loadingTemplates ? <Tag color="processing">{t('editor.templateSyncing')}</Tag> : null}
            </Space>

            <Input
              size="large"
              value={draft.title}
              onChange={(event) => onUpdateDraft((next) => { next.title = event.target.value })}
              placeholder={t('editor.titlePlaceholder')}
            />
          </div>

          <Space wrap className="resume-editor-shell__actions resume-editor-shell__actions--desktop">
            <Link to={`/app/templates?resumeId=${draft.id}`}>
              <Button>{t('editor.modifyTemplate')}</Button>
            </Link>
            <Dropdown menu={{ items: interviewMenuItems }}>
              <Button icon={<MessageOutlined />}>{t('editor.interview')}</Button>
            </Dropdown>
            <ResumeScoreButton draft={draft} />
            <Button icon={<ShareAltOutlined />} onClick={() => {
              setShareModalOpen(true)
              setShareTitle('')
              setShareMode('LATEST')
              setSharePasswordEnabled(false)
              setSharePassword('')
            }}>{t('editor.share')}</Button>
            <Dropdown menu={{ items: [
              { key: 'exportServerPdf', label: t('editor.exportServerPdf'), icon: <DownloadOutlined />, disabled: exportingPdf, onClick: () => void onExportServerPdf() },
              { key: 'exportQuickPdf', label: t('editor.exportQuickPdf'), icon: <DownloadOutlined />, disabled: exportingPdf, onClick: () => void onExportPdf(exportPreviewRef.current) },
            ] }}>
              <Button icon={<DownloadOutlined />} loading={exportingPdf}>{t('editor.exportPdf')}</Button>
            </Dropdown>
          </Space>

          <Space wrap className="resume-editor-shell__actions resume-editor-shell__actions--mobile" style={{ display: 'none' }}>
            <ResumeScoreButton draft={draft} />
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'modifyTemplate',
                    label: <Link to={`/app/templates?resumeId=${draft.id}`}>{t('editor.modifyTemplate')}</Link>,
                  },
                  ...interviewMenuItems.map((item) => ({ ...item, key: `interview-${item.key}` })),
                  {
                    key: 'share',
                    label: t('editor.share'),
                    icon: <ShareAltOutlined />,
                    onClick: () => {
                      setShareModalOpen(true)
                      setShareTitle('')
                      setShareMode('LATEST')
                      setSharePasswordEnabled(false)
                      setSharePassword('')
                    },
                  },
                  {
                    key: 'exportServerPdf',
                    label: t('editor.exportServerPdf'),
                    icon: <DownloadOutlined />,
                    disabled: exportingPdf,
                    onClick: () => void onExportServerPdf(),
                  },
                  {
                    key: 'exportQuickPdf',
                    label: t('editor.exportQuickPdf'),
                    icon: <DownloadOutlined />,
                    disabled: exportingPdf,
                    onClick: () => void onExportPdf(exportPreviewRef.current),
                  },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} aria-label={t('editor.moreActionsAria')}>
                {t('editor.moreActions')}
              </Button>
            </Dropdown>
          </Space>
        </div>

        {isMobile ? (
          <div className="resume-editor-mobile-tabs">
            <Radio.Group
              value={mobileEditorTab}
              onChange={(e) => setMobileEditorTab(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="middle"
            >
              <Radio.Button value="structure">{t('editor.tabStructure')}</Radio.Button>
              <Radio.Button value="content">{t('editor.tabContent')}</Radio.Button>
              <Radio.Button value="preview">{t('editor.tabPreview')}</Radio.Button>
            </Radio.Group>
          </div>
        ) : null}

        <div className={`resume-editor-layout${isMobile ? ` resume-editor-layout--mobile-${mobileEditorTab}` : ''}`}>
          <Card className="glass-card resume-editor-rail" bordered={false}>
            <div className="resume-editor-rail__head">
              <div>
                <Text strong>{t('editor.structureTitle')}</Text>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {t('editor.structureDescription')}
                </Paragraph>
              </div>
              <Tag color="blue">{t('editor.moduleCount', { count: orderedModuleDefinitions.length })}</Tag>
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
                  <Tag color="default">{t('editor.fixedTag')}</Tag>
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
                          {isHidden ? <Tag color="default">{t('editor.previewHidden')}</Tag> : null}
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
                          t,
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
                    {t('editor.previewHint')}
                  </Paragraph>
                </>
              ) : (
                <EmptyPreview />
              )}
            </div>
          </div>
        </div>
      </div>

      <ResponsiveModal
        open={previewDialogOpen}
        onCancel={() => setPreviewDialogOpen(false)}
        footer={null}
        centered
        width={1040}
        destroyOnHidden
        title={t('editor.previewModalTitle')}
        mobileHeight="100dvh"
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
      </ResponsiveModal>

      <div className="resume-export-source" ref={exportPreviewRef} aria-hidden="true">
        <ResumePreview
          resume={draft}
          sectionOrder={sectionOrder}
          hiddenSections={hiddenSections}
          templates={templates}
          previewMode="a4-paged"
        />
      </div>

      <ResponsiveModal
        open={shareModalOpen}
        title={t('share.createTitle')}
        onCancel={() => setShareModalOpen(false)}
        onOk={async () => {
          const normalizedShareTitle = shareTitle.trim()
          if (!normalizedShareTitle) {
            void message.warning(t('share.warning.titleEmpty'))
            return
          }
          if (normalizedShareTitle.length > 50) {
            void message.warning(t('share.warning.titleTooLong'))
            return
          }
          if (sharePasswordEnabled && !sharePassword.trim()) {
            void message.warning(t('share.warning.passwordEmpty'))
            return
          }
          setCreatingShare(true)
          try {
            await onCreateShare(normalizedShareTitle, shareMode, sharePasswordEnabled ? sharePassword.trim() : undefined)
            setShareModalOpen(false)
          } catch (error) {
            void message.error(error instanceof Error ? error.message : t('share.feedback.createFailed'))
          } finally {
            setCreatingShare(false)
          }
        }}
        okText={t('share.okText')}
        cancelText={t('share.cancelText')}
        confirmLoading={creatingShare}
        destroyOnHidden
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('share.titleLabel')}</Text>
            <Input
              value={shareTitle}
              onChange={(event) => setShareTitle(event.target.value)}
              maxLength={50}
              placeholder={t('share.titlePlaceholder')}
              showCount
            />
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('share.titleHint')}</Text>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('share.modeLabel')}</Text>
            <Radio.Group value={shareMode} onChange={(e) => setShareMode(e.target.value)}>
              <Radio.Button value="LATEST">{t('share.modeLatest')}</Radio.Button>
              <Radio.Button value="SNAPSHOT">{t('share.modeSnapshot')}</Radio.Button>
            </Radio.Group>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {shareMode === 'LATEST' ? t('share.modeLatestHint') : t('share.modeSnapshotHint')}
              </Text>
            </div>
          </div>

          <div>
            <Space style={{ marginBottom: 8 }}>
              <Text strong>{t('share.passwordLabel')}</Text>
              <Switch size="small" checked={sharePasswordEnabled} onChange={setSharePasswordEnabled} />
            </Space>
            {sharePasswordEnabled ? (
              <Input.Password
                placeholder={t('share.passwordPlaceholder')}
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                autoFocus
              />
            ) : (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('share.passwordHint')}</Text>
              </div>
            )}
          </div>
        </div>
      </ResponsiveModal>

      <AiResumeAssistant draft={draft} onApplyPatch={onApplyPatch} />
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

function saveStateLabel(saveState: SaveState, t: (key: string) => string) {
  switch (saveState) {
    case 'saving':
      return t('saveState.saving')
    case 'saved':
      return t('saveState.saved')
    case 'save_failed':
      return t('saveState.saveFailed')
    default:
      return t('saveState.idle')
  }
}

function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="resume-editor-section-grid">{children}</div>
}

function SectionGridFullWidth({ children }: { children: ReactNode }) {
  return <div className="resume-editor-section-grid__full">{children}</div>
}

function renderModuleContent(
  moduleKey: ResumeModuleId,
  draft: ResumeDetail,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  onAvatarPickerOpen: () => void,
  onAvatarRemove: () => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
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
            <Text strong>{t('modules.personalInfo.avatarTitle')}</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('modules.personalInfo.avatarHint')}
            </Paragraph>
            <Space wrap>
              <Button type="default" icon={<PlusOutlined />} onClick={onAvatarPickerOpen}>
                {draft.content.personalInfo.avatar ? t('modules.personalInfo.changeAvatar') : t('modules.personalInfo.uploadAvatar')}
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={onAvatarRemove}
                disabled={!draft.content.personalInfo.avatar}
              >
                {t('modules.personalInfo.removeAvatar')}
              </Button>
            </Space>
          </div>
        </div>

        <SectionGrid>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.fullName')}</Text>
            <Input
              value={draft.content.personalInfo.fullName}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.fullName = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.fullName')}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.headline')}</Text>
            <Input
              value={draft.content.personalInfo.headline}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.headline = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.headline')}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.phone')}</Text>
            <Input
              value={draft.content.personalInfo.phone}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.phone = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.phone')}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.email')}</Text>
            <Input
              value={draft.content.personalInfo.email}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.email = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.email')}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.city')}</Text>
            <Input
              value={draft.content.personalInfo.city}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.city = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.city')}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.website')}</Text>
            <Input
              value={draft.content.personalInfo.website}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.website = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.website')}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.expectedSalary')}</Text>
            <Input
              value={draft.content.personalInfo.expectedSalary}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.expectedSalary = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.expectedSalary')}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.personalInfo.fields.age')}</Text>
            <Input
              value={draft.content.personalInfo.age}
              onChange={(event) => updateDraft((next) => { next.content.personalInfo.age = event.target.value })}
              placeholder={t('modules.personalInfo.placeholder.age')}
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
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.summary.label')}</Text>
          <MarkdownComposer
            hidePreview
            autoSize={{ minRows: 6, maxRows: 12 }}
            value={draft.content.personalSummary}
            onChange={(val) => updateDraft((next) => { next.content.personalSummary = val })}
            placeholder={t('modules.summary.placeholder')}
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
      }, updateDraft, t)
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
      }, updateDraft, t)
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
      }, updateDraft, t)
    case 'skills':
      return renderSkillSection(draft.content.skills, () => {
        updateDraft((next) => {
          next.content.skills.push({ name: '', level: '' })
        })
      }, updateDraft, t)
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
      }, updateDraft, t)
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
      }, updateDraft, t)
    default:
      return null
  }
}

function renderEducationSection(
  items: EducationItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards<EducationItem>(
    items,
    addItem,
    (index) => t('modules.education.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.education.fields.school')}</Text>
          <Input value={item.school} placeholder={t('modules.education.placeholder.school')} onChange={(event) => updateDraft((next) => { next.content.education[index].school = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.education.fields.degree')}</Text>
          <Input value={item.degree} placeholder={t('modules.education.placeholder.degree')} onChange={(event) => updateDraft((next) => { next.content.education[index].degree = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.education.fields.major')}</Text>
          <Input value={item.major} placeholder={t('modules.education.placeholder.major')} onChange={(event) => updateDraft((next) => { next.content.education[index].major = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.education.fields.startDate')}</Text>
          <Input value={item.startDate} placeholder={t('modules.education.placeholder.startDate')} onChange={(event) => updateDraft((next) => { next.content.education[index].startDate = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.education.fields.endDate')}</Text>
          <Input value={item.endDate} placeholder={t('modules.education.placeholder.endDate')} onChange={(event) => updateDraft((next) => { next.content.education[index].endDate = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.education.fields.description')}</Text>
            <MarkdownComposer hidePreview autoSize={{ minRows: 3, maxRows: 8 }} value={item.description} placeholder={t('modules.education.placeholder.description')} onChange={(val) => updateDraft((next) => { next.content.education[index].description = val })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.education.splice(index, 1) }),
    t,
  )
}

function renderWorkSection(
  items: WorkExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards<WorkExperienceItem>(
    items,
    addItem,
    (index) => t('modules.workExperience.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.workExperience.fields.company')}</Text>
          <Input value={item.company} placeholder={t('modules.workExperience.placeholder.company')} onChange={(event) => updateDraft((next) => { next.content.workExperience[index].company = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.workExperience.fields.role')}</Text>
          <Input value={item.role} placeholder={t('modules.workExperience.placeholder.role')} onChange={(event) => updateDraft((next) => { next.content.workExperience[index].role = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.workExperience.fields.startDate')}</Text>
          <Input value={item.startDate} placeholder={t('modules.workExperience.placeholder.startDate')} onChange={(event) => updateDraft((next) => { next.content.workExperience[index].startDate = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.workExperience.fields.endDate')}</Text>
          <Input value={item.endDate} placeholder={t('modules.workExperience.placeholder.endDate')} onChange={(event) => updateDraft((next) => { next.content.workExperience[index].endDate = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.workExperience.fields.description')}</Text>
            <MarkdownComposer hidePreview autoSize={{ minRows: 4, maxRows: 10 }} value={item.description} placeholder={t('modules.workExperience.placeholder.description')} onChange={(val) => updateDraft((next) => { next.content.workExperience[index].description = val })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.workExperience.splice(index, 1) }),
    t,
  )
}

function renderProjectSection(
  items: ProjectExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards<ProjectExperienceItem>(
    items,
    addItem,
    (index) => t('modules.projectExperience.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.projectExperience.fields.name')}</Text>
          <Input value={item.name} placeholder={t('modules.projectExperience.placeholder.name')} onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].name = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.projectExperience.fields.role')}</Text>
          <Input value={item.role} placeholder={t('modules.projectExperience.placeholder.role')} onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].role = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.projectExperience.fields.startDate')}</Text>
          <Input value={item.startDate} placeholder={t('modules.projectExperience.placeholder.startDate')} onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].startDate = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.projectExperience.fields.endDate')}</Text>
          <Input value={item.endDate} placeholder={t('modules.projectExperience.placeholder.endDate')} onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].endDate = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.projectExperience.fields.description')}</Text>
            <MarkdownComposer hidePreview autoSize={{ minRows: 4, maxRows: 10 }} value={item.description} placeholder={t('modules.projectExperience.placeholder.description')} onChange={(val) => updateDraft((next) => { next.content.projectExperience[index].description = val })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.projectExperience.splice(index, 1) }),
    t,
  )
}

function renderSkillSection(
  items: SkillItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards<SkillItem>(
    items,
    addItem,
    (index) => t('modules.skills.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.skills.fields.name')}</Text>
          <Input value={item.name} placeholder={t('modules.skills.placeholder.name')} onChange={(event) => updateDraft((next) => { next.content.skills[index].name = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.skills.fields.level')}</Text>
          <Input value={item.level} placeholder={t('modules.skills.placeholder.level')} onChange={(event) => updateDraft((next) => { next.content.skills[index].level = event.target.value })} />
        </div>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.skills.splice(index, 1) }),
    t,
  )
}

function renderHonorSection(
  items: HonorItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards<HonorItem>(
    items,
    addItem,
    (index) => t('modules.honors.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.honors.fields.title')}</Text>
          <Input value={item.title} placeholder={t('modules.honors.placeholder.title')} onChange={(event) => updateDraft((next) => { next.content.honors[index].title = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.honors.fields.issuer')}</Text>
          <Input value={item.issuer} placeholder={t('modules.honors.placeholder.issuer')} onChange={(event) => updateDraft((next) => { next.content.honors[index].issuer = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.honors.fields.awardedAt')}</Text>
          <Input value={item.awardedAt} placeholder={t('modules.honors.placeholder.awardedAt')} onChange={(event) => updateDraft((next) => { next.content.honors[index].awardedAt = event.target.value })} />
        </div>
        <SectionGridFullWidth>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.honors.fields.description')}</Text>
            <MarkdownComposer hidePreview autoSize={{ minRows: 3, maxRows: 8 }} value={item.description} placeholder={t('modules.honors.placeholder.description')} onChange={(val) => updateDraft((next) => { next.content.honors[index].description = val })} />
          </div>
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.honors.splice(index, 1) }),
    t,
  )
}

function renderCertificateSection(
  items: CertificateItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards<CertificateItem>(
    items,
    addItem,
    (index) => t('modules.certificates.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.certificates.fields.name')}</Text>
          <Input value={item.name} placeholder={t('modules.certificates.placeholder.name')} onChange={(event) => updateDraft((next) => { next.content.certificates[index].name = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.certificates.fields.issuer')}</Text>
          <Input value={item.issuer} placeholder={t('modules.certificates.placeholder.issuer')} onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuer = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.certificates.fields.issuedAt')}</Text>
          <Input value={item.issuedAt} placeholder={t('modules.certificates.placeholder.issuedAt')} onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuedAt = event.target.value })} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('modules.certificates.fields.credentialId')}</Text>
          <Input value={item.credentialId} placeholder={t('modules.certificates.placeholder.credentialId')} onChange={(event) => updateDraft((next) => { next.content.certificates[index].credentialId = event.target.value })} />
        </div>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.certificates.splice(index, 1) }),
    t,
  )
}

function renderRepeatableCards<T>(
  items: T[],
  addItem: () => void,
  titleForIndex: (index: number) => string,
  renderFields: (item: T, index: number) => ReactNode,
  removeItem: (index: number) => void,
  t: (key: string) => string,
) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {items.length === 0 ? (
        <div className="empty-state">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('editor.noEntries')} />
        </div>
      ) : null}

      {items.map((item, index) => (
        <Card
          key={index}
          size="small"
          title={titleForIndex(index)}
          extra={(
            <Button danger type="text" onClick={() => removeItem(index)}>
              {t('editor.deleteEntry')}
            </Button>
          )}
        >
          {renderFields(item, index)}
        </Card>
      ))}

      <Button onClick={addItem} icon={<PlusOutlined />}>
        {t('editor.addEntry')}
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
  const { t } = useTranslation('workspace')
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
          {isHidden ? <Tag color="default">{t('editor.hiddenTag')}</Tag> : null}
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
