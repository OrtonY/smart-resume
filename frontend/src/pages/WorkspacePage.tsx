import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FileAddOutlined,
  InboxOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ResponsiveModal } from '../components/shared/ResponsiveModal'
import { LanguageSwitcher } from '../components/shared/LanguageSwitcher'
import { AiConfigurationButton } from '../features/ai/components/AiResumeAssistant'
import type { AiResumeSuggestion } from '../features/ai/types'
import { ResumeEditorView, type ResumeEditorSaveState } from '../features/resume/components/editor/ResumeEditorView'
import { moduleAnchorId, type ResumeModuleId, useResumeModuleDefinitions } from '../features/resume/components/editor/moduleDefinitions'
import { ResumeVisualGrid } from '../features/resume/components/ResumeVisualGrid'
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
import { RESUMES_PER_PAGE } from '../features/resume/constants'
import { exportResumePdf } from '../features/resume/export/pdfExport'
import { exportResumeServerPdf } from '../features/resume/export/serverPdfExport'
import { useResumeTemplateCatalog } from '../features/resume/hooks/useResumeTemplateCatalog'
import { useResumePreviewDetails } from '../features/resume/hooks/useResumePreviewDetails'
import { resolveResumeTemplate } from '../features/resume/templateCatalog'
import { createDefaultResumeLayout, normalizeResumeLayout } from '../features/resume/types'
import { WorkspaceSessionCard } from '../features/system/components/WorkspaceSessionCard'
import type { RegistrationSettingsResponse, SessionUser } from '../features/system/types'
import { copyToClipboard } from '../lib/copyToClipboard'
import { useIsMobile } from '../lib/hooks/useIsMobile'
import type {
  ResumeDetail,
  ResumeLayout,
  ResumePage,
  ResumeSectionKey,
  ResumeSummary,
  ShareAccessLog,
  ShareLink,
  ShareMode,
} from '../features/resume/types'

const { Text } = Typography

interface WorkspacePageProps {
  currentUser: SessionUser
  onLogout: () => void
  registrationEnabled: boolean
  onRegistrationEnabledChange: (enabled: boolean) => Promise<RegistrationSettingsResponse>
}

type ShareDialogState = {
  resumeId: string
  resumeTitle: string
} | null

