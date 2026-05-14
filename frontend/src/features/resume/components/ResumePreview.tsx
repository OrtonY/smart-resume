import { Empty } from 'antd'
import type { ReactNode } from 'react'
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  createTemplateStyleVariables,
  resolveResumeTemplate,
  type ResumeTemplateDefinition,
} from '../templateCatalog'
import type { ResumeDetail } from '../types'

interface ResumePreviewProps {
  resume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content'>
  templates?: ResumeTemplateDefinition[]
}

interface TimelineEntry {
  title: string
  subtitle?: string
  meta?: string
  body?: string
}

interface PreviewModel {
  template: ResumeTemplateDefinition
  name: string
  headline: string
  summary: string
  contact: Array<{ label: string; value: string }>
  education: TimelineEntry[]
  work: TimelineEntry[]
  projects: TimelineEntry[]
  honors: TimelineEntry[]
  certificates: TimelineEntry[]
  skills: string[]
}

export function ResumePreview({
  resume,
  templates = FALLBACK_RESUME_TEMPLATE_CATALOG,
}: ResumePreviewProps) {
  const template = resolveResumeTemplate(templates, resume.templateKey)
  const model = createPreviewModel(resume, template)

  return (
    <article
      className={`resume-preview preview--${template.layout}`}
      style={createTemplateStyleVariables(template)}
    >
      {renderTemplate(model)}
    </article>
  )
}

function renderTemplate(model: PreviewModel) {
  switch (model.template.layout) {
    case 'two-column':
      return <ModernSplitPreview model={model} />
    case 'minimal':
      return <MinimalPreview model={model} />
    case 'editorial':
      return <EditorialPreview model={model} />
    case 'classic':
    default:
      return <ClassicPreview model={model} />
  }
}

function ClassicPreview({ model }: { model: PreviewModel }) {
  return (
    <div className="resume-template resume-template--classic">
      <header className="resume-template__masthead resume-template__masthead--classic">
        <div className="resume-template__identity">
          <span className="resume-template__eyebrow">{model.template.category}</span>
          <h1>{model.name}</h1>
          <p>{model.headline}</p>
        </div>
        <ContactList items={model.contact} stacked />
      </header>

      <div className="resume-template__body resume-template__body--classic">
        <div className="resume-template__main">
          <PreviewSection title="个人简介" hidden={!model.summary}>
            <p className="resume-template__paragraph">{model.summary}</p>
          </PreviewSection>
          <TimelineSection title="工作经历" items={model.work} />
          <TimelineSection title="项目经历" items={model.projects} />
          <TimelineSection title="教育经历" items={model.education} />
        </div>

        <aside className="resume-template__rail">
          <SkillSection title="技能" items={model.skills} tone="soft" />
          <TimelineSection title="荣誉奖项" items={model.honors} compact />
          <TimelineSection title="证书" items={model.certificates} compact />
        </aside>
      </div>
    </div>
  )
}

function ModernSplitPreview({ model }: { model: PreviewModel }) {
  return (
    <div className="resume-template resume-template--split">
      <aside className="resume-template__sidebar">
        <div className="resume-template__sidebar-header">
          <span className="resume-template__eyebrow">{model.template.category}</span>
          <h1>{model.name}</h1>
          <p>{model.headline}</p>
        </div>
        <ContactList items={model.contact} stacked />
        <PreviewSection title="个人简介" hidden={!model.summary}>
          <p className="resume-template__paragraph">{model.summary}</p>
        </PreviewSection>
        <SkillSection title="技能" items={model.skills} tone="bold" />
        <TimelineSection title="证书" items={model.certificates} compact />
      </aside>

      <main className="resume-template__content-column">
        <TimelineSection title="工作经历" items={model.work} />
        <TimelineSection title="项目经历" items={model.projects} />
        <TimelineSection title="教育经历" items={model.education} />
        <TimelineSection title="荣誉奖项" items={model.honors} compact />
      </main>
    </div>
  )
}

function MinimalPreview({ model }: { model: PreviewModel }) {
  return (
    <div className="resume-template resume-template--minimal">
      <header className="resume-template__masthead resume-template__masthead--minimal">
        <span className="resume-template__eyebrow">{model.template.category}</span>
        <h1>{model.name}</h1>
        <p>{model.headline}</p>
        <ContactList items={model.contact} inline />
      </header>

      <div className="resume-template__content-column resume-template__content-column--minimal">
        <PreviewSection title="个人简介" hidden={!model.summary} minimal>
          <p className="resume-template__paragraph">{model.summary}</p>
        </PreviewSection>
        <TimelineSection title="工作经历" items={model.work} minimal />
        <TimelineSection title="项目经历" items={model.projects} minimal />
        <TimelineSection title="教育经历" items={model.education} minimal />
        <SkillSection title="技能" items={model.skills} tone="plain" />
        <TimelineSection title="荣誉奖项" items={model.honors} compact minimal />
        <TimelineSection title="证书" items={model.certificates} compact minimal />
      </div>
    </div>
  )
}

