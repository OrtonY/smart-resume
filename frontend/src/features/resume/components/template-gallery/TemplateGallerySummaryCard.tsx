import { CheckCircleOutlined } from '@ant-design/icons'
import { Card, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { EditorMode } from '../../templateGalleryUtils'
import type { ResumeDetail } from '../../types'

const { Text, Title } = Typography

export function TemplateGallerySummaryCard({
  editorMode,
  linkedTemplateName,
  resume,
}: {
  editorMode: EditorMode
  linkedTemplateName: string | null
  resume: ResumeDetail | null
}) {
  const { t } = useTranslation('template')

  return (
    <Card className="glass-card template-gallery-summary" bordered={false}>
      <Space direction="vertical" size={6}>
        <Text type="secondary">{resume ? t('gallery.summary.linkedResume') : t('gallery.summary.createEntry')}</Text>
        <Title level={4} style={{ margin: 0 }}>
          {resume ? resume.title : t('gallery.summary.previewThenCreate')}
        </Title>
        <Space wrap>
          {resume ? (
            <Tag color="blue" icon={<CheckCircleOutlined />}>
              {t('gallery.summary.currentTemplate', { name: linkedTemplateName ?? resume.templateKey })}
            </Tag>
          ) : (
            <Tag color="success">
              {editorMode === 'create' ? t('gallery.summary.newDraft') : t('gallery.summary.editExisting')}
            </Tag>
          )}
        </Space>
      </Space>
    </Card>
  )
}
