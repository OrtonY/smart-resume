import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
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
  Result,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ColorField } from '../features/resume/components/ColorField'
import { GradientField } from '../features/resume/components/GradientField'
import { ResumePreview } from '../features/resume/components/ResumePreview'
import { ResumeTemplatePicker } from '../features/resume/components/ResumeTemplatePicker'
import {
  createResumeTemplate,
  deleteResumeTemplate,
  listManagedResumeTemplates,
  restoreBuiltInTemplatesFromBackup,
  updateResumeTemplate,
} from '../features/resume/api/templateCatalogApi'
import { createResume, getResume, updateResume } from '../features/resume/api/resumeApi'
import {
  replaceResumeTemplateCatalogCache,
} from '../features/resume/hooks/useResumeTemplateCatalog'
import {
  DEFAULT_RESUME_TEMPLATE_KEY,
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  getDefaultResumeTemplate,
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

const LAYOUT_OPTIONS: Array<{ value: ResumeTemplateLayout; label: string }> = [
  { value: 'classic', label: '经典专业' },
  { value: 'two-column', label: '现代双栏' },
  { value: 'minimal', label: '极简 ATS' },
  { value: 'editorial', label: '编辑创意' },
]

type ColorTokenKind = 'color' | 'gradient'

const THEME_FIELDS: Array<{ key: keyof ResumeTemplateTheme; label: string; kind: ColorTokenKind }> = [
  { key: 'pageBackground', label: '页面背景', kind: 'color' },
  { key: 'borderColor', label: '边框颜色', kind: 'color' },
  { key: 'mutedText', label: '弱化文字', kind: 'color' },
  { key: 'accent', label: '主强调色', kind: 'color' },
  { key: 'accentSoft', label: '浅强调色', kind: 'color' },
  { key: 'accentText', label: '强调色上的文字', kind: 'color' },
  { key: 'heroBackground', label: '头部背景', kind: 'gradient' },
  { key: 'heroText', label: '头部文字', kind: 'color' },
  { key: 'heroMuted', label: '头部弱化文字', kind: 'color' },
  { key: 'railBackground', label: '侧栏背景', kind: 'gradient' },
  { key: 'panelBackground', label: '面板背景', kind: 'color' },
]

const PREVIEW_FIELDS: Array<{ key: keyof ResumeTemplatePreview; label: string; kind: ColorTokenKind }> = [
  { key: 'canvasBackground', label: '画布背景', kind: 'gradient' },
  { key: 'sheetBackground', label: '纸张背景', kind: 'color' },
  { key: 'heroBackground', label: '预览头部背景', kind: 'gradient' },
  { key: 'asideBackground', label: '预览侧栏背景', kind: 'color' },
  { key: 'lineColor', label: '分隔线颜色', kind: 'color' },
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
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [editorDraft, setEditorDraft] = useState<ManagedResumeTemplateDefinition | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [restoringBuiltIns, setRestoringBuiltIns] = useState(false)
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
  const linkedTemplateName = resume ? templates.find((item) => item.key === resume.templateKey)?.name ?? resume.templateKey : null
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
      replaceResumeTemplateCatalogCache(nextTemplates)
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
        setTemplateError(error instanceof Error ? error : new Error('无法加载模板目录'))
      } finally {
        setLoadingTemplates(false)
      }
    },
    [syncTemplates],
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
      setResumeError(error instanceof Error ? error : new Error('无法加载关联简历'))
    } finally {
      setLoadingResume(false)
    }
  }, [resumeId])

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
        title: template ? `${template.name}简历` : '未命名简历',
        templateKey,
      })
      void message.success('简历已创建。')
      navigate(`/app/resumes/${detail.id}`)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法创建简历。')
    } finally {
      setCreatingResumeTemplateKey(null)
    }
  }

  function handleCreateFromCurrent() {
    setSelectionTouched(true)
    setEditorMode('create')
    setEditorDraft(createNewTemplateDraft(selectedTemplate, templates))
  }

  function handleCancelCreate() {
    setEditorMode('edit')
    setEditorDraft(selectedTemplate ? cloneManagedTemplate(selectedTemplate) : null)
  }

  async function handleSaveTemplate() {
    if (!editorDraft) {
      return
    }

    const validationMessage = validateTemplateDraft(editorDraft, editorMode)
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
        void message.success('模板已创建，已写入数据库。')
      } else if (selectedTemplate) {
        await updateResumeTemplate(selectedTemplate.key, toUpdatePayload(editorDraft))
        await loadTemplateCatalog(selectedTemplate.key)
        void message.success('模板已更新。')
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '模板保存失败')
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
      void message.success('自定义模板已删除。')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '模板删除失败')
    } finally {
      setDeletingTemplateKey(null)
    }
  }

  async function handleRestoreBuiltIns() {
    setRestoringBuiltIns(true)
    try {
      const restored = await restoreBuiltInTemplatesFromBackup()
      syncTemplates(restored, selectedTemplate?.key ?? resume?.templateKey)
      setEditorMode('edit')
      void message.success('内置模板已从备份恢复。')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '恢复内置模板失败')
    } finally {
      setRestoringBuiltIns(false)
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
      void message.success('已应用到当前简历。')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '模板应用失败')
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
        <Spin size="large" tip={isResumeTemplateChange ? '正在加载修改模板...' : '正在加载模板目录...'} />
      </div>
    )
  }

  if (templateError && templates.length === 0) {
    return (
      <div className="full-page-center">
        <Card className="auth-card" bordered={false} style={{ width: 'min(860px, 100%)' }}>
          <Result
            status="error"
            title="模板目录暂时不可用"
            subTitle={templateError.message}
            extra={
              <Space wrap>
                <Button type="primary" onClick={() => void loadTemplateCatalog()}>
                  重新加载
                </Button>
                <Button onClick={() => navigate('/app')} icon={<ArrowLeftOutlined />}>
                  返回工作区
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
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/app')}>
              返回工作区
            </Button>
          </Space>
          <Title level={2} style={{ marginBottom: 8 }}>
            {isResumeTemplateChange ? '修改模板' : '模板目录'}
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {isResumeTemplateChange
              ? '选择模板并应用到当前简历，已有内容会保留，只切换展示样式。'
              : '先浏览模板样式，在右侧预览确认后再创建新简历。'}
          </Paragraph>
        </div>

        <Card className="glass-card template-gallery-summary" bordered={false}>
          <Space direction="vertical" size={6}>
            <Text type="secondary">{resume ? '当前关联简历' : '创建入口'}</Text>
            <Title level={4} style={{ margin: 0 }}>
              {resume ? resume.title : '预览后创建简历'}
            </Title>
            <Space wrap>
              {resume ? (
                <Tag color="blue" icon={<CheckCircleOutlined />}>
                  当前模板：{linkedTemplateName ?? resume.templateKey}
                </Tag>
              ) : (
                <Tag color="purple">点击模板仅切换预览</Tag>
              )}
              <Tag color={editorMode === 'create' ? 'gold' : 'success'}>
                {editorMode === 'create' ? '新建模板草稿' : '编辑已有模板'}
              </Tag>
            </Space>
          </Space>
        </Card>
      </div>

      <div className="template-gallery-layout">
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Card
            className="glass-card"
            bordered={false}
            title="模板目录"
            extra={
              <Space wrap>
                <Button icon={<PlusOutlined />} onClick={handleCreateFromCurrent}>
                  新建模板
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => void loadTemplateCatalog(selectedTemplate?.key)}>
                  刷新目录
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {templateError ? (
                <Alert
                  type="warning"
                  showIcon
                  message="模板目录最近一次刷新失败"
                  description={templateError.message}
                />
              ) : null}

              <Alert
                type={resume ? 'info' : 'success'}
                showIcon
                message={resume ? '可直接把当前选中的模板应用到这份简历。' : '点击模板会更新右侧预览和下方配置区；创建简历需要在右侧手动确认。'}
              />

              <ResumeTemplatePicker
                templates={templates.length > 0 ? templates : [FALLBACK_MANAGED_TEMPLATE]}
                value={selectedTemplate?.key ?? FALLBACK_MANAGED_TEMPLATE.key}
                onChange={(key) => void handleTemplateSelect(key)}
                ariaLabel="选择简历模板"
              />
            </Space>
          </Card>

          <Card
            className="glass-card"
            bordered={false}
            title={editorMode === 'create' ? '新建模板' : '模板配置'}
            extra={
              editorMode === 'edit' && selectedTemplate ? (
                <Space wrap>
                  <Tag color={selectedTemplate.builtIn ? 'blue' : 'green'}>
                    {selectedTemplate.builtIn ? '内置模板' : '自定义模板'}
                  </Tag>
                  <Tag>{layoutLabel(selectedTemplate.layout)}</Tag>
                </Space>
              ) : null
            }
          >
            {editorDraft ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Alert
                  type="info"
                  showIcon
                  message="数据库是模板目录的主数据源。"
                  description="删除自定义模板不会自动改写已有简历的 templateKey；仍引用这个 key 的简历会退回默认模板，直到重新指定。"
                />

                <Collapse
                  defaultActiveKey={['basic']}
                  items={[
                    {
                      key: 'basic',
                      label: '基础信息',
                      children: (
                        <div className="template-editor-grid">
                          <div className="template-editor-field template-editor-field--span-2">
                            <Text type="secondary">模板标识</Text>
                            <Input
                              value={editorDraft.key}
                              disabled={editorMode === 'edit'}
                              placeholder="例如 modern-ops"
                              onChange={(event) => updateDraftField('key', normalizeTemplateKey(event.target.value))}
                            />
                          </div>
                          <div className="template-editor-field">
                            <Text type="secondary">名称</Text>
                            <Input
                              value={editorDraft.name}
                              onChange={(event) => updateDraftField('name', event.target.value)}
                            />
                          </div>
                          <div className="template-editor-field">
                            <Text type="secondary">分类</Text>
                            <Input
                              value={editorDraft.category}
                              onChange={(event) => updateDraftField('category', event.target.value)}
                            />
                          </div>
                          <div className="template-editor-field">
                            <Text type="secondary">布局</Text>
                            <Select<ResumeTemplateLayout>
                              value={editorDraft.layout}
                              options={LAYOUT_OPTIONS}
                              onChange={(value) => updateDraftField('layout', value)}
                            />
                          </div>
                          <div className="template-editor-field template-editor-field--span-2">
                            <Text type="secondary">说明</Text>
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
                      label: '主题样式',
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
                                label={field.label}
                                value={currentValue}
                                onChange={(next) => updateDraftTheme(field.key, next)}
                                onReset={handleReset}
                                canReset={canReset}
                              />
                            ) : (
                              <ColorField
                                key={field.key}
                                label={field.label}
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
                      label: '预览样式',
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
                                label={field.label}
                                value={currentValue}
                                onChange={(next) => updateDraftPreview(field.key, next)}
                                onReset={handleReset}
                                canReset={canReset}
                              />
                            ) : (
                              <ColorField
                                key={field.key}
                                label={field.label}
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
                      {editorMode === 'create' ? '保存为新模板' : '保存修改'}
                    </Button>
                    {editorMode === 'create' ? (
                      <Button onClick={handleCancelCreate}>取消新建</Button>
                    ) : (
                      <Popconfirm
                        title="恢复内置模板"
                        description="会用备份文件覆盖所有内置模板，自定义模板会保留。"
                        okText="恢复"
                        cancelText="取消"
                        onConfirm={() => void handleRestoreBuiltIns()}
                      >
                        <Button loading={restoringBuiltIns}>从备份恢复内置模板</Button>
                      </Popconfirm>
                    )}
                  </Space>

                  {editorMode === 'edit' && selectedTemplate && !selectedTemplate.builtIn ? (
                    <Popconfirm
                      title="删除自定义模板"
                      description="删除后不会自动修改仍引用这个模板 key 的简历。"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => void handleDeleteTemplate()}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        loading={deletingTemplateKey === selectedTemplate.key}
                      >
                        删除自定义模板
                      </Button>
                    </Popconfirm>
                  ) : null}
                </div>
              </Space>
            ) : (
              <Result status="info" title="请选择一个模板后再编辑。" />
            )}
          </Card>
        </Space>

        <div className="template-gallery-preview">
          <Card className="glass-card" bordered={false}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {loadingResume ? <Alert type="info" showIcon message="正在加载关联简历..." /> : null}
              {resumeError ? (
                <Alert
                  type="warning"
                  showIcon
                  message="关联简历加载失败，已切换为示例预览。"
                  description={resumeError.message}
                />
              ) : null}

              <div>
                <Space wrap size={[8, 8]}>
                  <Tag color="gold">{previewTemplate.category}</Tag>
                  <Tag>{layoutLabel(previewTemplate.layout)}</Tag>
                  <Tag color={previewTemplate.builtIn ? 'blue' : 'green'}>
                    {previewTemplate.builtIn ? '内置' : '自定义'}
                  </Tag>
                </Space>
                <Title level={4} style={{ margin: '10px 0 6px' }}>
                  {previewTemplate.name}
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  {previewTemplate.summary}
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
                        应用到当前简历
                      </Button>
                      <Button onClick={() => navigate(`/app/resumes/${resume.id}`)}>
                        返回当前简历
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      icon={<FileAddOutlined />}
                      onClick={() => void handleCreateResumeFromTemplate(previewTemplate.key)}
                      loading={creatingResumeTemplateKey === previewTemplate.key}
                    >
                      使用此模板创建简历
                    </Button>
                  )}
                  <Text type="secondary">
                    最近更新：{previewTemplate.updatedAt ? new Date(previewTemplate.updatedAt).toLocaleString() : '内置备份'}
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
    name: `${base.name} - 副本`,
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

function validateTemplateDraft(template: ManagedResumeTemplateDefinition, mode: EditorMode) {
  if (mode === 'create' && !template.key.trim()) {
    return '请先填写模板 key。'
  }

  const basicFields = [
    template.name,
    template.summary,
    template.category,
    template.layout,
  ]
  if (basicFields.some((field) => field.trim().length === 0)) {
    return '请补全模板的基础信息。'
  }

  if (THEME_FIELDS.some((field) => template.theme[field.key].trim().length === 0)) {
    return '主题样式不能为空。'
  }

  if (PREVIEW_FIELDS.some((field) => template.preview[field.key].trim().length === 0)) {
    return '预览样式不能为空。'
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

function layoutLabel(layout: ResumeTemplateLayout) {
  return LAYOUT_OPTIONS.find((item) => item.value === layout)?.label ?? layout
}