function EditorialPreview({ model }: { model: PreviewModel }) {
  return (
    <div className="resume-template resume-template--editorial">
      <header className="resume-template__hero">
        <div className="resume-template__identity">
          <span className="resume-template__eyebrow">{model.template.category}</span>
          <h1>{model.name}</h1>
          <p>{model.headline}</p>
        </div>
        <div className="resume-template__hero-panel">
          <h2>Profile</h2>
          <p>{model.summary || '用同一份结构化简历内容，切换出更鲜明的职业表达。'}</p>
          <ContactList items={model.contact} stacked />
        </div>
      </header>

      <div className="resume-template__editorial-grid">
        <main className="resume-template__content-column">
          <TimelineSection title="工作经历" items={model.work} />
          <TimelineSection title="项目经历" items={model.projects} />
        </main>

        <aside className="resume-template__notes-column">
          <TimelineSection title="教育经历" items={model.education} compact />
          <SkillSection title="技能" items={model.skills} tone="editorial" />
          <TimelineSection title="荣誉奖项" items={model.honors} compact />
          <TimelineSection title="证书" items={model.certificates} compact />
        </aside>
      </div>
    </div>
  )
}

function ContactList({
  items,
  stacked = false,
  inline = false,
}: {
  items: Array<{ label: string; value: string }>
  stacked?: boolean
  inline?: boolean
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <ul
      className={[
        'resume-template__contact-list',
        stacked ? 'is-stacked' : '',
        inline ? 'is-inline' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </li>
      ))}
    </ul>
  )
}

function TimelineSection({
  title,
  items,
  compact = false,
  minimal = false,
}: {
  title: string
  items: TimelineEntry[]
  compact?: boolean
  minimal?: boolean
}) {
  return (
    <PreviewSection title={title} hidden={items.length === 0} compact={compact} minimal={minimal}>
      <div className={`resume-template__timeline${compact ? ' is-compact' : ''}`}>
        {items.map((item, index) => (
          <article className="resume-template__entry" key={`${title}-${index}-${item.title}`}>
            <div className="resume-template__entry-head">
              <h3>{item.title}</h3>
              {item.subtitle ? <p>{item.subtitle}</p> : null}
            </div>
            {item.meta ? <div className="resume-template__entry-meta">{item.meta}</div> : null}
            {item.body ? <p className="resume-template__paragraph">{item.body}</p> : null}
          </article>
        ))}
      </div>
    </PreviewSection>
  )
}

function SkillSection({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'soft' | 'bold' | 'plain' | 'editorial'
}) {
  return (
    <PreviewSection title={title} hidden={items.length === 0}>
      <div className={`resume-template__skill-cloud resume-template__skill-cloud--${tone}`}>
        {items.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </PreviewSection>
  )
}

function PreviewSection({
  title,
  hidden,
  compact = false,
  minimal = false,
  children,
}: {
  title: string
  hidden: boolean
  compact?: boolean
  minimal?: boolean
  children: ReactNode
}) {
  if (hidden) {
    return null
  }

  return (
    <section
      className={[
        'resume-template__section',
        compact ? 'is-compact' : '',
        minimal ? 'is-minimal' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="resume-template__section-title">{title}</div>
      {children}
    </section>
  )
}

function createPreviewModel(
  resume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content'>,
  template: ResumeTemplateDefinition,
): PreviewModel {
  const { content } = resume

  return {
    template,
    name: content.personalInfo.fullName || resume.title,
    headline: content.personalInfo.headline || '用结构化表达讲清你的职业价值。',
    summary: content.personalSummary.trim(),
    contact: [
      { label: '电话', value: content.personalInfo.phone },
      { label: '邮箱', value: content.personalInfo.email },
      { label: '城市', value: content.personalInfo.city },
      { label: '链接', value: content.personalInfo.website },
    ].filter((item) => item.value.trim().length > 0),
    education: content.education.map((item) => ({
      title: item.school || '学校',
      subtitle: joinParts([item.degree, item.major]),
      meta: formatPeriod(item.startDate, item.endDate),
      body: item.description,
    })),
    work: content.workExperience.map((item) => ({
      title: item.company || '公司',
      subtitle: item.role || '职位',
      meta: formatPeriod(item.startDate, item.endDate),
      body: item.description,
    })),
    projects: content.projectExperience.map((item) => ({
      title: item.name || '项目',
      subtitle: item.role || '角色',
      meta: formatPeriod(item.startDate, item.endDate),
      body: item.description,
    })),
    honors: content.honors.map((item) => ({
      title: item.title || '荣誉奖项',
      subtitle: item.issuer,
      meta: item.awardedAt,
      body: item.description,
    })),
    certificates: content.certificates.map((item) => ({
      title: item.name || '证书',
      subtitle: item.issuer,
      meta: joinParts([item.issuedAt, item.credentialId]),
    })),
    skills: content.skills.map((item) => joinParts([item.name || '技能', item.level])),
  }
}

function joinParts(parts: Array<string | undefined>) {
  return parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' · ')
}

function formatPeriod(startDate?: string, endDate?: string) {
  const start = (startDate ?? '').trim()
  const end = (endDate ?? '').trim()

  if (!start && !end) {
    return ''
  }

  return `${start || '开始时间'} - ${end || '至今'}`
}

export function EmptyPreview() {
  return (
    <div className="glass-card">
      <div className="empty-state">
        <Empty description="创建或选择简历以开始构建预览。" />
      </div>
    </div>
  )
}
