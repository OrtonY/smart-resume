import { DeleteOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, Input, Popconfirm, Result, Select, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { ColorField } from '../ColorField'
import { GradientField } from '../GradientField'
import {
  LAYOUT_OPTION_KEYS,
  layoutLabel,
  normalizeTemplateKey,
  PREVIEW_FIELDS,
  THEME_FIELDS,
  type EditorMode,
} from '../../templateGalleryUtils'
import type {
  LocalizedField,
  ManagedResumeTemplateDefinition,
  ResumeTemplateLayout,
  ResumeTemplatePreview,
  ResumeTemplateTheme,
} from '../../templateCatalog'

const { Text } = Typography
const { TextArea } = Input

/**
 * Convert LocalizedField to string for editing.
 * For objects (i18n), we take the first available value.
 * For strings, return as-is.
 */
function localizedFieldToEditableString(field: LocalizedField): string {
  if (typeof field === 'string') {
    return field
  }
  // For i18n objects, take the first available value (shouldn't happen for editable templates)
  const values = Object.values(field)
  return values[0] ?? ''
}

export function TemplateGalleryEditorPanel({
  deletingTemplateKey,
  draftDirty,
  editorDraft,
  editorMode,
  onCancelCreate,
  onDeleteTemplate,
  onSaveTemplate,
  savingTemplate,
  selectedTemplate,
  updateDraftField,
  updateDraftPreview,
  updateDraftTheme,
}: {
  deletingTemplateKey: string | null
  draftDirty: boolean
  editorDraft: ManagedResumeTemplateDefinition | null
  editorMode: EditorMode
  onCancelCreate: () => void
  onDeleteTemplate: () => void
  onSaveTemplate: () => void
  savingTemplate: boolean
  selectedTemplate: ManagedResumeTemplateDefinition
  updateDraftField: <K extends keyof ManagedResumeTemplateDefinition>(field: K, value: ManagedResumeTemplateDefinition[K]) => void
  updateDraftPreview: <K extends keyof ResumeTemplatePreview>(field: K, value: string) => void
  updateDraftTheme: <K extends keyof ResumeTemplateTheme>(field: K, value: string) => void
}) {
  const { t } = useTranslation('template')

  return (
    <Card
      className="glass-card"
      bordered={false}
      title={editorMode === 'create' ? t('gallery.editor.title.create') : t('gallery.editor.title.edit')}
      extra={editorMode === 'edit' ? (
        <Space wrap>
          <Tag color={selectedTemplate.builtIn ? 'blue' : 'green'}>
            {selectedTemplate.builtIn ? t('gallery.editor.tag.builtIn') : t('gallery.editor.tag.custom')}
          </Tag>
          <Tag>{layoutLabel(selectedTemplate.layout, t)}</Tag>
        </Space>
      ) : null}
    >
      {editorMode === 'edit' && selectedTemplate.builtIn ? (
        <Result status="info" title={t('gallery.editor.builtInReadonly.title')} subTitle={t('gallery.editor.builtInReadonly.subtitle')} />
      ) : editorDraft ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Collapse
            defaultActiveKey={['basic']}
            items={[
              {
                key: 'basic',
                label: t('gallery.editor.section.basic'),
                children: (
                  <div className="template-editor-grid">
                    <div className="template-editor-field template-editor-field--span-2">
                      <Text type="secondary">{t('gallery.editor.field.key')}</Text>
                      <Input
                        value={editorDraft.key}
                        disabled={editorMode === 'edit'}
                        placeholder={t('gallery.editor.field.keyPlaceholder')}
                        onChange={(event) => updateDraftField('key', normalizeTemplateKey(event.target.value))}
                      />
                    </div>
                    <div className="template-editor-field">
                      <Text type="secondary">{t('gallery.editor.field.name')}</Text>
                      <Input
                        value={localizedFieldToEditableString(editorDraft.name)}
                        onChange={(event) => updateDraftField('name', event.target.value)}
                      />
                    </div>
                    <div className="template-editor-field">
                      <Text type="secondary">{t('gallery.editor.field.category')}</Text>
                      <Input
                        value={localizedFieldToEditableString(editorDraft.category)}
                        onChange={(event) => updateDraftField('category', event.target.value)}
                      />
                    </div>
                    <div className="template-editor-field">
                      <Text type="secondary">{t('gallery.editor.field.layout')}</Text>
                      <Select<ResumeTemplateLayout>
                        value={editorDraft.layout}
                        options={LAYOUT_OPTION_KEYS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                        onChange={(value) => updateDraftField('layout', value)}
                      />
                    </div>
                    <div className="template-editor-field template-editor-field--span-2">
                      <Text type="secondary">{t('gallery.editor.field.summary')}</Text>
                      <TextArea
                        rows={4}
                        value={localizedFieldToEditableString(editorDraft.summary)}
                        onChange={(event) => updateDraftField('summary', event.target.value)}
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: 'theme',
                label: t('gallery.editor.section.theme'),
                children: (
                  <div className="template-editor-grid">
                    {THEME_FIELDS.map((field) => {
                      const currentValue = editorDraft.theme[field.key]
                      const savedValue = selectedTemplate.theme[field.key]
                      const canReset = editorMode === 'edit' && currentValue !== savedValue
                      const handleReset = canReset ? () => updateDraftTheme(field.key, savedValue) : undefined

                      return field.kind === 'gradient' ? (
                        <GradientField
                          key={field.key}
                          label={t(field.labelKey)}
                          value={currentValue}
                          onChange={(next) => updateDraftTheme(field.key, next)}
                          onReset={handleReset}
                          canReset={canReset}
                        />
                      ) : (
                        <ColorField
                          key={field.key}
                          label={t(field.labelKey)}
                          value={currentValue}
                          onChange={(next) => updateDraftTheme(field.key, next)}
                          onReset={handleReset}
                          canReset={canReset}
                        />
                      )
                    })}
                  </div>
                ),
              },
              {
                key: 'preview',
                label: t('gallery.editor.section.preview'),
                children: (
                  <div className="template-editor-grid">
                    {PREVIEW_FIELDS.map((field) => {
                      const currentValue = editorDraft.preview[field.key]
                      const savedValue = selectedTemplate.preview[field.key]
                      const canReset = editorMode === 'edit' && currentValue !== savedValue
                      const handleReset = canReset ? () => updateDraftPreview(field.key, savedValue) : undefined

                      return field.kind === 'gradient' ? (
                        <GradientField
                          key={field.key}
                          label={t(field.labelKey)}
                          value={currentValue}
                          onChange={(next) => updateDraftPreview(field.key, next)}
                          onReset={handleReset}
                          canReset={canReset}
                        />
                      ) : (
                        <ColorField
                          key={field.key}
                          label={t(field.labelKey)}
                          value={currentValue}
                          onChange={(next) => updateDraftPreview(field.key, next)}
                          onReset={handleReset}
                          canReset={canReset}
                        />
                      )
                    })}
                  </div>
                ),
              },
            ]}
          />

          <div className="template-editor-toolbar">
            <Space wrap>
              <Button
                type="primary"
                icon={savingTemplate ? <SyncOutlined spin /> : <SaveOutlined />}
                onClick={onSaveTemplate}
                disabled={!draftDirty || savingTemplate}
              >
                {editorMode === 'create' ? t('gallery.editor.save.createTemplate') : t('gallery.editor.save.updateTemplate')}
              </Button>
              {editorMode === 'create' ? (
                <Button onClick={onCancelCreate}>{t('gallery.editor.save.cancelCreate')}</Button>
              ) : null}
            </Space>

            {editorMode === 'edit' && !selectedTemplate.builtIn ? (
              <Popconfirm
                title={t('gallery.editor.delete.title')}
                description={t('gallery.editor.delete.description')}
                okText={t('gallery.editor.delete.confirm')}
                cancelText={t('common:actions.cancel')}
                onConfirm={onDeleteTemplate}
              >
                <Button danger icon={<DeleteOutlined />} loading={deletingTemplateKey === selectedTemplate.key}>
                  {t('gallery.editor.delete.button')}
                </Button>
              </Popconfirm>
            ) : null}
          </div>
        </Space>
      ) : (
        <Result status="info" title={t('gallery.editor.selectFirst.title')} />
      )}
    </Card>
  )
}
