import {
  CopyOutlined,
  DeleteOutlined,
  FileAddOutlined,
  RollbackOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { App, Button, Input, Popconfirm, Space, Spin, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { ResumePreview } from './ResumePreview'
import type { ResumeTemplateDefinition } from '../templateCatalog'
import type { ResumeDetail, ResumeSummary } from '../types'

const { Text } = Typography

interface ResumeVisualCardProps {
  item: ResumeSummary
  loadingPreview: boolean
  onCopyResume?: (resumeId: string, title: string) => Promise<void>
  onDeleteResume?: (resumeId: string) => Promise<void>
  onOpenResume?: (resumeId: string) => void
  onOpenShareDialog?: (resume: ResumeSummary) => Promise<void>
  onPurgeResume?: (resumeId: string) => Promise<void>
  onRestoreResume?: (resumeId: string) => Promise<void>
  previewDetail?: ResumeDetail
  selectedTemplateName: string
  status?: 'active' | 'deleted'
  templates: ResumeTemplateDefinition[]
}

export function ResumeVisualCard({
  item,
  loadingPreview,
  onCopyResume,
  onDeleteResume,
  onOpenResume,
  onOpenShareDialog,
  onPurgeResume,
  onRestoreResume,
  previewDetail,
  selectedTemplateName,
  status = 'active',
  templates,
}: ResumeVisualCardProps) {
  const { t } = useTranslation('workspace')
  const { message } = App.useApp()
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copyTitle, setCopyTitle] = useState('')
  const [copying, setCopying] = useState(false)

  const openCopyDialog = () => {
    setCopyTitle(`${item.title} ${t('copyDialog.copySuffix')}`)
    setCopyDialogOpen(true)
  }

  const closeCopyDialog = () => {
    if (copying) {
      return
    }
    setCopyDialogOpen(false)
  }

  const submitCopy = async () => {
    if (!onCopyResume) {
      return
    }

    const trimmed = copyTitle.trim()
    if (!trimmed) {
      void message.warning(t('copyDialog.warningEmpty'))
      return
    }

    setCopying(true)
    try {
      await onCopyResume(item.id, trimmed)
      setCopyDialogOpen(false)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('copyDialog.errorFailed'))
    } finally {
      setCopying(false)
    }
  }

  const preview = (
    <div className="resume-list-card__preview">
      {previewDetail ? (
        <ResumePreview resume={previewDetail} templates={templates} previewMode="a4-fit" />
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
          <Tag color={status === 'deleted' ? 'red' : 'blue'}>
            {status === 'deleted' ? t('list.tagDeleted') : t('list.tagEditable')}
          </Tag>
        </div>
        <strong>{item.title}</strong>
        <p>{status === 'deleted' ? t('list.deletedAt') : t('list.updatedAt')} {new Date(item.updatedAt).toLocaleString()}</p>
      </div>

      <div className="resume-list-card__actions">
        {onRestoreResume ? (
          <Button type="primary" icon={<RollbackOutlined />} onClick={() => void onRestoreResume(item.id)}>
            {t('card.restore')}
          </Button>
        ) : null}

        {onCopyResume ? (
          <Button icon={<CopyOutlined />} onClick={openCopyDialog}>
            {t('card.copy')}
          </Button>
        ) : null}

        {onDeleteResume ? (
          <Button danger icon={<DeleteOutlined />} onClick={() => void onDeleteResume(item.id)}>
            {t('card.delete')}
          </Button>
        ) : null}

        {onPurgeResume ? (
          <Popconfirm
            title={t('card.purgeConfirmTitle')}
            description={t('card.purgeConfirmDescription')}
            okText={t('card.purgeConfirmOk')}
            cancelText={t('common:actions.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => void onPurgeResume(item.id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              {t('card.purge')}
            </Button>
          </Popconfirm>
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
