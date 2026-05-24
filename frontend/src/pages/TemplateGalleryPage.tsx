import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileAddOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Input,
  Popconfirm,
  Radio,
  Result,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ColorField } from '../features/resume/components/ColorField'
import { GradientField } from '../features/resume/components/GradientField'
import { ResumePreview } from '../features/resume/components/ResumePreview'
import { ResumeTemplatePicker } from '../features/resume/components/ResumeTemplatePicker'
import { useIsMobile } from '../lib/hooks/useIsMobile'
import {
  createResumeTemplate,
  deleteResumeTemplate,
  listManagedResumeTemplates,
  updateResumeTemplate,
} from '../features/resume/api/templateCatalogApi'
import { createResume, getResume, updateResume } from '../features/resume/api/resumeApi'
import {
  replaceManagedResumeTemplateCatalogCache,
} from '../features/resume/hooks/useResumeTemplateCatalog'
import {
  DEFAULT_RESUME_TEMPLATE_KEY,
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  getDefaultResumeTemplate,
  getLocalizedField,
  type ManagedResumeTemplateDefinition,
  type ResumeTemplateDefinition,
  type ResumeTemplateLayout,
  type ResumeTemplatePreview,
  type ResumeTemplateTheme,
  type ResumeTemplateUpdatePayload,
} from '../features/resume/templateCatalog'
import { createDefaultResumeLayout } from '../features/resume/types'
import type { ResumeDetail } from '../features/resume/types'

const { Paragraph, Text, Title } = Typography
const { TextArea } = Input

type EditorMode = 'edit' | 'create'

const LAYOUT_OPTION_KEYS: Array<{ value: ResumeTemplateLayout; labelKey: string }> = [
  { value: 'classic', labelKey: 'layout.classic' },
  { value: 'two-column', labelKey: 'layout.twoColumn' },
  { value: 'minimal', labelKey: 'layout.minimal' },
  { value: 'editorial', labelKey: 'layout.editorial' },
]

type ColorTokenKind = 'color' | 'gradient'

const THEME_FIELDS: Array<{ key: keyof ResumeTemplateTheme; labelKey: string; kind: ColorTokenKind }> = [
  { key: 'pageBackground', labelKey: 'theme.pageBackground', kind: 'color' },
  { key: 'borderColor', labelKey: 'theme.borderColor', kind: 'color' },
  { key: 'mutedText', labelKey: 'theme.mutedText', kind: 'color' },
  { key: 'accent', labelKey: 'theme.accent', kind: 'color' },
  { key: 'accentSoft', labelKey: 'theme.accentSoft', kind: 'color' },
  { key: 'accentText', labelKey: 'theme.accentText', kind: 'color' },
  { key: 'heroBackground', labelKey: 'theme.heroBackground', kind: 'gradient' },
  { key: 'heroText', labelKey: 'theme.heroText', kind: 'color' },
  { key: 'heroMuted', labelKey: 'theme.heroMuted', kind: 'color' },
  { key: 'railBackground', labelKey: 'theme.railBackground', kind: 'gradient' },
  { key: 'panelBackground', labelKey: 'theme.panelBackground', kind: 'color' },
]

const PREVIEW_FIELDS: Array<{ key: keyof ResumeTemplatePreview; labelKey: string; kind: ColorTokenKind }> = [
  { key: 'canvasBackground', labelKey: 'previewStyle.canvasBackground', kind: 'gradient' },
  { key: 'sheetBackground', labelKey: 'previewStyle.sheetBackground', kind: 'color' },
  { key: 'heroBackground', labelKey: 'previewStyle.heroBackground', kind: 'gradient' },
  { key: 'asideBackground', labelKey: 'previewStyle.asideBackground', kind: 'color' },
  { key: 'lineColor', labelKey: 'previewStyle.lineColor', kind: 'color' },
]

