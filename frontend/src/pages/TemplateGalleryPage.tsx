import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Radio, Result, Space, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { TemplateGalleryCatalogPanel } from '../features/resume/components/template-gallery/TemplateGalleryCatalogPanel'
import { TemplateGalleryEditorPanel } from '../features/resume/components/template-gallery/TemplateGalleryEditorPanel'
import { TemplateGalleryPreviewPanel } from '../features/resume/components/template-gallery/TemplateGalleryPreviewPanel'
import { TemplateGallerySummaryCard } from '../features/resume/components/template-gallery/TemplateGallerySummaryCard'
import { useTemplateGalleryController } from '../features/resume/hooks/useTemplateGalleryController'

const { Title } = Typography

export function TemplateGalleryPage() {
  const { t } = useTranslation('template')
  const controller = useTemplateGalleryController()

  if (controller.loadingTemplates && controller.templates.length === 0) {
    return (
      <div className="full-page-center" style={{ minHeight: '100vh' }}>
        <Spin
          size="large"
          tip={controller.isResumeTemplateChange ? t('gallery.loading.changeTemplate') : t('gallery.loading.catalog')}
        />
      </div>
    )
  }

  if (controller.templateError && controller.templates.length === 0) {
    return (
      <div className="full-page-center">
        <Card className="auth-card" bordered={false} style={{ width: 'min(860px, 100%)' }}>
          <Result
            status="error"
            title={t('gallery.error.catalogUnavailable')}
            subTitle={controller.templateError.message}
            extra={(
              <Space wrap>
                <Button type="primary" onClick={() => void controller.loadTemplateCatalog()}>
                  {t('common:actions.reload')}
                </Button>
                <Button onClick={() => controller.navigate('/app')} icon={<ArrowLeftOutlined />}>
                  {t('gallery.nav.backToWorkspace')}
                </Button>
              </Space>
            )}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="template-gallery-page">
      <div className="template-gallery-page__head">
        <div>
          <div className="template-gallery-page__nav">
            <Button icon={<ArrowLeftOutlined />} onClick={() => controller.navigate('/app')}>
              {t('gallery.nav.backToWorkspace')}
            </Button>
          </div>
          <Title level={2} style={{ marginBottom: 8 }}>
            {controller.isResumeTemplateChange ? t('gallery.title.changeTemplate') : t('gallery.title.catalog')}
          </Title>
        </div>

        <TemplateGallerySummaryCard
          editorMode={controller.editorMode}
          linkedTemplateName={controller.linkedTemplateName}
          resume={controller.resume}
        />
      </div>

      <div className="template-gallery-layout">
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          {!controller.isMobile || !controller.mobileExpanded ? (
            <TemplateGalleryCatalogPanel
              isMobile={controller.isMobile}
              selectedTemplate={controller.selectedTemplate}
              templateError={controller.templateError}
              templates={controller.templates}
              onCreateFromCurrent={controller.handleCreateFromCurrent}
              onExpandPreview={() => {
                controller.setMobileExpanded(true)
                controller.setMobileView('preview')
              }}
              onRefresh={() => void controller.loadTemplateCatalog(controller.selectedTemplate.key)}
              onTemplateSelect={controller.handleTemplateSelect}
            />
          ) : null}

          {controller.isMobile && controller.mobileExpanded ? (
            <>
              <div className="resume-editor-mobile-tabs">
                <Radio.Group
                  value={controller.mobileView}
                  onChange={(event) => controller.setMobileView(event.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="middle"
                >
                  <Radio.Button value="edit">{t('gallery.editor.section.basic')}</Radio.Button>
                  <Radio.Button value="preview">{t('gallery.editor.section.preview')}</Radio.Button>
                </Radio.Group>
              </div>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => controller.setMobileExpanded(false)}
                style={{ alignSelf: 'flex-start' }}
              >
                {t('gallery.nav.backToCatalog')}
              </Button>
            </>
          ) : null}

          {!controller.isMobile || (controller.mobileExpanded && controller.mobileView === 'edit') ? (
            <TemplateGalleryEditorPanel
              deletingTemplateKey={controller.deletingTemplateKey}
              draftDirty={controller.draftDirty}
              editorDraft={controller.editorDraft}
              editorMode={controller.editorMode}
              onCancelCreate={controller.handleCancelCreate}
              onDeleteTemplate={() => void controller.handleDeleteTemplate()}
              onSaveTemplate={() => void controller.handleSaveTemplate()}
              savingTemplate={controller.savingTemplate}
              selectedTemplate={controller.selectedTemplate}
              updateDraftField={controller.updateDraftField}
              updateDraftPreview={controller.updateDraftPreview}
              updateDraftTheme={controller.updateDraftTheme}
            />
          ) : null}
        </Space>

        {!controller.isMobile || (controller.mobileExpanded && controller.mobileView === 'preview') ? (
          <TemplateGalleryPreviewPanel
            applyingTemplateKey={controller.applyingTemplateKey}
            canApplyTemplate={controller.canApplyTemplate}
            creatingResumeTemplateKey={controller.creatingResumeTemplateKey}
            loadingResume={controller.loadingResume}
            locale={controller.locale}
            onApplyTemplateToResume={() => void controller.handleApplyTemplateToResume()}
            onBackToResume={() => controller.resume && controller.navigate(`/app/resumes/${controller.resume.id}`)}
            onCreateResumeFromTemplate={(templateKey) => void controller.handleCreateResumeFromTemplate(templateKey)}
            previewResume={controller.previewResume}
            previewTemplate={controller.previewTemplate}
            resume={controller.resume}
            resumeError={controller.resumeError}
            selectedTemplate={controller.selectedTemplate}
          />
        ) : null}
      </div>
    </div>
  )
}
