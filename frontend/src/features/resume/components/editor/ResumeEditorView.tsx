import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  HistoryOutlined,
  HolderOutlined,
  MessageOutlined,
  MoreOutlined,
  PlusOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Collapse,
  Dropdown,
  Empty,
  Input,
  Radio,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { useCallback, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { ResponsiveModal } from '../../../../components/shared/ResponsiveModal'
import { useIsMobile } from '../../../../lib/hooks/useIsMobile'
import { MarkdownComposer } from '../../../../lib/markdown/MarkdownComposer'
import { AiResumeAssistant } from '../../../ai/components/AiResumeAssistant'
import { ResumeScoreButton } from '../../../ai/components/ResumeScoreButton'
import type { AiResumeSuggestion } from '../../../ai/types'
import { resolveResumeTemplate, type ResumeTemplateDefinition } from '../../templateCatalog'
import type {
  CertificateItem,
  EducationItem,
  HonorItem,
  ProjectExperienceItem,
  ResumeDetail,
  ResumeSectionKey,
  ShareMode,
  SkillItem,
  WorkExperienceItem,
} from '../../types'
import { EmptyPreview, ResumePreview } from '../ResumePreview'
import { moduleAnchorId, type ResumeModuleDefinition, type ResumeModuleId } from './moduleDefinitions'
import { ResumeVersionTimelineModal } from './ResumeVersionTimelineModal'

const { Paragraph, Text } = Typography

export type ResumeEditorSaveState = 'idle' | 'saving' | 'saved' | 'save_failed'

interface ResumeEditorViewProps {
  draft: ResumeDetail
  deferredDraft: ResumeDetail | null
  expandedModules: ResumeModuleId[]
  exportingPdf: boolean
  hiddenSections: ResumeSectionKey[]
  loadingTemplates: boolean
  onApplyPatch: (patch: AiResumeSuggestion) => void
  onCreateShare: (title: string, mode: ShareMode, password?: string) => Promise<void>
  onExpandedModulesChange: (keys: string | string[]) => void
  onExportPdf: (previewRoot?: HTMLElement | null) => Promise<void>
  onFocusModule: (moduleKey: ResumeModuleId) => void
  onHideSection: (sectionKey: ResumeSectionKey) => void
  onDragEnd: (event: DragEndEvent) => void
  onRestoredVersion: (resume: ResumeDetail) => Promise<void> | void
  onShowSection: (sectionKey: ResumeSectionKey) => void
  onUpdateDraft: (mutator: (next: ResumeDetail) => void) => void
  orderedModuleDefinitions: ResumeModuleDefinition[]
  saveState: ResumeEditorSaveState
  sectionOrder: ResumeSectionKey[]
  templates: ResumeTemplateDefinition[]
}

const MAX_AVATAR_FILE_SIZE_BYTES = 1024 * 1024
const AVATAR_INPUT_ID = 'resume-editor-avatar-input'

export function ResumeEditorView({
  draft,
  deferredDraft,
  expandedModules,
  exportingPdf,
  hiddenSections,
  loadingTemplates,
  onApplyPatch,
  onCreateShare,
  onExpandedModulesChange,
  onExportPdf,
  onFocusModule,
  onHideSection,
  onDragEnd,
  onRestoredVersion,
  onShowSection,
  onUpdateDraft,
  orderedModuleDefinitions,
  saveState,
  sectionOrder,
  templates,
}: ResumeEditorViewProps) {
  const { t } = useTranslation('workspace')
  const { message } = App.useApp()
  const isMobile = useIsMobile()
  const [mobileEditorTab, setMobileEditorTab] = useState<'structure' | 'content' | 'preview'>('content')
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [versionTimelineOpen, setVersionTimelineOpen] = useState(false)
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
  const selectedTemplate = resolveResumeTemplate(templates, draft.templateKey)
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

  const openShareModal = () => {
    setShareModalOpen(true)
    setShareTitle('')
    setShareMode('LATEST')
    setSharePasswordEnabled(false)
    setSharePassword('')
  }

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
              onChange={(event) => onUpdateDraft((next) => {
                next.title = event.target.value
              })}
              placeholder={t('editor.titlePlaceholder')}
            />
          </div>

          <Space wrap className="resume-editor-shell__actions resume-editor-shell__actions--desktop">
            <Link to={`/app/templates?resumeId=${draft.id}`}>
              <Button>{t('editor.modifyTemplate')}</Button>
            </Link>
            <InterviewMenuButton interviewMenuItems={interviewMenuItems} />
            <ResumeScoreButton draft={draft} />
            <Button icon={<HistoryOutlined />} onClick={() => setVersionTimelineOpen(true)}>
              {t('editor.versionTimeline')}
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={openShareModal}>
              {t('editor.share')}
            </Button>
            <DropdownExport
              exportingPdf={exportingPdf}
              onExportPdf={() => void onExportPdf(exportPreviewRef.current)}
            />
          </Space>

          <Space wrap className="resume-editor-shell__actions resume-editor-shell__actions--mobile" style={{ display: 'none' }}>
            <ResumeScoreButton draft={draft} />
            <MoreActionsMenu
              draftId={draft.id}
              exportingPdf={exportingPdf}
              interviewMenuItems={interviewMenuItems}
              onExportPdf={() => void onExportPdf(exportPreviewRef.current)}
              onOpenShare={openShareModal}
              onOpenVersionTimeline={() => setVersionTimelineOpen(true)}
            />
          </Space>
        </div>

        {isMobile ? (
          <div className="resume-editor-mobile-tabs">
            <Radio.Group
              value={mobileEditorTab}
              onChange={(event) => setMobileEditorTab(event.target.value)}
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
                        {renderModuleContent(module.key, draft, onUpdateDraft, handleAvatarPickerOpen, handleAvatarRemove, t)}
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
            <Radio.Group value={shareMode} onChange={(event) => setShareMode(event.target.value)}>
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
                onChange={(event) => setSharePassword(event.target.value)}
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

      <ResumeVersionTimelineModal
        draft={draft}
        open={versionTimelineOpen}
        onClose={() => setVersionTimelineOpen(false)}
        onRestoredVersion={onRestoredVersion}
      />

      <AiResumeAssistant draft={draft} onApplyPatch={onApplyPatch} />
    </div>
  )
}

function InterviewMenuButton({ interviewMenuItems }: { interviewMenuItems: Array<{ key: string; label: ReactNode }> }) {
  const { t } = useTranslation('workspace')
  return (
    <Dropdown menu={{ items: interviewMenuItems }}>
      <Button icon={<MessageOutlined />}>{t('editor.interview')}</Button>
    </Dropdown>
  )
}

function DropdownExport({
  exportingPdf,
  onExportPdf,
}: {
  exportingPdf: boolean
  onExportPdf: () => void
}) {
  const { t } = useTranslation('workspace')
  return (
    <Button icon={<DownloadOutlined />} loading={exportingPdf} onClick={onExportPdf}>
      {t('editor.exportPdf')}
    </Button>
  )
}

function MoreActionsMenu({
  draftId,
  exportingPdf,
  interviewMenuItems,
  onExportPdf,
  onOpenShare,
  onOpenVersionTimeline,
}: {
  draftId: string
  exportingPdf: boolean
  interviewMenuItems: Array<{ key: string; label: ReactNode }>
  onExportPdf: () => void
  onOpenShare: () => void
  onOpenVersionTimeline: () => void
}) {
  const { t } = useTranslation('workspace')
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          {
            key: 'modifyTemplate',
            label: <Link to={`/app/templates?resumeId=${draftId}`}>{t('editor.modifyTemplate')}</Link>,
          },
          {
            key: 'interview',
            label: t('editor.interview'),
            icon: <MessageOutlined />,
            children: interviewMenuItems,
          },
          {
            key: 'versionTimeline',
            label: t('editor.versionTimeline'),
            icon: <HistoryOutlined />,
            onClick: onOpenVersionTimeline,
          },
          {
            key: 'share',
            label: t('editor.share'),
            icon: <ShareAltOutlined />,
            onClick: onOpenShare,
          },
          {
            key: 'export',
            label: t('editor.exportPdf'),
            icon: <DownloadOutlined />,
            disabled: exportingPdf,
            onClick: onExportPdf,
          },
        ],
      }}
    >
      <Button icon={<MoreOutlined />} aria-label={t('editor.moreActionsAria')}>
        {t('editor.moreActions')}
      </Button>
    </Dropdown>
  )
}