const DEMO_RESUME: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'> = {
  title: '产品经理示例简历',
  templateKey: getDefaultResumeTemplate(FALLBACK_RESUME_TEMPLATE_CATALOG).key,
  layout: createDefaultResumeLayout(),
  content: {
    personalInfo: {
      fullName: '林知夏',
      headline: 'Senior Product Manager',
      phone: '138-0000-0000',
      email: 'zhixia.lin@example.com',
      city: '上海',
      website: 'portfolio.example.com',
      expectedSalary: '',
      age: '',
      avatar: '',
    },
    personalSummary:
      '8 年互联网产品经验，擅长 B 端工作流、AI 产品设计与跨团队落地，长期负责从 0 到 1 的产品规划、验证与规模化交付。',
    education: [
      {
        school: '复旦大学',
        degree: '硕士',
        major: '管理科学与工程',
        startDate: '2014.09',
        endDate: '2017.06',
        description: '聚焦产品创新方法、数据分析与组织协同。',
      },
    ],
    workExperience: [
      {
        company: '星图智能科技',
        role: '高级产品经理',
        startDate: '2021.03',
        endDate: '至今',
        description: '主导 AI 简历与招聘协作平台，搭建模板中心、分享链路与数据闭环，推动核心功能上线后转化率提升 27%。',
      },
      {
        company: '远帆软件',
        role: '产品经理',
        startDate: '2017.07',
        endDate: '2021.02',
        description: '负责企业流程系统与数据看板产品，持续优化岗位匹配与审批体验。',
      },
    ],
    projectExperience: [
      {
        name: '智能模板中心',
        role: '负责人',
        startDate: '2025.11',
        endDate: '2026.05',
        description: '设计模板元数据结构、动态加载方案与回滚策略，让 AI 导入模板与人工微调共存。',
      },
    ],
    skills: [
      { name: '产品规划', level: '专家' },
      { name: '用户研究', level: '熟练' },
      { name: 'SQL / 数据分析', level: '熟练' },
      { name: 'Prompt Design', level: '熟练' },
    ],
    honors: [
      {
        title: '年度创新项目',
        issuer: '星图智能科技',
        awardedAt: '2024',
        description: '模板中心方向获得年度产品创新奖。',
      },
    ],
    certificates: [
      {
        name: 'PMP',
        issuer: 'PMI',
        issuedAt: '2022',
        credentialId: 'PMP-2022-8899',
      },
    ],
  },
}

const FALLBACK_MANAGED_TEMPLATE: ManagedResumeTemplateDefinition = {
  ...getDefaultResumeTemplate(FALLBACK_RESUME_TEMPLATE_CATALOG),
  builtIn: true,
  updatedAt: null,
}

function getDefaultManagedTemplate(catalog: ManagedResumeTemplateDefinition[]) {
  return catalog.find((template) => template.key === DEFAULT_RESUME_TEMPLATE_KEY) ?? catalog[0] ?? FALLBACK_MANAGED_TEMPLATE
}

