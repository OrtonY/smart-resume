import { FileAddOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { ResumePreview } from '../ResumePreview'
import { getLocalizedField, type ManagedResumeTemplateDefinition } from '../../templateCatalog'
import { layoutLabel } from '../../templateGalleryUtils'
import type { ResumeDetail } from '../../types'

const { Paragraph, Text, Title } = Typography

export function TemplateGalleryPreviewPanel({
  applyingTemplateKey,
  canApplyTemplate,
  creatingResumeTemplateKey,
  loadingResume,
  locale,
  onApplyTemplateToResume,
  onBackToResume,
  onCreateResumeFromTemplate,
  previewResume,
  previewTemplate,
  resume,
  resumeError,
  selectedTemplate,
}: {
  applyingTemplateKey: string | null
  canApplyTemplate: boolean
  creatingResumeTemplateKey: string | null
  loadingResume: boolean
  locale: string
  onApplyTemplateToResume: () => void
  onBackToResume: () => void
  onCreateResumeFromTemplate: (templateKey: string) => void
  previewResume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'>
  previewTemplate: ManagedResumeTemplateDefinition
  resume: ResumeDetail | null
  resumeError: Error | null
  selectedTemplate: ManagedResumeTemplateDefinition
}) {
  const { t } = useTranslation('template')

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
                <Button
                  type="primary"
                  icon={<FileAddOutlined />}
                  onClick={() => onCreateResumeFromTemplate(previewTemplate.key)}
                  loading={creatingResumeTemplateKey === previewTemplate.key}
                >
                  {t('gallery.preview.createFromTemplate')}
                </Button>
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
    </div>
  )
}
