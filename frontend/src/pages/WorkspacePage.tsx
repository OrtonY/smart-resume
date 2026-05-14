import {
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  FileAddOutlined,
  LogoutOutlined,
  RollbackOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Layout,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { startTransition, useDeferredValue, useEffect, useState, type ReactNode } from 'react'
import { EmptyPreview, ResumePreview } from '../features/resume/components/ResumePreview'
import {
  createShare,
  createResume,
  deleteResume,
  getResume,
  listResumes,
  listShares,
  requestPdfExport,
  restoreResume,
  updateResume,
} from '../features/resume/api/resumeApi'
import type {
  CertificateItem,
  EducationItem,
  HonorItem,
  ProjectExperienceItem,
  ResumeDetail,
  ResumeSummary,
  ShareLink,
  ShareMode,
  SkillItem,
  WorkExperienceItem,
} from '../features/resume/types'
import { RESUME_TEMPLATES } from '../lib/constants/templates'

const { Sider, Content } = Layout
const { Paragraph, Text } = Typography
const { TextArea } = Input

interface WorkspacePageProps {
  accessToken: string
  onLogout: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'save_failed'

export function WorkspacePage({ accessToken, onLogout }: WorkspacePageProps) {
  const { message } = App.useApp()
  const [resumeList, setResumeList] = useState<ResumeSummary[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ResumeDetail | null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [loadingResumeList, setLoadingResumeList] = useState(true)
  const [loadingResumeDetail, setLoadingResumeDetail] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createResumeTitle, setCreateResumeTitle] = useState('My Resume')
  const [createTemplateKey, setCreateTemplateKey] = useState(RESUME_TEMPLATES[0].key)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedSignature, setLastSavedSignature] = useState('')
  const deferredDraft = useDeferredValue(draft)

  useEffect(() => {
    void loadResumeList()
  }, [includeDeleted, accessToken])

  useEffect(() => {
    if (!selectedResumeId) {
      setDraft(null)
      setShareLinks([])
      return
    }
    void loadResumeDetail(selectedResumeId)
  }, [selectedResumeId])

  useEffect(() => {
    if (!draft || !selectedResumeId) {
      return
    }

    // 只比较可编辑字段，避免后端返回的额外字段导致重复保存
    const draftSignature = JSON.stringify({
      title: draft.title,
      templateKey: draft.templateKey,
      content: draft.content,
    })
    if (draftSignature === lastSavedSignature) {
      return
    }

    setSaveState('saving')
    const timeoutId = window.setTimeout(async () => {
      try {
        const saved = await updateResume(selectedResumeId, {
          title: draft.title,
          templateKey: draft.templateKey,
          content: draft.content,
        })
        const signature = JSON.stringify({
          title: saved.title,
          templateKey: saved.templateKey,
          content: saved.content,
        })
        setLastSavedSignature(signature)
        setSaveState('saved')
        setResumeList((current) =>
          current.map((item) =>
            item.id === saved.id
              ? {
                  ...item,
                  title: saved.title,
                  templateKey: saved.templateKey,
                  updatedAt: saved.updatedAt,
                }
              : item,
          ),
        )
      } catch (error) {
        setSaveState('save_failed')
        void message.error(error instanceof Error ? error.message : '自动保存失败。')
      }
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [draft, selectedResumeId, lastSavedSignature])

  async function loadResumeList() {
    setLoadingResumeList(true)
    try {
      const list = await listResumes(includeDeleted)
      setResumeList(list)
      if (list.length === 0) {
        setSelectedResumeId(null)
        return
      }

      if (!selectedResumeId || !list.some((resume) => resume.id === selectedResumeId)) {
        startTransition(() => setSelectedResumeId(list[0].id))
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载简历列表。')
    } finally {
      setLoadingResumeList(false)
    }
  }

  async function loadResumeDetail(resumeId: string) {
    setLoadingResumeDetail(true)
    try {
      const [detail, shares] = await Promise.all([getResume(resumeId), listShares(resumeId)])
      setDraft(detail)
      // 只比较可编辑字段，避免后端返回的额外字段导致重复保存
      const signature = JSON.stringify({
        title: detail.title,
        templateKey: detail.templateKey,
        content: detail.content,
      })
      setLastSavedSignature(signature)
      setShareLinks(shares)
      setSaveState('saved')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '无法加载简历详情。')
    } finally {
      setLoadingResumeDetail(false)
    }
  }

  async function handleCreateResume() {
    try {
      const detail = await createResume({
        title: createResumeTitle.trim() || '未命名简历',
        templateKey: createTemplateKey,
      })
      setCreateModalOpen(false)
      setCreateResumeTitle('My Resume')
      await loadResumeList()
      setSelectedResumeId(detail.id)
      void message.success('简历已创建。')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Unable to create resume.')
    }
  }

  async function handleDeleteResume(resumeId: string) {
    await deleteResume(resumeId)
    void message.success('简历已移至回收站。')
    await loadResumeList()
  }

  async function handleRestoreResume(resumeId: string) {
    await restoreResume(resumeId)
    void message.success('简历已恢复。')
    await loadResumeList()
  }

  async function handleCreateShare(mode: ShareMode) {
    if (!selectedResumeId) {
      return
    }

    const share = await createShare(selectedResumeId, mode)
    setShareLinks((current) => [share, ...current])
    await navigator.clipboard.writeText(`${window.location.origin}${share.sharePath}`)
    void message.success(`${mode === 'LATEST' ? '最新版' : '快照版'}分享链接已复制到剪贴板。`)
  }

  async function handleExportPdf() {
    if (!selectedResumeId) {
      return
    }
    const result = await requestPdfExport(selectedResumeId)
    void message.info(result.message)
  }

  function updateDraft(mutator: (next: ResumeDetail) => void) {
    setDraft((current) => {
      if (!current) {
        return current
      }
      const next = structuredClone(current)
      mutator(next)
      return next
    })
  }

  function addEducation() {
    updateDraft((next) => {
      next.content.education.push({
        school: '',
        degree: '',
        major: '',
        startDate: '',
        endDate: '',
        description: '',
      })
    })
  }

  function addWorkExperience() {
    updateDraft((next) => {
      next.content.workExperience.push({
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        description: '',
      })
    })
  }

  function addProjectExperience() {
    updateDraft((next) => {
      next.content.projectExperience.push({
        name: '',
        role: '',
        startDate: '',
        endDate: '',
        description: '',
      })
    })
  }

  function addSkill() {
    updateDraft((next) => {
      next.content.skills.push({ name: '', level: '' })
    })
  }

  function addHonor() {
    updateDraft((next) => {
      next.content.honors.push({
        title: '',
        issuer: '',
        awardedAt: '',
        description: '',
      })
    })
  }

  function addCertificate() {
    updateDraft((next) => {
      next.content.certificates.push({
        name: '',
        issuer: '',
        issuedAt: '',
        credentialId: '',
      })
    })
  }

  function selectedTemplateSummary() {
    return RESUME_TEMPLATES.find((item) => item.key === draft?.templateKey)?.summary ?? '选择此简历的视觉风格。'
  }

  return (
    <Layout className="workspace-layout">
      <Layout className="workspace-frame">
        <Sider className="workspace-sidebar" width={320}>
          <div className="workspace-brand">
            <Tag color="gold">单用户工作室</Tag>
            <h1>智能简历</h1>
            <p>自动保存、多模板、可分享的私人工作区编辑体验。</p>
          </div>

          <Button type="primary" icon={<FileAddOutlined />} size="large" onClick={() => setCreateModalOpen(true)}>
            创建简历
          </Button>

          <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text style={{ color: 'rgba(245, 247, 251, 0.72)' }}>显示已删除</Text>
            <Switch checked={includeDeleted} onChange={setIncludeDeleted} />
          </Space>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {loadingResumeList ? (
              <div className="full-page-center" style={{ minHeight: 200 }}>
                <Spin />
              </div>
            ) : resumeList.length === 0 ? (
              <div className="empty-state">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无简历" />
              </div>
            ) : (
              <List
                dataSource={resumeList}
                renderItem={(item) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      borderRadius: 18,
                      padding: 14,
                      marginBottom: 10,
                      background: item.id === selectedResumeId ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onClick={() => startTransition(() => setSelectedResumeId(item.id))}
                    actions={[
                      item.deleted ? (
                        <Button
                          key="restore"
                          icon={<RollbackOutlined />}
                          type="text"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleRestoreResume(item.id)
                          }}
                        />
                      ) : (
                        <Button
                          key="delete"
                          icon={<DeleteOutlined />}
                          type="text"
                          danger
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDeleteResume(item.id)
                          }}
                        />
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span style={{ color: '#ffffff' }}>{item.title}</span>
                          {item.deleted ? <Tag color="red">已删除</Tag> : null}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Tag color="default">{item.templateKey}</Tag>
                          <span style={{ color: 'rgba(245,247,251,0.64)' }}>更新于 {new Date(item.updatedAt).toLocaleString()}</span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>

          <Button icon={<LogoutOutlined />} onClick={onLogout}>
            锁定工作区
          </Button>
        </Sider>

        <Content className="workspace-main" style={{ padding: 18 }}>
          <div className="workspace-toolbar">
            <Space direction="vertical" size={2}>
              <Tag color="blue">自动保存已启用</Tag>
              <Paragraph style={{ margin: 0 }} type="secondary">
                {selectedTemplateSummary()}
              </Paragraph>
            </Space>

            <Space wrap>
              <Tag className="save-state" color={saveStateColor(saveState)}>
                {saveStateLabel(saveState)}
              </Tag>
              <Button icon={<ShareAltOutlined />} disabled={!selectedResumeId} onClick={() => void handleCreateShare('LATEST')}>
                分享最新版
              </Button>
              <Button icon={<ShareAltOutlined />} disabled={!selectedResumeId} onClick={() => void handleCreateShare('SNAPSHOT')}>
                分享快照
              </Button>
              <Button icon={<ExportOutlined />} disabled={!selectedResumeId} onClick={() => void handleExportPdf()}>
                导出 PDF
              </Button>
            </Space>
          </div>

          {loadingResumeDetail ? (
            <div className="full-page-center" style={{ minHeight: 360 }}>
              <Spin size="large" tip="正在加载简历工作区..." />
            </div>
          ) : draft ? (
            <div className="workspace-columns">
              <Card className="glass-card" bordered={false}>
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  <Input
                    size="large"
                    value={draft.title}
                    onChange={(event) => updateDraft((next) => { next.title = event.target.value })}
                    placeholder="简历标题"
                  />

                  <Select
                    size="large"
                    value={draft.templateKey}
                    onChange={(value) => updateDraft((next) => { next.templateKey = value })}
                    options={RESUME_TEMPLATES.map((template) => ({
                      value: template.key,
                      label: `${template.name} · ${template.summary}`,
                    }))}
                  />

                  <Collapse
                    size="large"
                    items={[
                      {
                        key: 'personal-info',
                        label: '个人信息',
                        children: (
                          <SectionGrid>
                            <Input
                              value={draft.content.personalInfo.fullName}
                              onChange={(event) => updateDraft((next) => { next.content.personalInfo.fullName = event.target.value })}
                              placeholder="姓名"
                            />
                            <Input
                              value={draft.content.personalInfo.headline}
                              onChange={(event) => updateDraft((next) => { next.content.personalInfo.headline = event.target.value })}
                              placeholder="职位/头衔"
                            />
                            <Input
                              value={draft.content.personalInfo.phone}
                              onChange={(event) => updateDraft((next) => { next.content.personalInfo.phone = event.target.value })}
                              placeholder="电话"
                            />
                            <Input
                              value={draft.content.personalInfo.email}
                              onChange={(event) => updateDraft((next) => { next.content.personalInfo.email = event.target.value })}
                              placeholder="邮箱"
                            />
                            <Input
                              value={draft.content.personalInfo.city}
                              onChange={(event) => updateDraft((next) => { next.content.personalInfo.city = event.target.value })}
                              placeholder="城市"
                            />
                            <Input
                              value={draft.content.personalInfo.website}
                              onChange={(event) => updateDraft((next) => { next.content.personalInfo.website = event.target.value })}
                              placeholder="个人网站或作品集"
                            />
                          </SectionGrid>
                        ),
                      },
                      {
                        key: 'summary',
                        label: '个人简介',
                        children: (
                          <TextArea
                            rows={5}
                            value={draft.content.personalSummary}
                            onChange={(event) => updateDraft((next) => { next.content.personalSummary = event.target.value })}
                            placeholder="写下您希望招聘者首先注意到的故事。"
                          />
                        ),
                      },
                      {
                        key: 'education',
                        label: '教育经历',
                        children: renderEducationSection(draft.content.education, addEducation, updateDraft),
                      },
                      {
                        key: 'work',
                        label: '工作经历',
                        children: renderWorkSection(draft.content.workExperience, addWorkExperience, updateDraft),
                      },
                      {
                        key: 'project',
                        label: '项目经历',
                        children: renderProjectSection(draft.content.projectExperience, addProjectExperience, updateDraft),
                      },
                      {
                        key: 'skills',
                        label: '技能',
                        children: renderSkillSection(draft.content.skills, addSkill, updateDraft),
                      },
                      {
                        key: 'honors',
                        label: '荣誉奖项',
                        children: renderHonorSection(draft.content.honors, addHonor, updateDraft),
                      },
                      {
                        key: 'certificates',
                        label: '证书',
                        children: renderCertificateSection(draft.content.certificates, addCertificate, updateDraft),
                      },
                    ]}
                  />
                </Space>
              </Card>

              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                {deferredDraft ? <ResumePreview resume={deferredDraft} /> : <EmptyPreview />}

                <Card className="glass-card" bordered={false} title="公开分享链接">
                  {shareLinks.length === 0 ? (
                    <div className="empty-state">
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="创建最新版或快照链接来发布此简历。" />
                    </div>
                  ) : (
                    <div className="share-list">
                      {shareLinks.map((share) => (
                        <div className="share-row" key={share.shareCode}>
                          <Space direction="vertical" size={2}>
                            <Space wrap>
                              <Tag color={share.shareMode === 'LATEST' ? 'blue' : 'orange'}>{share.shareMode}</Tag>
                              <Text code>{share.shareCode}</Text>
                            </Space>
                            <Text type="secondary">{new Date(share.createdAt).toLocaleString()}</Text>
                          </Space>

                          <Button
                            icon={<CopyOutlined />}
                            onClick={async () => {
                              await navigator.clipboard.writeText(`${window.location.origin}${share.sharePath}`)
                              void message.success('分享链接已复制。')
                            }}
                          >
                            复制链接
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </Space>
            </div>
          ) : (
            <EmptyPreview />
          )}
        </Content>
      </Layout>

      <Modal
        title="创建新简历"
        open={createModalOpen}
        onOk={() => void handleCreateResume()}
        onCancel={() => setCreateModalOpen(false)}
        okText="创建"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Input value={createResumeTitle} onChange={(event) => setCreateResumeTitle(event.target.value)} placeholder="简历标题" />
          <Select
            value={createTemplateKey}
            onChange={setCreateTemplateKey}
            options={RESUME_TEMPLATES.map((template) => ({
              value: template.key,
              label: `${template.name} · ${template.summary}`,
            }))}
          />
        </Space>
      </Modal>
    </Layout>
  )
}

function saveStateColor(saveState: SaveState) {
  switch (saveState) {
    case 'saving':
      return 'processing'
    case 'saved':
      return 'success'
    case 'save_failed':
      return 'error'
    default:
      return 'default'
  }
}

function saveStateLabel(saveState: SaveState) {
  switch (saveState) {
    case 'saving':
      return '保存中...'
    case 'saved':
      return '已保存'
    case 'save_failed':
      return '保存失败'
    default:
      return '待机'
  }
}

function SectionGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}
    >
      {children}
    </div>
  )
}

function renderEducationSection(
  items: EducationItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<EducationItem>(
    items,
    addItem,
    (index) => `教育经历 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <Input value={item.school} placeholder="学校" onChange={(event) => updateDraft((next) => { next.content.education[index].school = event.target.value })} />
        <Input value={item.degree} placeholder="学位" onChange={(event) => updateDraft((next) => { next.content.education[index].degree = event.target.value })} />
        <Input value={item.major} placeholder="专业" onChange={(event) => updateDraft((next) => { next.content.education[index].major = event.target.value })} />
        <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.education[index].startDate = event.target.value })} />
        <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.education[index].endDate = event.target.value })} />
        <TextArea rows={3} value={item.description} placeholder="亮点描述" onChange={(event) => updateDraft((next) => { next.content.education[index].description = event.target.value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.education.splice(index, 1) }),
  )
}

function renderWorkSection(
  items: WorkExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<WorkExperienceItem>(
    items,
    addItem,
    (index) => `工作经历 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <Input value={item.company} placeholder="公司" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].company = event.target.value })} />
        <Input value={item.role} placeholder="职位" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].role = event.target.value })} />
        <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].startDate = event.target.value })} />
        <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].endDate = event.target.value })} />
        <TextArea rows={4} value={item.description} placeholder="工作内容、范围和成就" onChange={(event) => updateDraft((next) => { next.content.workExperience[index].description = event.target.value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.workExperience.splice(index, 1) }),
  )
}