export function TemplateGalleryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation('template')
  const locale = i18n.language
  const isMobile = useIsMobile()
  const resumeId = searchParams.get('resumeId') ?? ''
  const { message } = App.useApp()
  const [templates, setTemplates] = useState<ManagedResumeTemplateDefinition[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError, setTemplateError] = useState<Error | null>(null)
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loadingResume, setLoadingResume] = useState(Boolean(resumeId))
  const [resumeError, setResumeError] = useState<Error | null>(null)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('')
  const [selectionTouched, setSelectionTouched] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('preview')
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [editorDraft, setEditorDraft] = useState<ManagedResumeTemplateDefinition | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [applyingTemplateKey, setApplyingTemplateKey] = useState<string | null>(null)
  const [deletingTemplateKey, setDeletingTemplateKey] = useState<string | null>(null)
  const [creatingResumeTemplateKey, setCreatingResumeTemplateKey] = useState<string | null>(null)
  const isResumeTemplateChange = Boolean(resumeId)

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.key === selectedTemplateKey) ?? getDefaultManagedTemplate(templates),
    [selectedTemplateKey, templates],
  )

  const previewTemplate = editorDraft ?? selectedTemplate ?? FALLBACK_MANAGED_TEMPLATE
  const previewResume = useMemo(
    () => buildPreviewResume(resume, previewTemplate.key),
    [previewTemplate.key, resume],
  )
  const linkedTemplate = resume ? templates.find((item) => item.key === resume.templateKey) : null
  const linkedTemplateName = resume
    ? linkedTemplate
      ? getLocalizedField(linkedTemplate.name, locale)
      : resume.templateKey
    : null
  const draftDirty = useMemo(() => {
    if (!editorDraft) {
      return false
    }

    if (editorMode === 'create') {
      return true
    }

    if (!selectedTemplate) {
      return false
    }

    return serializeTemplateDraft(editorDraft) !== serializeTemplateDraft(selectedTemplate)
  }, [editorDraft, editorMode, selectedTemplate])

  const canApplyTemplate = Boolean(
    resume && editorMode === 'edit' && selectedTemplate && resume.templateKey !== selectedTemplate.key,
  )

  const syncTemplates = useCallback(
    (nextTemplates: ManagedResumeTemplateDefinition[], preferredKey?: string) => {
      setTemplates(nextTemplates)
      replaceManagedResumeTemplateCatalogCache(nextTemplates)
      setSelectedTemplateKey((current) =>
        chooseTemplateKey(nextTemplates, {
          current,
          preferred: preferredKey,
          resumeKey: !selectionTouched ? resume?.templateKey : undefined,
        }),
      )
    },
    [resume?.templateKey, selectionTouched],
  )

  const loadTemplateCatalog = useCallback(
    async (preferredKey?: string) => {
      setLoadingTemplates(true)
      try {
        const catalog = await listManagedResumeTemplates()
        syncTemplates(catalog, preferredKey)
        setTemplateError(null)
      } catch (error) {
        setTemplateError(error instanceof Error ? error : new Error(t('gallery.error.loadCatalog')))
      } finally {
        setLoadingTemplates(false)
      }
    },
    [syncTemplates, t],
  )

  const loadResume = useCallback(async () => {
    if (!resumeId) {
      setResume(null)
      setLoadingResume(false)
      setResumeError(null)
      return
    }

    setLoadingResume(true)
    try {
      const detail = await getResume(resumeId)
      setResume(detail)
      setResumeError(null)
    } catch (error) {
      setResume(null)
      setResumeError(error instanceof Error ? error : new Error(t('gallery.error.loadResume')))
    } finally {
      setLoadingResume(false)
    }
  }, [resumeId, t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTemplateCatalog()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadTemplateCatalog])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResume()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadResume])

  useEffect(() => {
    if (editorMode !== 'edit') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setEditorDraft(selectedTemplate ? cloneManagedTemplate(selectedTemplate) : null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [editorMode, selectedTemplate])

  useEffect(() => {
    if (!selectionTouched && resume?.templateKey) {
      const timeoutId = window.setTimeout(() => {
        setSelectedTemplateKey(resume.templateKey)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [resume?.templateKey, selectionTouched])

  function handleTemplateSelect(nextTemplateKey: string) {
    if (nextTemplateKey === selectedTemplateKey && editorMode === 'edit') {
      return
    }
    setSelectionTouched(true)
    setEditorMode('edit')
    setSelectedTemplateKey(nextTemplateKey)
    setEditorDraft(null)
  }

  async function handleCreateResumeFromTemplate(templateKey: string) {
    const template = templates.find((item) => item.key === templateKey)
    setCreatingResumeTemplateKey(templateKey)
    try {
      const detail = await createResume({
        title: template ? t('gallery.draft.defaultResumeName', { name: template.name }) : t('gallery.draft.untitledResume'),
        templateKey,
      })
      void message.success(t('gallery.message.resumeCreated'))
      navigate(`/app/resumes/${detail.id}`)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.createResumeFailed'))
    } finally {
      setCreatingResumeTemplateKey(null)
    }
  }

  function handleCreateFromCurrent() {
    setSelectionTouched(true)
    setEditorMode('create')
    setEditorDraft(createNewTemplateDraft(selectedTemplate, templates, t))
    if (isMobile) {
      setMobileExpanded(true)
      setMobileView('edit')
    }
  }

  function handleCancelCreate() {
    setEditorMode('edit')
    setEditorDraft(selectedTemplate ? cloneManagedTemplate(selectedTemplate) : null)
  }

  async function handleSaveTemplate() {
    if (!editorDraft) {
      return
    }

    const validationMessage = validateTemplateDraft(editorDraft, editorMode, t)
    if (validationMessage) {
      void message.error(validationMessage)
      return
    }

    setSavingTemplate(true)
    try {
      if (editorMode === 'create') {
        await createResumeTemplate({
          key: editorDraft.key,
          ...toUpdatePayload(editorDraft),
        })
        await loadTemplateCatalog(editorDraft.key)
        setEditorMode('edit')
        void message.success(t('gallery.message.templateCreated'))
      } else if (selectedTemplate) {
        await updateResumeTemplate(selectedTemplate.key, toUpdatePayload(editorDraft))
        await loadTemplateCatalog(selectedTemplate.key)
        void message.success(t('gallery.message.templateUpdated'))
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.templateSaveFailed'))
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplate || selectedTemplate.builtIn) {
      return
    }

    setDeletingTemplateKey(selectedTemplate.key)
    try {
      await deleteResumeTemplate(selectedTemplate.key)
      await loadTemplateCatalog()
      setEditorMode('edit')
      void message.success(t('gallery.message.templateDeleted'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.templateDeleteFailed'))
    } finally {
      setDeletingTemplateKey(null)
    }
  }

  async function handleApplyTemplateToResume() {
    if (!resume || !selectedTemplate) {
      return
    }

    setApplyingTemplateKey(selectedTemplate.key)
    try {
      const updated = await updateResume(resume.id, {
        title: resume.title,
        templateKey: selectedTemplate.key,
        content: resume.content,
        layout: resume.layout,
      })
      setResume(updated)
      void message.success(t('gallery.message.templateApplied'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.templateApplyFailed'))
    } finally {
      setApplyingTemplateKey(null)
    }
  }

  function updateDraftField<K extends keyof ManagedResumeTemplateDefinition>(
    field: K,
    value: ManagedResumeTemplateDefinition[K],
  ) {
    setEditorDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  function updateDraftTheme<K extends keyof ResumeTemplateTheme>(field: K, value: string) {
    setEditorDraft((current) =>
      current
        ? {
            ...current,
            theme: {
              ...current.theme,
              [field]: value,
            },
          }
        : current,
    )
  }

  function updateDraftPreview<K extends keyof ResumeTemplatePreview>(field: K, value: string) {
    setEditorDraft((current) =>
      current
        ? {
            ...current,
            preview: {
              ...current.preview,
              [field]: value,
            },
          }
        : current,
    )
  }

  if (loadingTemplates && templates.length === 0) {
    return (
      <div className="full-page-center" style={{ minHeight: '100vh' }}>
        <Spin size="large" tip={isResumeTemplateChange ? t('gallery.loading.changeTemplate') : t('gallery.loading.catalog')} />
      </div>
    )
  }

  if (templateError && templates.length === 0) {
    return (
      <div className="full-page-center">
        <Card className="auth-card" bordered={false} style={{ width: 'min(860px, 100%)' }}>
          <Result
            status="error"
            title={t('gallery.error.catalogUnavailable')}
            subTitle={templateError.message}
            extra={
              <Space wrap>
                <Button type="primary" onClick={() => void loadTemplateCatalog()}>
                  {t('common:actions.reload')}
                </Button>
                <Button onClick={() => navigate('/app')} icon={<ArrowLeftOutlined />}>
                  {t('gallery.nav.backToWorkspace')}
                </Button>
              </Space>
            }
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
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/app')}>
              {t('gallery.nav.backToWorkspace')}
            </Button>
          </div>
          <Title level={2} style={{ marginBottom: 8 }}>
            {isResumeTemplateChange ? t('gallery.title.changeTemplate') : t('gallery.title.catalog')}
          </Title>
        </div>

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
      </div>

      <div className="template-gallery-layout">
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          {(!isMobile || !mobileExpanded) ? (
          <Card
            className="glass-card"
            bordered={false}
            title={t('gallery.catalog.title')}
            extra={
              <Space wrap>
                <Button icon={<PlusOutlined />} onClick={handleCreateFromCurrent}>
                  {t('gallery.catalog.newTemplate')}
                </Button>
                {!isMobile ? (
                  <Button icon={<ReloadOutlined />} onClick={() => void loadTemplateCatalog(selectedTemplate?.key)}>
                    {t('gallery.catalog.refreshCatalog')}
                  </Button>
                ) : null}
              </Space>
            }
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
                value={selectedTemplate?.key ?? FALLBACK_MANAGED_TEMPLATE.key}
                onChange={(key) => void handleTemplateSelect(key)}
                ariaLabel={t('gallery.catalog.selectTemplate')}
              />

              {isMobile && selectedTemplate ? (
                <Button
                  type="primary"
                  block
                  icon={<EyeOutlined />}
                  onClick={() => { setMobileExpanded(true); setMobileView('preview') }}
                >
                  {t('gallery.catalog.viewTemplate')}
                </Button>
              ) : null}
            </Space>
          </Card>
          ) : null}

          {isMobile && mobileExpanded ? (
            <>
              <div className="resume-editor-mobile-tabs">
                <Radio.Group
                  value={mobileView}
                  onChange={(e) => setMobileView(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="middle"
                >
                  <Radio.Button value="edit">{t('gallery.editor.section.basic')}</Radio.Button>
                  <Radio.Button value="preview">{t('gallery.editor.section.preview')}</Radio.Button>
                </Radio.Group>
              </div>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setMobileExpanded(false)} style={{ alignSelf: 'flex-start' }}>
                {t('gallery.nav.backToCatalog')}
              </Button>
            </>
          ) : null}

          {(!isMobile || (mobileExpanded && mobileView === 'edit')) ? (
          <Card
            className="glass-card"
            bordered={false}
            title={editorMode === 'create' ? t('gallery.editor.title.create') : t('gallery.editor.title.edit')}
            extra={
              editorMode === 'edit' && selectedTemplate ? (
                <Space wrap>
                  <Tag color={selectedTemplate.builtIn ? 'blue' : 'green'}>
                    {selectedTemplate.builtIn ? t('gallery.editor.tag.builtIn') : t('gallery.editor.tag.custom')}
                  </Tag>
                  <Tag>{layoutLabel(selectedTemplate.layout, t)}</Tag>
                </Space>
              ) : null
            }
          >
            {editorMode === 'edit' && selectedTemplate?.builtIn ? (
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
                              value={editorDraft.name}
                              onChange={(event) => updateDraftField('name', event.target.value)}
                            />
                          </div>
                          <div className="template-editor-field">
                            <Text type="secondary">{t('gallery.editor.field.category')}</Text>
                            <Input
                              value={editorDraft.category}
                              onChange={(event) => updateDraftField('category', event.target.value)}
                            />
                          </div>
                          <div className="template-editor-field">
                            <Text type="secondary">{t('gallery.editor.field.layout')}</Text>
                            <Select<ResumeTemplateLayout>
                              value={editorDraft.layout}
                              options={LAYOUT_OPTION_KEYS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
                              onChange={(value) => updateDraftField('layout', value)}
                            />
                          </div>
                          <div className="template-editor-field template-editor-field--span-2">
                            <Text type="secondary">{t('gallery.editor.field.summary')}</Text>
                            <TextArea
                              rows={4}
                              value={editorDraft.summary}
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
                            const savedValue = selectedTemplate?.theme[field.key]
                            const canReset =
                              editorMode === 'edit' &&
                              !!selectedTemplate &&
                              savedValue !== undefined &&
                              currentValue !== savedValue
                            const handleReset = canReset && savedValue !== undefined
                              ? () => updateDraftTheme(field.key, savedValue)
                              : undefined
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
                            const savedValue = selectedTemplate?.preview[field.key]
                            const canReset =
                              editorMode === 'edit' &&
                              !!selectedTemplate &&
                              savedValue !== undefined &&
                              currentValue !== savedValue
                            const handleReset = canReset && savedValue !== undefined
                              ? () => updateDraftPreview(field.key, savedValue)
                              : undefined
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
                      onClick={() => void handleSaveTemplate()}
                      disabled={!draftDirty || savingTemplate}
                    >
                      {editorMode === 'create' ? t('gallery.editor.save.createTemplate') : t('gallery.editor.save.updateTemplate')}
                    </Button>
                    {editorMode === 'create' ? (
                      <Button onClick={handleCancelCreate}>{t('gallery.editor.save.cancelCreate')}</Button>
                    ) : null}
                  </Space>

                  {editorMode === 'edit' && selectedTemplate && !selectedTemplate.builtIn ? (
                    <Popconfirm
                      title={t('gallery.editor.delete.title')}
                      description={t('gallery.editor.delete.description')}
                      okText={t('gallery.editor.delete.confirm')}
                      cancelText={t('common:actions.cancel')}
                      onConfirm={() => void handleDeleteTemplate()}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        loading={deletingTemplateKey === selectedTemplate.key}
                      >
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
          ) : null}
        </Space>

        {(!isMobile || (mobileExpanded && mobileView === 'preview')) ? (
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
                        onClick={() => void handleApplyTemplateToResume()}
                        loading={applyingTemplateKey === selectedTemplate?.key}
                        disabled={!canApplyTemplate}
                      >
                        {t('gallery.preview.applyToResume')}
                      </Button>
                      <Button onClick={() => navigate(`/app/resumes/${resume.id}`)}>
                        {t('gallery.preview.backToResume')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      icon={<FileAddOutlined />}
                      onClick={() => void handleCreateResumeFromTemplate(previewTemplate.key)}
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
        ) : null}
      </div>
    </div>
  )
}

function chooseTemplateKey(
  templates: ManagedResumeTemplateDefinition[],
  options: {
    current?: string
    preferred?: string
    resumeKey?: string
  },
) {
  if (options.preferred && templates.some((template) => template.key === options.preferred)) {
    return options.preferred
  }

  if (options.current && templates.some((template) => template.key === options.current)) {
    return options.current
  }

  if (options.resumeKey && templates.some((template) => template.key === options.resumeKey)) {
    return options.resumeKey
  }

  return templates.find((template) => template.key === DEFAULT_RESUME_TEMPLATE_KEY)?.key ?? templates[0]?.key ?? ''
}

function cloneManagedTemplate(template: ManagedResumeTemplateDefinition): ManagedResumeTemplateDefinition {
  return {
    ...template,
    theme: { ...template.theme },
    preview: { ...template.preview },
  }
}

function createNewTemplateDraft(
  template: ResumeTemplateDefinition | null,
  existingTemplates: ManagedResumeTemplateDefinition[],
  t: (key: string, options?: Record<string, unknown>) => string,
): ManagedResumeTemplateDefinition {
  const base = template ?? FALLBACK_MANAGED_TEMPLATE
  const baseKey = normalizeTemplateKey(`${base.key}-copy`) || 'custom-template'

  return {
    ...cloneManagedTemplate({
      ...base,
      builtIn: false,
      updatedAt: null,
    }),
    key: createUniqueTemplateKey(baseKey, existingTemplates),
    name: t('gallery.draft.copyName', { name: base.name }),
    builtIn: false,
    updatedAt: null,
  }
}

function createUniqueTemplateKey(baseKey: string, existingTemplates: ManagedResumeTemplateDefinition[]) {
  const existingKeys = new Set(existingTemplates.map((item) => item.key))
  if (!existingKeys.has(baseKey)) {
    return baseKey
  }

  let counter = 2
  while (existingKeys.has(`${baseKey}-${counter}`)) {
    counter += 1
  }

  return `${baseKey}-${counter}`
}

function normalizeTemplateKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function buildPreviewResume(resume: ResumeDetail | null, templateKey: string) {
  if (!resume) {
    return {
      ...DEMO_RESUME,
      templateKey,
    }
  }

  return {
    title: resume.title,
    templateKey,
    layout: resume.layout,
    content: resume.content,
  }
}

function validateTemplateDraft(
  template: ManagedResumeTemplateDefinition,
  mode: EditorMode,
  t: (key: string) => string,
) {
  if (mode === 'create' && !template.key.trim()) {
    return t('gallery.validation.keyRequired')
  }

  const basicFields = [
    template.name,
    template.summary,
    template.category,
    template.layout,
  ]
  if (basicFields.some((field) => field.trim().length === 0)) {
    return t('gallery.validation.basicRequired')
  }

  if (THEME_FIELDS.some((field) => template.theme[field.key].trim().length === 0)) {
    return t('gallery.validation.themeRequired')
  }

  if (PREVIEW_FIELDS.some((field) => template.preview[field.key].trim().length === 0)) {
    return t('gallery.validation.previewRequired')
  }

  return null
}

function toUpdatePayload(template: ManagedResumeTemplateDefinition): ResumeTemplateUpdatePayload {
  return {
    name: template.name.trim(),
    summary: template.summary.trim(),
    category: template.category.trim(),
    layout: template.layout,
    theme: trimTheme(template.theme),
    preview: trimPreview(template.preview),
  }
}

function trimTheme(theme: ResumeTemplateTheme): ResumeTemplateTheme {
  return {
    pageBackground: theme.pageBackground.trim(),
    borderColor: theme.borderColor.trim(),
    mutedText: theme.mutedText.trim(),
    accent: theme.accent.trim(),
    accentSoft: theme.accentSoft.trim(),
    accentText: theme.accentText.trim(),
    heroBackground: theme.heroBackground.trim(),
    heroText: theme.heroText.trim(),
    heroMuted: theme.heroMuted.trim(),
    railBackground: theme.railBackground.trim(),
    panelBackground: theme.panelBackground.trim(),
  }
}

function trimPreview(preview: ResumeTemplatePreview): ResumeTemplatePreview {
  return {
    canvasBackground: preview.canvasBackground.trim(),
    sheetBackground: preview.sheetBackground.trim(),
    heroBackground: preview.heroBackground.trim(),
    asideBackground: preview.asideBackground.trim(),
    lineColor: preview.lineColor.trim(),
  }
}

function serializeTemplateDraft(template: ManagedResumeTemplateDefinition) {
  return JSON.stringify({
    key: template.key,
    name: template.name,
    summary: template.summary,
    category: template.category,
    layout: template.layout,
    theme: template.theme,
    preview: template.preview,
  })
}

function layoutLabel(layout: ResumeTemplateLayout, t: (key: string) => string) {
  const option = LAYOUT_OPTION_KEYS.find((item) => item.value === layout)
  return option ? t(option.labelKey) : layout
}