const DEFAULT_LAYOUT = createDefaultResumeLayout()

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
  const moduleDefinitions = useResumeModuleDefinitions()
  const [resumeList, setResumeList] = useState<ResumeSummary[]>([])
  const [resumePage, setResumePage] = useState<ResumePage | null>(null)
  const [draft, setDraft] = useState<ResumeDetail | null>(null)
  const [loadingResumeList, setLoadingResumeList] = useState(true)
  const [loadingResumeDetail, setLoadingResumeDetail] = useState(false)
  const [saveState, setSaveState] = useState<ResumeEditorSaveState>('idle')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [lastSavedSignature, setLastSavedSignature] = useState('')
  const [expandedModules, setExpandedModules] = useState<ResumeModuleId[]>(['personal-info', ...DEFAULT_LAYOUT.sectionOrder])
  const deferredDraft = useDeferredValue(draft)
  const isEditorView = Boolean(resumeId)
  const isRecycleBinView = location.pathname === '/app/recycle-bin'

  const applyResumeDetail = useCallback((detail: ResumeDetail) => {
    const normalizedDetail = {
      ...detail,
      layout: normalizeResumeLayout(detail.layout),
    }

    setDraft(normalizedDetail)
    setLastSavedSignature(createResumeSignature(normalizedDetail))
    setExpandedModules(['personal-info', ...normalizedDetail.layout.sectionOrder])
    setSaveState('saved')
    setResumeList((current) =>
      current.map((item) =>
        item.id === normalizedDetail.id
          ? {
              ...item,
              title: normalizedDetail.title,
              templateKey: normalizedDetail.templateKey,
              updatedAt: normalizedDetail.updatedAt,
            }
          : item,
      ),
    )
    setResumePage((current) => current
      ? {
          ...current,
          items: current.items.map((item) =>
            item.id === normalizedDetail.id
              ? {
                  ...item,
                  title: normalizedDetail.title,
                  templateKey: normalizedDetail.templateKey,
                  updatedAt: normalizedDetail.updatedAt,
                }
              : item,
          ),
        }
      : current)
  }, [])

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

  const loadResumeDetail = useCallback(async (targetResumeId: string) => {
    setLoadingResumeDetail(true)
    try {
      applyResumeDetail(await getResume(targetResumeId))
    } catch (error) {
      setDraft(null)
      void message.error(error instanceof Error ? error.message : t('feedback.loadDetailFailed'))
    } finally {
      setLoadingResumeDetail(false)
    }
  }, [applyResumeDetail, message, t])

  const persistDraft = useCallback(async (targetResumeId: string, currentDraft: ResumeDetail) => {
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
  }, [message, t])

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
      moduleDefinitions[0],
      ...sectionOrder
        .map((key) => moduleDefinitions.find((item) => item.key === key))
        .filter((item): item is (typeof moduleDefinitions)[number] => Boolean(item)),
    ],
    [moduleDefinitions, sectionOrder],
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

  const updateLayout = useCallback((mutator: (next: ResumeLayout) => void) => {
    updateDraft((next) => {
      const nextLayout = normalizeResumeLayout(next.layout)
      mutator(nextLayout)
      next.layout = normalizeResumeLayout(nextLayout)
    })
  }, [updateDraft])

  const handlePageChange = useCallback(async (nextPage: number) => {
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
  }, [isRecycleBinView, message, t])

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

  async function handleRestoredVersion(restoredResume: ResumeDetail) {
    applyResumeDetail(restoredResume)
  }

  async function handleCreateShare(title: string, mode: ShareMode, password?: string) {
    if (!resumeId) {
      return
    }

    const share = await createShare(resumeId, title, mode, password)
    await copyToClipboard(`${window.location.origin}${share.sharePath}`)
    void message.success(mode === 'LATEST' ? t('feedback.shareCopiedLatest') : t('feedback.shareCopiedSnapshot'))
  }

  async function handleExportPdf(previewRoot?: HTMLElement | null) {
    if (!resumeId || !draft || exportingPdf) {
      return
    }

    setExportingPdf(true)
    try {
      try {
        await exportResumeServerPdf(resumeId, draft.title)
      } catch {
        if (!previewRoot) {
          throw new Error(t('feedback.exportPreviewMissing'))
        }

        await exportResumePdf(previewRoot, draft.title)
      }

      void message.success(t('feedback.exportPdfStart'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.exportPdfFailed'))
    } finally {
      setExportingPdf(false)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    updateLayout((nextLayout) => {
      const oldIndex = nextLayout.sectionOrder.indexOf(active.id as ResumeSectionKey)
      const newIndex = nextLayout.sectionOrder.indexOf(over.id as ResumeSectionKey)
      if (oldIndex !== -1 && newIndex !== -1) {
        nextLayout.sectionOrder = arrayMove(nextLayout.sectionOrder, oldIndex, newIndex)
      }
    })
  }

  function hideSection(sectionKey: ResumeSectionKey) {
    updateLayout((nextLayout) => {
      if (!nextLayout.hiddenSections.includes(sectionKey)) {
        nextLayout.hiddenSections = [...nextLayout.hiddenSections, sectionKey]
      }
    })
  }

  function showSection(sectionKey: ResumeSectionKey) {
    updateLayout((nextLayout) => {
      nextLayout.hiddenSections = nextLayout.hiddenSections.filter((key) => key !== sectionKey)
    })
  }

  const handleApplyPatch = useCallback((patch: AiResumeSuggestion) => {
    updateDraft((next) => {
      const { section, field, suggestedValue, index } = patch
      switch (section) {
        case 'personalSummary':
          next.content.personalSummary = suggestedValue
          return
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
        default:
          console.warn('[AI patch] unknown section:', section)
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

  if (isEditorView) {
    if (loadingResumeDetail) {
      return (
        <div className="workspace-loading-state">
          <Spin size="large" tip={t('editor.loading')} />
        </div>
      )
    }

    if (!draft) {
      return (
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
    }

    return (
      <ResumeEditorView
        draft={draft}
        deferredDraft={deferredDraft}
        expandedModules={expandedModules}
        exportingPdf={exportingPdf}
        hiddenSections={hiddenSections}
        loadingTemplates={loadingTemplates}
        onApplyPatch={handleApplyPatch}
        onCreateShare={handleCreateShare}
        onDragEnd={handleDragEnd}
        onExpandedModulesChange={handleExpandedModulesChange}
        onExportPdf={handleExportPdf}
        onFocusModule={focusModule}
        onHideSection={hideSection}
        onRestoredVersion={handleRestoredVersion}
        onShowSection={showSection}
        onUpdateDraft={updateDraft}
        orderedModuleDefinitions={orderedModuleDefinitions}
        saveState={saveState}
        sectionOrder={sectionOrder}
        templates={templates}
      />
    )
  }

  if (isRecycleBinView) {
    return (
      <RecycleBinView
        loadingResumeList={loadingResumeList}
        onPageChange={handlePageChange}
        onRestoreResume={handleRestoreResume}
        resumePage={resumePage}
        resumeList={resumeList}
        selectedTemplateName={(templateKey) => resolveResumeTemplate(templates, templateKey).name}
        templates={templates}
      />
    )
  }

  return (
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
  const { previewDetailsByResumeId } = useResumePreviewDetails(resumeList)

  const openShareDialog = useCallback(async (resume: ResumeSummary) => {
    setShareDialog({ resumeId: resume.id, resumeTitle: resume.title })
    setLoadingShareResumeId(resume.id)
    try {
      const shares = await listShares(resume.id)
      setShareLinksByResumeId((current) => ({ ...current, [resume.id]: shares }))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.loadShareLinksFailed'))
    } finally {
      setLoadingShareResumeId((current) => (current === resume.id ? null : current))
    }
  }, [message, t])

  const refreshShareLinks = useCallback(async () => {
    if (!shareDialog) {
      return
    }

    try {
      const shares = await listShares(shareDialog.resumeId)
      setShareLinksByResumeId((current) => ({ ...current, [shareDialog.resumeId]: shares }))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.refreshShareLinksFailed'))
    }
  }, [message, shareDialog, t])

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
                  <Button icon={<FileAddOutlined />}>{t('actions.templateGallery')}</Button>
                </Link>
                <Link to="/app/interviews">
                  <Button icon={<MessageOutlined />}>{t('actions.interviewCenter')}</Button>
                </Link>
                <AiConfigurationButton />
                <Link to="/app/recycle-bin">
                  <Button icon={<InboxOutlined />}>{t('actions.recycleBin')}</Button>
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

        <ResumeVisualGrid
          emptyDescription={t('list.empty')}
          emptySlotKeyPrefix="resume-empty-slot"
          loading={loadingResumeList}
          onCopyResume={onCopyResume}
          onDeleteResume={onDeleteResume}
          onOpenResume={onOpenResume}
          onOpenShareDialog={openShareDialog}
          onPageChange={onPageChange}
          previewDetailsByResumeId={previewDetailsByResumeId}
          resumeList={resumeList}
          resumePage={resumePage}
          selectedTemplateName={selectedTemplateName}
          templates={templates}
        />
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
  const { previewDetailsByResumeId } = useResumePreviewDetails(resumeList)

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
              <Button icon={<ArrowLeftOutlined />}>{t('actions.backToHome')}</Button>
            </Link>
          </div>
        </div>

        <div className="workspace-hub__toolbar">
          <Space wrap align="center">
            <Text strong>{t('recycle.deletedHeading')}</Text>
            <Tag color="red">{t('recycle.totalCount', { count: resumePage?.total ?? resumeList.length })}</Tag>
          </Space>
        </div>

        <ResumeVisualGrid
          emptyDescription={t('recycle.empty')}
          emptySlotKeyPrefix="recycle-empty-slot"
          loading={loadingResumeList}
          onPageChange={onPageChange}
          onRestoreResume={onRestoreResume}
          previewDetailsByResumeId={previewDetailsByResumeId}
          resumeList={resumeList}
          resumePage={resumePage}
          selectedTemplateName={selectedTemplateName}
          status="deleted"
          templates={templates}
        />
      </div>
    </div>
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

    if (!shareDialog) {
      return
    }

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
    if (!shareDialog) {
      return
    }

    try {
      await toggleShare(shareDialog.resumeId, share.shareCode)
      void message.success(share.active ? t('share.feedback2.disabled') : t('share.feedback2.enabled'))
      onRefresh()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('share.feedback2.operationFailed'))
    }
  }

  const handleDelete = async (share: ShareLink) => {
    if (!shareDialog) {
      return
    }

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
            const shareAvailable = share.active && !share.invalid

            return (
              <div key={share.shareCode} className="share-row" style={{ flexDirection: 'column', alignItems: 'stretch', opacity: shareAvailable ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Space direction="vertical" size={4}>
                    <Space wrap>
                      <Text strong>{share.title?.trim() ? share.title : t('share.linkUntitled')}</Text>
                      <Tag color={share.shareMode === 'LATEST' ? 'blue' : 'orange'}>
                        {share.shareMode === 'LATEST' ? t('share.modeTagLatest') : t('share.modeTagSnapshot')}
                      </Tag>
                      {share.hasPassword ? <Tag icon={<LockOutlined />} color="red">{t('share.passwordProtected')}</Tag> : null}
                      {share.invalid ? <Tag color="error">{t('share.invalid')}</Tag> : null}
                      {!share.active && !share.invalid ? <Tag color="default">{t('share.disabled')}</Tag> : null}
                      <Tag>{t('share.viewCount', { count: share.viewCount })}</Tag>
                    </Space>
                    <Text copyable={{ text: fullUrl }} style={shareAvailable ? undefined : { textDecoration: 'line-through' }}>
                      {fullUrl}
                    </Text>
                    <Space size={16}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('share.createdAt', { value: new Date(share.createdAt).toLocaleString() })}
                      </Text>
                      {share.lastAccessedAt ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t('share.lastAccessedAt', { value: new Date(share.lastAccessedAt).toLocaleString() })}
                        </Text>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('share.noVisits')}</Text>
                      )}
                    </Space>
                  </Space>

                  <Space size={4}>
                    <Button size="small" onClick={() => void handleToggleLogs(share)}>
                      {isExpanded ? t('common:actions.collapse') : t('common:actions.details')}
                    </Button>
                    <Tooltip title={share.invalid ? t('share.invalidEnableTooltip') : share.active ? t('share.toggleDisable') : t('share.toggleEnable')}>
                      <Button
                        size="small"
                        icon={share.active ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        disabled={share.invalid}
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
                        await copyToClipboard(fullUrl)
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
