import { FileAddOutlined, InboxOutlined, ImportOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space, Tag, Typography, Upload, type UploadFile } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../../components/shared/ResponsiveModal'
import { RESUME_IMPORT_ACCEPT, RESUME_IMPORT_ALLOWED_EXTENSIONS, RESUME_IMPORT_MODAL_WIDTH } from '../../constants'
import { ResumePreview } from '../ResumePreview'
import { getLocalizedField, type ManagedResumeTemplateDefinition } from '../../templateCatalog'
import { layoutLabel } from '../../templateGalleryUtils'
import type { ResumeDetail } from '../../types'

const { Dragger } = Upload
const { Paragraph, Text, Title } = Typography

export function TemplateGalleryPreviewPanel({
  applyingTemplateKey,
  canApplyTemplate,
  creatingResumeTemplateKey,
  importingResumeTemplateKey,
  loadingResume,
  locale,
  onApplyTemplateToResume,
  onBackToResume,
  onCreateResumeFromTemplate,
  onImportResumeFromTemplate,
  previewResume,
  previewTemplate,
  resume,
  resumeError,
  selectedTemplate,
}: {
  applyingTemplateKey: string | null
  canApplyTemplate: boolean
  creatingResumeTemplateKey: string | null
  importingResumeTemplateKey: string | null
  loadingResume: boolean
  locale: string
  onApplyTemplateToResume: () => void
  onBackToResume: () => void
  onCreateResumeFromTemplate: (templateKey: string) => void
  onImportResumeFromTemplate: (templateKey: string, file: File) => void
  previewResume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'>
  previewTemplate: ManagedResumeTemplateDefinition
  resume: ResumeDetail | null
  resumeError: Error | null
  selectedTemplate: ManagedResumeTemplateDefinition
}) {
  const { t } = useTranslation('template')
  const [importOpen, setImportOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const uploadFileList = useMemo<UploadFile[]>(() => {
    if (!selectedFile) {
      return []
    }
    return [{
      uid: selectedFile.name,
      name: selectedFile.name,
      status: 'done',
      size: selectedFile.size,
      type: selectedFile.type,
    }]
  }, [selectedFile])

  const openImportModal = () => {
    setLocalError(null)
    setSelectedFile(null)
    setImportOpen(true)
  }

  const closeImportModal = () => {
    if (importingResumeTemplateKey === previewTemplate.key) {
      return
    }
    setImportOpen(false)
    setLocalError(null)
    setSelectedFile(null)
  }

  const handleBeforeUpload = (file: File) => {
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
    if (!RESUME_IMPORT_ALLOWED_EXTENSIONS.includes(extension as (typeof RESUME_IMPORT_ALLOWED_EXTENSIONS)[number])) {
      setLocalError(t('gallery.import.validation.unsupportedType'))
      return Upload.LIST_IGNORE
    }
    setSelectedFile(file)
    setLocalError(null)
    return false
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setLocalError(null)
  }

  const handleConfirmImport = () => {
    if (!selectedFile) {
      setLocalError(t('gallery.import.validation.fileRequired'))
      return
    }
    onImportResumeFromTemplate(previewTemplate.key, selectedFile)
  }

  return (
    <div className="template-gallery-preview">
      <Card className="glass-card" bordered={false}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {loadingResume ? <Alert type="info" showIcon message={t('gallery.error.loadingResume')} /> : null}
          {resumeError ? (
            <Alert
              type="warning"
              showIcon
              message={t('gallery.error.resumeLoadFailed')}
              description={resumeError.message}
            />
          ) : null}

          <div>
            <Space wrap size={[8, 8]}>
              <Tag color="gold">{getLocalizedField(previewTemplate.category, locale)}</Tag>
              <Tag>{layoutLabel(previewTemplate.layout, t)}</Tag>
              <Tag color={previewTemplate.builtIn ? 'blue' : 'green'}>
                {previewTemplate.builtIn ? t('gallery.preview.tagBuiltIn') : t('gallery.preview.tagCustom')}
              </Tag>
            </Space>
            <Title level={4} style={{ margin: '10px 0 6px' }}>
              {getLocalizedField(previewTemplate.name, locale)}
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {getLocalizedField(previewTemplate.summary, locale)}
            </Paragraph>
            <Space wrap>
              {resume ? (
                <>
                  <Button
                    type="primary"
                    onClick={onApplyTemplateToResume}
                    loading={applyingTemplateKey === selectedTemplate.key}
                    disabled={!canApplyTemplate}
                  >
                    {t('gallery.preview.applyToResume')}
                  </Button>
                  <Button onClick={onBackToResume}>{t('gallery.preview.backToResume')}</Button>
                </>
              ) : (
                <>
                  <Button
                    type="primary"
                    icon={<FileAddOutlined />}
                    onClick={() => onCreateResumeFromTemplate(previewTemplate.key)}
                    loading={creatingResumeTemplateKey === previewTemplate.key}
                  >
                    {t('gallery.preview.createFromTemplate')}
                  </Button>
                  <Button
                    icon={<ImportOutlined />}
                    onClick={openImportModal}
                    loading={importingResumeTemplateKey === previewTemplate.key}
                  >
                    {t('gallery.preview.importFromFile')}
                  </Button>
                </>
              )}
              <Text type="secondary">
                {t('gallery.preview.lastUpdated', {
                  time: previewTemplate.updatedAt
                    ? new Date(previewTemplate.updatedAt).toLocaleString()
                    : t('gallery.preview.lastUpdatedBuiltIn'),
                })}
              </Text>
            </Space>
          </div>

          <ResumePreview
            resume={{
              ...previewResume,
              templateKey: previewTemplate.key,
            }}
            templates={[previewTemplate]}
            previewMode="a4-paged"
          />
        </Space>
      </Card>

      <ResponsiveModal
        open={importOpen}
        onCancel={closeImportModal}
        onOk={handleConfirmImport}
        title={t('gallery.import.title')}
        okText={t('gallery.import.confirm')}
        cancelText={t('common:actions.cancel')}
        confirmLoading={importingResumeTemplateKey === previewTemplate.key}
        width={RESUME_IMPORT_MODAL_WIDTH}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t('gallery.import.description', { template: getLocalizedField(previewTemplate.name, locale) })}
          </Paragraph>
          <Alert type="info" showIcon message={t('gallery.import.supportedFormats')} />
          {localError ? <Alert type="warning" showIcon message={localError} /> : null}
          <Dragger
            accept={RESUME_IMPORT_ACCEPT}
            maxCount={1}
            multiple={false}
            beforeUpload={handleBeforeUpload}
            onRemove={handleRemove}
            fileList={uploadFileList}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('gallery.import.dropzone.title')}</p>
            <p className="ant-upload-hint">{t('gallery.import.dropzone.hint')}</p>
          </Dragger>
          <Text type="secondary">{t('gallery.import.note')}</Text>
        </Space>
      </ResponsiveModal>
    </div>
  )
}