function renderProjectSection(
  items: ProjectExperienceItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<ProjectExperienceItem>(
    items,
    addItem,
    (index) => `项目 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <Input value={item.name} placeholder="项目名称" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].name = event.target.value })} />
        <Input value={item.role} placeholder="角色" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].role = event.target.value })} />
        <Input value={item.startDate} placeholder="开始日期" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].startDate = event.target.value })} />
        <Input value={item.endDate} placeholder="结束日期" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].endDate = event.target.value })} />
        <TextArea rows={4} value={item.description} placeholder="项目描述、技术栈和成果" onChange={(event) => updateDraft((next) => { next.content.projectExperience[index].description = event.target.value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.projectExperience.splice(index, 1) }),
  )
}

function renderSkillSection(
  items: SkillItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<SkillItem>(
    items,
    addItem,
    (index) => `技能 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <Input value={item.name} placeholder="技能名称" onChange={(event) => updateDraft((next) => { next.content.skills[index].name = event.target.value })} />
        <Input value={item.level} placeholder="熟练程度" onChange={(event) => updateDraft((next) => { next.content.skills[index].level = event.target.value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.skills.splice(index, 1) }),
  )
}

function renderHonorSection(
  items: HonorItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<HonorItem>(
    items,
    addItem,
    (index) => `荣誉 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <Input value={item.title} placeholder="荣誉名称" onChange={(event) => updateDraft((next) => { next.content.honors[index].title = event.target.value })} />
        <Input value={item.issuer} placeholder="颁发机构" onChange={(event) => updateDraft((next) => { next.content.honors[index].issuer = event.target.value })} />
        <Input value={item.awardedAt} placeholder="获奖时间" onChange={(event) => updateDraft((next) => { next.content.honors[index].awardedAt = event.target.value })} />
        <TextArea rows={3} value={item.description} placeholder="荣誉说明" onChange={(event) => updateDraft((next) => { next.content.honors[index].description = event.target.value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.honors.splice(index, 1) }),
  )
}

function renderCertificateSection(
  items: CertificateItem[],
  addItem: () => void,
  updateDraft: (mutator: (next: ResumeDetail) => void) => void,
) {
  return renderRepeatableCards<CertificateItem>(
    items,
    addItem,
    (index) => `证书 ${index + 1}`,
    (item, index) => (
      <SectionGrid>
        <Input value={item.name} placeholder="证书名称" onChange={(event) => updateDraft((next) => { next.content.certificates[index].name = event.target.value })} />
        <Input value={item.issuer} placeholder="颁发机构" onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuer = event.target.value })} />
        <Input value={item.issuedAt} placeholder="颁发日期" onChange={(event) => updateDraft((next) => { next.content.certificates[index].issuedAt = event.target.value })} />
        <Input value={item.credentialId} placeholder="证书编号" onChange={(event) => updateDraft((next) => { next.content.certificates[index].credentialId = event.target.value })} />
      </SectionGrid>
    ),
    (index) => updateDraft((next) => { next.content.certificates.splice(index, 1) }),
  )
}

function renderRepeatableCards<T>(
  items: T[],
  addItem: () => void,
  titleForIndex: (index: number) => string,
  renderFields: (item: T, index: number) => ReactNode,
  removeItem: (index: number) => void,
) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {items.length === 0 ? (
        <div className="empty-state">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无条目" />
        </div>
      ) : null}

      {items.map((item, index) => (
        <Card
          key={index}
          size="small"
          title={titleForIndex(index)}
          extra={
            <Button danger type="text" onClick={() => removeItem(index)}>
              删除
            </Button>
          }
        >
          {renderFields(item, index)}
        </Card>
      ))}

      <Button onClick={addItem}>添加条目</Button>
    </Space>
  )
}
