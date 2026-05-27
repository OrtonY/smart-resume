import { HistoryOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, Card, Descriptions, Empty, Space, Spin, Tag, Timeline, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../../components/shared/ResponsiveModal'
import {
  createResumeSnapshot,
  getResumeVersion,
  listResumeVersions,
  restoreResumeFromVersion,
} from '../../api/resumeApi'
import { RESUME_VERSION_MODAL_WIDTH } from '../../constants'
import type { ResumeDetail, ResumeSectionKey, ResumeVersionDetail, ResumeVersionSummary } from '../../types'

const { Paragraph, Text } = Typography

type DiffSection = {
  key: string
  title: string
  items: string[]
}

interface ResumeVersionTimelineModalProps {
  draft: ResumeDetail
  open: boolean
  onClose: () => void
  onRestoredVersion: (resume: ResumeDetail) => Promise<void> | void
}

type Translator = (key: string, options?: Record<string, unknown>) => string

const PERSONAL_INFO_FIELDS = [
  'fullName',
  'headline',
  'phone',
  'email',
  'city',
  'website',
  'expectedSalary',
  'age',
] as const

type RepeatableSectionKey = Exclude<ResumeSectionKey, 'summary'>

const REPEATABLE_SECTION_KEYS: RepeatableSectionKey[] = [
  'education',
  'workExperience',
  'projectExperience',
  'skills',
  'honors',
  'certificates',
]

export function ResumeVersionTimelineModal({
  draft,
  open,
  onClose,
  onRestoredVersion,
}: ResumeVersionTimelineModalProps) {
  const { t, i18n } = useTranslation('workspace')
  const { message } = App.useApp()
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersionDetail | null>(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingVersionDetail, setLoadingVersionDetail] = useState(false)
  const [creatingSnapshot, setCreatingSnapshot] = useState(false)
  const [restoringVersion, setRestoringVersion] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)

  const activeSelectedVersion = selectedVersion?.id === selectedVersionId ? selectedVersion : null

  const loadVersions = useCallback(async (nextSelectedVersionId?: string) => {
    setLoadingVersions(true)
    try {
      const nextVersions = await listResumeVersions(draft.id)
      setVersions(nextVersions)

      setSelectedVersionId((currentSelectedVersionId) =>
        nextSelectedVersionId
        ?? (currentSelectedVersionId && nextVersions.some((version) => version.id === currentSelectedVersionId) ? currentSelectedVersionId : null)
        ?? nextVersions[0]?.id
        ?? null,
      )
    } catch (error) {
      setVersions([])
      setSelectedVersionId(null)
      setSelectedVersion(null)
      void message.error(error instanceof Error ? error.message : t('feedback.versionLoadListFailed'))
    } finally {
      setLoadingVersions(false)
    }
  }, [draft.id, message, t])

  useEffect(() => {
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadVersions()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loadVersions, open])

  useEffect(() => {
    if (!open || !selectedVersionId) {
      return
    }

    const versionId = selectedVersionId
    let active = true

    async function loadVersionDetail() {
      setLoadingVersionDetail(true)
      try {
        const detail = await getResumeVersion(draft.id, versionId)
        if (!active) {
          return
        }

        setSelectedVersion(detail)
      } catch (error) {
        if (!active) {
          return
        }

        setSelectedVersion(null)
        void message.error(error instanceof Error ? error.message : t('feedback.versionLoadDetailFailed'))
      } finally {
        if (active) {
          setLoadingVersionDetail(false)
        }
      }
    }

    const timer = window.setTimeout(() => {
      void loadVersionDetail()
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [draft.id, message, open, selectedVersionId, t])

  const diffSections = useMemo(
    () => (activeSelectedVersion ? buildVersionDiff(draft, activeSelectedVersion.snapshot, t) : []),
    [draft, activeSelectedVersion, t],
  )

  async function handleCreateSnapshot() {
    setCreatingSnapshot(true)
    try {
      const version = await createResumeSnapshot(draft.id)
      void message.success(t('feedback.versionSnapshotCreated'))
      await loadVersions(version.id)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.versionSnapshotCreateFailed'))
    } finally {
      setCreatingSnapshot(false)
    }
  }

  function handleClose() {
    setRestoreConfirmOpen(false)
    onClose()
  }

  function openRestoreConfirm() {
    if (!selectedVersionId) {
      return
    }

    setRestoreConfirmOpen(true)
  }

  async function handleRestoreVersion() {
    if (!activeSelectedVersion) {
      return
    }

    setRestoringVersion(true)
    try {
      const restoredResume = await restoreResumeFromVersion(draft.id, activeSelectedVersion.id)
      await onRestoredVersion(restoredResume)
      void message.success(t('feedback.versionRestoreSuccess'))
      handleClose()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.versionRestoreFailed'))
    } finally {
      setRestoringVersion(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
      width={RESUME_VERSION_MODAL_WIDTH}
      className="resume-version-modal-shell"
      mobileHeight="88dvh"
      title={(
        <Space wrap>
          <HistoryOutlined />
          <span>{t('versionTimeline.title')}</span>
        </Space>
      )}
    >
      <div className="resume-version-modal">
        <div className="resume-version-modal__toolbar">
          <div>
            <Text strong>{t('versionTimeline.subtitle')}</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('versionTimeline.description')}
            </Paragraph>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => void loadVersions()} loading={loadingVersions}>
              {t('versionTimeline.refresh')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => void handleCreateSnapshot()} loading={creatingSnapshot}>
              {t('versionTimeline.createSnapshot')}
            </Button>
          </Space>
        </div>

        <div className="resume-version-modal__layout">
          <Card bordered={false} className="glass-card resume-version-modal__timeline-card">
            {loadingVersions ? (
              <div className="resume-version-modal__empty">
                <Spin />
              </div>
            ) : versions.length === 0 ? (
              <div className="resume-version-modal__empty">
                <Empty description={t('versionTimeline.empty')} />
              </div>
            ) : (
              <Timeline
                items={versions.map((version) => ({
                  color: version.id === selectedVersionId ? '#3157a4' : '#d9d9d9',
                  children: (
                    <button
                      type="button"
                      className={`resume-version-modal__timeline-button${version.id === selectedVersionId ? ' resume-version-modal__timeline-button--active' : ''}`}
                      onClick={() => setSelectedVersionId(version.id)}
                    >
                      <Space wrap size={[8, 8]}>
                        <Tag color={version.id === selectedVersionId ? 'blue' : 'default'}>
                          {t('versionTimeline.versionTag', { number: version.versionNumber })}
                        </Tag>
                        <Text type="secondary">{formatDateTime(version.createdAt, i18n.language)}</Text>
                      </Space>
                      <Text strong>{version.title || t('versionTimeline.untitled')}</Text>
                      <Text type="secondary">{version.templateKey}</Text>
                    </button>
                  ),
                }))}
              />
            )}
          </Card>

          <div className="resume-version-modal__detail">
            {loadingVersionDetail ? (
              <Card bordered={false} className="glass-card resume-version-modal__empty">
                <Spin />
              </Card>
            ) : !activeSelectedVersion ? (
              <Card bordered={false} className="glass-card resume-version-modal__empty">
                <Empty description={t('versionTimeline.selectVersion')} />
              </Card>
            ) : (
              <>
                <Card bordered={false} className="glass-card">
                  <div className="resume-version-modal__summary-head">
                    <Space wrap>
                      <Tag color="blue">{t('versionTimeline.versionTag', { number: activeSelectedVersion.versionNumber })}</Tag>
                      <Tag>{formatDateTime(activeSelectedVersion.createdAt, i18n.language)}</Tag>
                    </Space>
                    <Button type="primary" onClick={openRestoreConfirm} disabled={restoringVersion}>
                      {t('versionTimeline.restore')}
                    </Button>
                  </div>

                  <Descriptions
                    size="small"
                    column={1}
                    className="resume-version-modal__descriptions"
                    items={[
                      {
                        key: 'title',
                        label: t('versionTimeline.snapshotTitle'),
                        children: activeSelectedVersion.snapshot.title || t('versionTimeline.untitled'),
                      },
                      {
                        key: 'template',
                        label: t('versionTimeline.snapshotTemplate'),
                        children: activeSelectedVersion.snapshot.resolvedTemplate?.name ?? activeSelectedVersion.snapshot.templateKey,
                      },
                      {
                        key: 'updatedAt',
                        label: t('versionTimeline.snapshotTimestamp'),
                        children: formatDateTime(activeSelectedVersion.createdAt, i18n.language),
                      },
                    ]}
                  />
                </Card>

                <Card bordered={false} className="glass-card" title={t('versionTimeline.diffTitle')}>
                  {diffSections.length === 0 ? (
                    <Empty description={t('versionTimeline.noDiff')} />
                  ) : (
                    <div className="resume-version-modal__diff-list">
                      {diffSections.map((section) => (
                        <Card
                          key={section.key}
                          size="small"
                          title={section.title}
                          className="resume-version-modal__diff-card"
                        >
                          <ul className="resume-version-modal__diff-items">
                            {section.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      <ResponsiveModal
        open={restoreConfirmOpen}
        destroyOnHidden
        title={t('versionTimeline.restoreConfirmTitle')}
        onCancel={() => setRestoreConfirmOpen(false)}
        onOk={() => void handleRestoreVersion()}
        okText={t('versionTimeline.restoreConfirmOk')}
        confirmLoading={restoringVersion}
        width={520}
      >
        <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
          <Paragraph style={{ marginBottom: 0 }}>
            {t('versionTimeline.restoreConfirmDescription', {
              number: activeSelectedVersion?.versionNumber ?? 0,
            })}
          </Paragraph>
          <Paragraph type="warning" style={{ marginBottom: 0 }}>
            {t('versionTimeline.restoreConfirmRecommendation')}
          </Paragraph>
        </Space>
      </ResponsiveModal>
    </ResponsiveModal>
  )
}

function buildVersionDiff(currentDraft: ResumeDetail, versionSnapshot: ResumeDetail, t: Translator) {
  const sections: DiffSection[] = []

  const metadataChanges: string[] = []
  if (currentDraft.title !== versionSnapshot.title) {
    metadataChanges.push(t('versionTimeline.diffItems.titleChanged'))
  }
  if (currentDraft.templateKey !== versionSnapshot.templateKey) {
    metadataChanges.push(t('versionTimeline.diffItems.templateChanged'))
  }
  if (JSON.stringify(currentDraft.layout.sectionOrder) !== JSON.stringify(versionSnapshot.layout.sectionOrder)) {
    metadataChanges.push(t('versionTimeline.diffItems.sectionOrderChanged'))
  }
  if (JSON.stringify(currentDraft.layout.hiddenSections) !== JSON.stringify(versionSnapshot.layout.hiddenSections)) {
    metadataChanges.push(t('versionTimeline.diffItems.hiddenSectionsChanged'))
  }
  if (metadataChanges.length > 0) {
    sections.push({
      key: 'metadata',
      title: t('versionTimeline.diffSections.metadata'),
      items: metadataChanges,
    })
  }

  const changedPersonalFields = PERSONAL_INFO_FIELDS
    .filter((field) => currentDraft.content.personalInfo[field] !== versionSnapshot.content.personalInfo[field])
    .map((field) => t(`modules.personalInfo.fields.${field}`))

  if (changedPersonalFields.length > 0) {
    sections.push({
      key: 'personalInfo',
      title: t('modules.personalInfo.title'),
      items: [t('versionTimeline.diffItems.personalInfoChanged', { fields: changedPersonalFields.join(' / ') })],
    })
  }

  if (currentDraft.content.personalSummary !== versionSnapshot.content.personalSummary) {
    sections.push({
      key: 'summary',
      title: t('modules.summary.title'),
      items: [t('versionTimeline.diffItems.summaryChanged')],
    })
  }

  for (const sectionKey of REPEATABLE_SECTION_KEYS) {
    const currentItems = currentDraft.content[sectionKey]
    const versionItems = versionSnapshot.content[sectionKey]
    const diffItems: string[] = []
    const sharedLength = Math.min(currentItems.length, versionItems.length)
    let changedEntries = 0

    for (let index = 0; index < sharedLength; index += 1) {
      if (JSON.stringify(currentItems[index]) !== JSON.stringify(versionItems[index])) {
        changedEntries += 1
      }
    }

    const currentOnlyCount = Math.max(0, currentItems.length - versionItems.length)
    const versionOnlyCount = Math.max(0, versionItems.length - currentItems.length)

    if (changedEntries > 0) {
      diffItems.push(t('versionTimeline.diffItems.changedEntries', { count: changedEntries }))
    }
    if (currentOnlyCount > 0) {
      diffItems.push(t('versionTimeline.diffItems.currentOnlyEntries', { count: currentOnlyCount }))
    }
    if (versionOnlyCount > 0) {
      diffItems.push(t('versionTimeline.diffItems.versionOnlyEntries', { count: versionOnlyCount }))
    }

    if (diffItems.length > 0) {
      sections.push({
        key: sectionKey,
        title: resolveSectionTitle(sectionKey, t),
        items: diffItems,
      })
    }
  }

  return sections
}

function resolveSectionTitle(sectionKey: RepeatableSectionKey, t: Translator) {
  switch (sectionKey) {
    case 'education':
      return t('modules.education.title')
    case 'workExperience':
      return t('modules.workExperience.title')
    case 'projectExperience':
      return t('modules.projectExperience.title')
    case 'skills':
      return t('modules.skills.title')
    case 'honors':
      return t('modules.honors.title')
    case 'certificates':
      return t('modules.certificates.title')
    default:
      return sectionKey
  }
}

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale)
}
