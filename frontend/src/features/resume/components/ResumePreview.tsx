import { Empty } from 'antd'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  createTemplateStyleVariables,
  resolveResumeTemplate,
  type ResumeTemplateDefinition,
} from '../templateCatalog'
import {
  DEFAULT_RESUME_SECTION_ORDER,
  normalizeResumeLayout,
  normalizeResumeSectionOrder,
  type ResumeDetail,
  type ResumeSectionKey,
} from '../types'

interface ResumePreviewProps {
  resume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'>
  sectionOrder?: ResumeSectionKey[]
  hiddenSections?: ResumeSectionKey[]
  templates?: ResumeTemplateDefinition[]
  previewMode?: 'auto' | 'a4-fit'
  onClick?: () => void
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

const A4_PREVIEW_WIDTH_PX = 794
const A4_PREVIEW_HEIGHT_PX = 1123
const NARRATIVE_SECTION_KEYS: ResumeSectionKey[] = ['summary', 'workExperience', 'projectExperience', 'education']
const SUPPORTING_SECTION_KEYS: ResumeSectionKey[] = ['skills', 'honors', 'certificates']

export function ResumePreview({
  resume,
  sectionOrder,
  hiddenSections,
  templates = FALLBACK_RESUME_TEMPLATE_CATALOG,
  previewMode = 'auto',
  onClick,
}: ResumePreviewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLElement | null>(null)
  const [previewMetrics, setPreviewMetrics] = useState({
    scale: 1,
    paperHeight: A4_PREVIEW_HEIGHT_PX,
  })
  const template = resolveResumeTemplate(templates, resume.templateKey)
  const model = createPreviewModel(resume, template)
  const layout = normalizeResumeLayout(resume.layout)
  const orderedKeys = normalizeResumeSectionOrder(sectionOrder ?? layout.sectionOrder)
  const hiddenKeySet = new Set(hiddenSections ?? layout.hiddenSections)
  const sectionNodes = createSectionNodes(model, hiddenKeySet)
  const isFixedA4Preview = previewMode === 'a4-fit'
  const stageStyle = {
    '--resume-preview-scale': String(previewMetrics.scale),
  } as CSSProperties
  const paperStyle = {
    width: `${A4_PREVIEW_WIDTH_PX * previewMetrics.scale}px`,
    height: `${previewMetrics.paperHeight * previewMetrics.scale}px`,
  }

  useEffect(() => {
    const stageElement = stageRef.current
    const previewElement = previewRef.current

    if (!stageElement || !previewElement) {
      return
    }

    const updateMetrics = () => {
      const stageWidth = stageElement.clientWidth || A4_PREVIEW_WIDTH_PX
      const stageHeight = stageElement.clientHeight
      const widthScale = stageWidth / A4_PREVIEW_WIDTH_PX
      const heightScale = stageHeight > 0 ? stageHeight / A4_PREVIEW_HEIGHT_PX : Number.POSITIVE_INFINITY
      const nextScale = isFixedA4Preview
        ? Math.min(1, widthScale, heightScale)
        : Math.min(1, widthScale)
      const nextPaperHeight = isFixedA4Preview
        ? A4_PREVIEW_HEIGHT_PX
        : Math.max(A4_PREVIEW_HEIGHT_PX, previewElement.scrollHeight)

      setPreviewMetrics((current) => {
        if (Math.abs(current.scale - nextScale) < 0.001 && current.paperHeight === nextPaperHeight) {
          return current
        }

        return {
          scale: nextScale,
          paperHeight: nextPaperHeight,
        }
      })
    }

    updateMetrics()

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics()
    })

    resizeObserver.observe(stageElement)
    if (!isFixedA4Preview) {
      resizeObserver.observe(previewElement)
    }
    window.addEventListener('resize', updateMetrics)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateMetrics)
    }
  }, [hiddenSections, isFixedA4Preview, orderedKeys, resume, sectionNodes])

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className={[
        'resume-preview-stage',
        isFixedA4Preview ? 'resume-preview-stage--fit' : '',
        onClick ? 'resume-preview-stage--interactive' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      ref={stageRef}
      style={stageStyle}
      onClick={onClick}
      onKeyDown={handlePreviewKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="resume-preview-paper" style={paperStyle}>
        <article
          className={[
            'resume-preview',
            `preview--${template.layout}`,
            isFixedA4Preview ? 'resume-preview--a4-fit' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          ref={previewRef}
          style={createTemplateStyleVariables(template)}
        >
          {renderTemplate(model, sectionNodes, orderedKeys)}
        </article>
      </div>
    </div>
  )
}

function renderTemplate(
  model: PreviewModel,
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>,
  orderedKeys: ResumeSectionKey[],
) {
  switch (model.template.layout) {
    case 'two-column':
      return <ModernSplitPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />
    case 'minimal':
      return <MinimalPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />
    case 'editorial':
      return <EditorialPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />
    case 'classic':
    default:
      return <ClassicPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />
  }
}

function ClassicPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>
  orderedKeys: ResumeSectionKey[]
}) {
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
          {renderSectionStack(orderedKeys, NARRATIVE_SECTION_KEYS, sectionNodes)}
        </div>

        <aside className="resume-template__rail">
          {renderSectionStack(orderedKeys, SUPPORTING_SECTION_KEYS, sectionNodes)}
        </aside>
      </div>
    </div>
  )
}

function ModernSplitPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>
  orderedKeys: ResumeSectionKey[]
}) {
  return (
    <div className="resume-template resume-template--split">
      <aside className="resume-template__sidebar">
        <div className="resume-template__sidebar-header">
          <span className="resume-template__eyebrow">{model.template.category}</span>
          <h1>{model.name}</h1>
          <p>{model.headline}</p>
        </div>
        <ContactList items={model.contact} stacked />
        {renderSectionStack(orderedKeys, ['summary', 'skills', 'certificates'], sectionNodes)}
      </aside>

      <main className="resume-template__content-column">
        {renderSectionStack(orderedKeys, ['workExperience', 'projectExperience', 'education', 'honors'], sectionNodes)}
      </main>
    </div>
  )
}

function MinimalPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>
  orderedKeys: ResumeSectionKey[]
}) {
  return (
    <div className="resume-template resume-template--minimal">
      <header className="resume-template__masthead resume-template__masthead--minimal">
        <span className="resume-template__eyebrow">{model.template.category}</span>
        <h1>{model.name}</h1>
        <p>{model.headline}</p>
        <ContactList items={model.contact} inline />
      </header>

      <div className="resume-template__content-column resume-template__content-column--minimal">
        {renderSectionStack(orderedKeys, DEFAULT_RESUME_SECTION_ORDER, sectionNodes)}
      </div>
    </div>
  )
}

function EditorialPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>
  orderedKeys: ResumeSectionKey[]
}) {
  const showSummary = Boolean(sectionNodes.summary)

  return (
    <div className="resume-template resume-template--editorial">
      <header className="resume-template__hero">
        <div className="resume-template__identity">
          <span className="resume-template__eyebrow">{model.template.category}</span>
          <h1>{model.name}</h1>
          <p>{model.headline}</p>
        </div>
        <div className="resume-template__hero-panel">
          <h2>个人简介</h2>
          {showSummary ? (
            <p>{model.summary}</p>
          ) : (
            <p>让结构保持克制，把最强的经历和成果放到最前面。</p>
          )}
          <ContactList items={model.contact} stacked />
        </div>
      </header>

      <div className="resume-template__editorial-grid">
        <main className="resume-template__content-column">
          {renderSectionStack(orderedKeys, ['workExperience', 'projectExperience'], sectionNodes)}
        </main>

        <aside className="resume-template__notes-column">
          {renderSectionStack(orderedKeys, ['education', 'skills', 'honors', 'certificates'], sectionNodes)}
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
  resume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content' | 'layout'>,
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

function createSectionNodes(
  model: PreviewModel,
  hiddenSections: Set<ResumeSectionKey>,
): Record<ResumeSectionKey, ReactNode | null> {
  return {
    summary: hiddenSections.has('summary') ? null : (
      <PreviewSection title="个人简介" hidden={!model.summary}>
        <p className="resume-template__paragraph">{model.summary}</p>
      </PreviewSection>
    ),
    workExperience: hiddenSections.has('workExperience') ? null : (
      <TimelineSection title="工作经历" items={model.work} />
    ),
    projectExperience: hiddenSections.has('projectExperience') ? null : (
      <TimelineSection title="项目经历" items={model.projects} />
    ),
    education: hiddenSections.has('education') ? null : (
      <TimelineSection title="教育经历" items={model.education} />
    ),
    skills: hiddenSections.has('skills') ? null : (
      <SkillSection title="技能特长" items={model.skills} tone="plain" />
    ),
    honors: hiddenSections.has('honors') ? null : (
      <TimelineSection title="荣誉奖项" items={model.honors} compact />
    ),
    certificates: hiddenSections.has('certificates') ? null : (
      <TimelineSection title="资格证书" items={model.certificates} compact />
    ),
  }
}

function renderSectionStack(
  orderedKeys: ResumeSectionKey[],
  supportedKeys: ResumeSectionKey[],
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>,
) {
  return orderedKeys
    .filter((key) => supportedKeys.includes(key))
    .map((key) => sectionNodes[key])
    .filter(Boolean)
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
        <Empty description="创建或打开一份简历后，这里会实时显示预览。" />
      </div>
    </div>
  )
}
