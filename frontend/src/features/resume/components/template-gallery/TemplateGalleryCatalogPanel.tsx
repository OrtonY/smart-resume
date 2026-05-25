import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { ResumeTemplatePicker } from '../ResumeTemplatePicker'
import { FALLBACK_MANAGED_TEMPLATE } from '../../templateGalleryUtils'
import type { ManagedResumeTemplateDefinition } from '../../templateCatalog'

export function TemplateGalleryCatalogPanel({
  isMobile,
  selectedTemplate,
  templateError,
  templates,
  onCreateFromCurrent,
  onExpandPreview,
  onRefresh,
  onTemplateSelect,
}: {
  isMobile: boolean
  selectedTemplate: ManagedResumeTemplateDefinition
  templateError: Error | null
  templates: ManagedResumeTemplateDefinition[]
  onCreateFromCurrent: () => void
  onExpandPreview: () => void
  onRefresh: () => void
  onTemplateSelect: (key: string) => void
}) {
  const { t } = useTranslation('template')

  return (
    <Card
      className="glass-card"
      bordered={false}
      title={t('gallery.catalog.title')}
      extra={(
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={onCreateFromCurrent}>
            {t('gallery.catalog.newTemplate')}
          </Button>
          {!isMobile ? (
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              {t('gallery.catalog.refreshCatalog')}
            </Button>
          ) : null}
        </Space>
      )}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {templateError ? (
          <Alert
            type="warning"
            showIcon
            message={t('gallery.catalog.refreshFailed')}
            description={templateError.message}
          />
        ) : null}

        <ResumeTemplatePicker
          templates={templates.length > 0 ? templates : [FALLBACK_MANAGED_TEMPLATE]}
          value={selectedTemplate.key}
          onChange={onTemplateSelect}
          ariaLabel={t('gallery.catalog.selectTemplate')}
        />

        {isMobile ? (
          <Button type="primary" block icon={<EyeOutlined />} onClick={onExpandPreview}>
            {t('gallery.catalog.viewTemplate')}
          </Button>
        ) : null}
      </Space>
    </Card>
  )
}