function saveStateColor(saveState: ResumeEditorSaveState) {
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

function saveStateLabel(saveState: ResumeEditorSaveState, t: (key: string) => string) {
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
              <Button danger icon={<DeleteOutlined />} onClick={onAvatarRemove} disabled={!draft.content.personalInfo.avatar}>
                {t('modules.personalInfo.removeAvatar')}
              </Button>
            </Space>
          </div>
        </div>

        <SectionGrid>
          <InputField
            label={t('modules.personalInfo.fields.fullName')}
            placeholder={t('modules.personalInfo.placeholder.fullName')}
            value={draft.content.personalInfo.fullName}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.fullName = value
            })}
          />
          <InputField
            label={t('modules.personalInfo.fields.headline')}
            placeholder={t('modules.personalInfo.placeholder.headline')}
            value={draft.content.personalInfo.headline}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.headline = value
            })}
          />
          <InputField
            label={t('modules.personalInfo.fields.phone')}
            placeholder={t('modules.personalInfo.placeholder.phone')}
            value={draft.content.personalInfo.phone}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.phone = value
            })}
          />
          <InputField
            label={t('modules.personalInfo.fields.email')}
            placeholder={t('modules.personalInfo.placeholder.email')}
            value={draft.content.personalInfo.email}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.email = value
            })}
          />
          <InputField
            label={t('modules.personalInfo.fields.city')}
            placeholder={t('modules.personalInfo.placeholder.city')}
            value={draft.content.personalInfo.city}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.city = value
            })}
          />
          <InputField
            label={t('modules.personalInfo.fields.website')}
            placeholder={t('modules.personalInfo.placeholder.website')}
            value={draft.content.personalInfo.website}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.website = value
            })}
          />
          <InputField
            label={t('modules.personalInfo.fields.expectedSalary')}
            placeholder={t('modules.personalInfo.placeholder.expectedSalary')}
            value={draft.content.personalInfo.expectedSalary}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.expectedSalary = value
            })}
          />
          <InputField
            label={t('modules.personalInfo.fields.age')}
            placeholder={t('modules.personalInfo.placeholder.age')}
            value={draft.content.personalInfo.age}
            onChange={(value) => updateDraft((next) => {
              next.content.personalInfo.age = value
            })}
          />
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
            onChange={(value) => updateDraft((next) => {
              next.content.personalSummary = value
            })}
            placeholder={t('modules.summary.placeholder')}
          />
        </div>
      )
    case 'education':
      return renderEducationSection(draft.content.education, () => {
        updateDraft((next) => {
          next.content.education.push({ school: '', degree: '', major: '', startDate: '', endDate: '', description: '' })
        })
      }, updateDraft, t)
    case 'workExperience':
      return renderWorkSection(draft.content.workExperience, () => {
        updateDraft((next) => {
          next.content.workExperience.push({ company: '', role: '', startDate: '', endDate: '', description: '' })
        })
      }, updateDraft, t)
    case 'projectExperience':
      return renderProjectSection(draft.content.projectExperience, () => {
        updateDraft((next) => {
          next.content.projectExperience.push({ name: '', role: '', startDate: '', endDate: '', description: '' })
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
          next.content.honors.push({ title: '', issuer: '', awardedAt: '', description: '' })
        })
      }, updateDraft, t)
    case 'certificates':
      return renderCertificateSection(draft.content.certificates, () => {
        updateDraft((next) => {
          next.content.certificates.push({ name: '', issuer: '', issuedAt: '', credentialId: '' })
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
  return renderRepeatableCards(
    items,
    addItem,
    (index) => t('modules.education.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <InputField label={t('modules.education.fields.school')} placeholder={t('modules.education.placeholder.school')} value={item.school} onChange={(value) => updateDraft((next) => { next.content.education[index].school = value })} />
        <InputField label={t('modules.education.fields.degree')} placeholder={t('modules.education.placeholder.degree')} value={item.degree} onChange={(value) => updateDraft((next) => { next.content.education[index].degree = value })} />
        <InputField label={t('modules.education.fields.major')} placeholder={t('modules.education.placeholder.major')} value={item.major} onChange={(value) => updateDraft((next) => { next.content.education[index].major = value })} />
        <InputField label={t('modules.education.fields.startDate')} placeholder={t('modules.education.placeholder.startDate')} value={item.startDate} onChange={(value) => updateDraft((next) => { next.content.education[index].startDate = value })} />
        <InputField label={t('modules.education.fields.endDate')} placeholder={t('modules.education.placeholder.endDate')} value={item.endDate} onChange={(value) => updateDraft((next) => { next.content.education[index].endDate = value })} />
        <SectionGridFullWidth>
          <MarkdownField label={t('modules.education.fields.description')} placeholder={t('modules.education.placeholder.description')} value={item.description} minRows={3} maxRows={8} onChange={(value) => updateDraft((next) => { next.content.education[index].description = value })} />
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => {
      next.content.education.splice(index, 1)
    }),
    t,
  )
}

function renderWorkSection(
  items: WorkExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards(
    items,
    addItem,
    (index) => t('modules.workExperience.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <InputField label={t('modules.workExperience.fields.company')} placeholder={t('modules.workExperience.placeholder.company')} value={item.company} onChange={(value) => updateDraft((next) => { next.content.workExperience[index].company = value })} />
        <InputField label={t('modules.workExperience.fields.role')} placeholder={t('modules.workExperience.placeholder.role')} value={item.role} onChange={(value) => updateDraft((next) => { next.content.workExperience[index].role = value })} />
        <InputField label={t('modules.workExperience.fields.startDate')} placeholder={t('modules.workExperience.placeholder.startDate')} value={item.startDate} onChange={(value) => updateDraft((next) => { next.content.workExperience[index].startDate = value })} />
        <InputField label={t('modules.workExperience.fields.endDate')} placeholder={t('modules.workExperience.placeholder.endDate')} value={item.endDate} onChange={(value) => updateDraft((next) => { next.content.workExperience[index].endDate = value })} />
        <SectionGridFullWidth>
          <MarkdownField label={t('modules.workExperience.fields.description')} placeholder={t('modules.workExperience.placeholder.description')} value={item.description} minRows={4} maxRows={10} onChange={(value) => updateDraft((next) => { next.content.workExperience[index].description = value })} />
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => {
      next.content.workExperience.splice(index, 1)
    }),
    t,
  )
}

function renderProjectSection(
  items: ProjectExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards(
    items,
    addItem,
    (index) => t('modules.projectExperience.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <InputField label={t('modules.projectExperience.fields.name')} placeholder={t('modules.projectExperience.placeholder.name')} value={item.name} onChange={(value) => updateDraft((next) => { next.content.projectExperience[index].name = value })} />
        <InputField label={t('modules.projectExperience.fields.role')} placeholder={t('modules.projectExperience.placeholder.role')} value={item.role} onChange={(value) => updateDraft((next) => { next.content.projectExperience[index].role = value })} />
        <InputField label={t('modules.projectExperience.fields.startDate')} placeholder={t('modules.projectExperience.placeholder.startDate')} value={item.startDate} onChange={(value) => updateDraft((next) => { next.content.projectExperience[index].startDate = value })} />
        <InputField label={t('modules.projectExperience.fields.endDate')} placeholder={t('modules.projectExperience.placeholder.endDate')} value={item.endDate} onChange={(value) => updateDraft((next) => { next.content.projectExperience[index].endDate = value })} />
        <SectionGridFullWidth>
          <MarkdownField label={t('modules.projectExperience.fields.description')} placeholder={t('modules.projectExperience.placeholder.description')} value={item.description} minRows={4} maxRows={10} onChange={(value) => updateDraft((next) => { next.content.projectExperience[index].description = value })} />
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => {
      next.content.projectExperience.splice(index, 1)
    }),
    t,
  )
}

function renderSkillSection(
  items: SkillItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards(
    items,
    addItem,
    (index) => t('modules.skills.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <InputField label={t('modules.skills.fields.name')} placeholder={t('modules.skills.placeholder.name')} value={item.name} onChange={(value) => updateDraft((next) => { next.content.skills[index].name = value })} />
        <InputField label={t('modules.skills.fields.level')} placeholder={t('modules.skills.placeholder.level')} value={item.level} onChange={(value) => updateDraft((next) => { next.content.skills[index].level = value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => {
      next.content.skills.splice(index, 1)
    }),
    t,
  )
}

function renderHonorSection(
  items: HonorItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards(
    items,
    addItem,
    (index) => t('modules.honors.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <InputField label={t('modules.honors.fields.title')} placeholder={t('modules.honors.placeholder.title')} value={item.title} onChange={(value) => updateDraft((next) => { next.content.honors[index].title = value })} />
        <InputField label={t('modules.honors.fields.issuer')} placeholder={t('modules.honors.placeholder.issuer')} value={item.issuer} onChange={(value) => updateDraft((next) => { next.content.honors[index].issuer = value })} />
        <InputField label={t('modules.honors.fields.awardedAt')} placeholder={t('modules.honors.placeholder.awardedAt')} value={item.awardedAt} onChange={(value) => updateDraft((next) => { next.content.honors[index].awardedAt = value })} />
        <SectionGridFullWidth>
          <MarkdownField label={t('modules.honors.fields.description')} placeholder={t('modules.honors.placeholder.description')} value={item.description} minRows={3} maxRows={8} onChange={(value) => updateDraft((next) => { next.content.honors[index].description = value })} />
        </SectionGridFullWidth>
      </SectionGrid>
    ),
    (index) => updateDraft((next) => {
      next.content.honors.splice(index, 1)
    }),
    t,
  )
}

function renderCertificateSection(
  items: CertificateItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return renderRepeatableCards(
    items,
    addItem,
    (index) => t('modules.certificates.entryTitle', { index: index + 1 }),
    (item, index) => (
      <SectionGrid>
        <InputField label={t('modules.certificates.fields.name')} placeholder={t('modules.certificates.placeholder.name')} value={item.name} onChange={(value) => updateDraft((next) => { next.content.certificates[index].name = value })} />
        <InputField label={t('modules.certificates.fields.issuer')} placeholder={t('modules.certificates.placeholder.issuer')} value={item.issuer} onChange={(value) => updateDraft((next) => { next.content.certificates[index].issuer = value })} />
        <InputField label={t('modules.certificates.fields.issuedAt')} placeholder={t('modules.certificates.placeholder.issuedAt')} value={item.issuedAt} onChange={(value) => updateDraft((next) => { next.content.certificates[index].issuedAt = value })} />
        <InputField label={t('modules.certificates.fields.credentialId')} placeholder={t('modules.certificates.placeholder.credentialId')} value={item.credentialId} onChange={(value) => updateDraft((next) => { next.content.certificates[index].credentialId = value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => {
      next.content.certificates.splice(index, 1)
    }),
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
    <div className="resume-editor-repeatable-list">
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
    </div>
  )
}

function InputField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function MarkdownField({
  label,
  maxRows,
  minRows,
  onChange,
  placeholder,
  value,
}: {
  label: string
  maxRows: number
  minRows: number
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <MarkdownComposer
        hidePreview
        autoSize={{ minRows, maxRows }}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
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
      <button className="resume-editor-module-row__button" type="button" onClick={() => onFocusModule(module.key)}>
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
