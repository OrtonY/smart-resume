import { Badge, Empty, Space, Tag } from 'antd'
import type { ReactNode } from 'react'
import type { ResumeDetail } from '../types'

interface ResumePreviewProps {
  resume: Pick<ResumeDetail, 'title' | 'templateKey' | 'content'>
}

export function ResumePreview({ resume }: ResumePreviewProps) {
  const { content } = resume

  return (
    <article className={`resume-preview preview--${resume.templateKey}`}>
      <header className="resume-preview__hero">
        <Space direction="vertical" size={4}>
          <Tag color="default">{resume.templateKey}</Tag>
          <h2>{content.personalInfo.fullName || resume.title}</h2>
          <p>
            {content.personalInfo.headline || '用多个模板就绪的区段来塑造您的职业故事。'}
          </p>
          <Space wrap>
            {content.personalInfo.phone ? <Badge color="#ffffff" text={content.personalInfo.phone} /> : null}
            {content.personalInfo.email ? <Badge color="#ffffff" text={content.personalInfo.email} /> : null}
            {content.personalInfo.city ? <Badge color="#ffffff" text={content.personalInfo.city} /> : null}
          </Space>
        </Space>
      </header>

      <PreviewSection title="个人简介" hidden={!content.personalSummary}>
        <p className="resume-preview__body">{content.personalSummary}</p>
      </PreviewSection>

      <PreviewSection title="教育经历" hidden={content.education.length === 0}>
        <div className="resume-preview__timeline">
          {content.education.map((item, index) => (
            <div key={`${item.school}-${index}`}>
              <p className="resume-preview__item-title">{item.school || '学校'}</p>
              <p className="resume-preview__meta">
                {[item.degree, item.major].filter(Boolean).join(' · ')}
                {item.startDate || item.endDate ? ` · ${item.startDate} - ${item.endDate}` : ''}
              </p>
              {item.description ? <p className="resume-preview__body">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="工作经历" hidden={content.workExperience.length === 0}>
        <div className="resume-preview__timeline">
          {content.workExperience.map((item, index) => (
            <div key={`${item.company}-${index}`}>
              <p className="resume-preview__item-title">{item.company || '公司'}</p>
              <p className="resume-preview__meta">
                {[item.role].filter(Boolean).join(' · ')}
                {item.startDate || item.endDate ? ` · ${item.startDate} - ${item.endDate}` : ''}
              </p>
              {item.description ? <p className="resume-preview__body">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="项目经历" hidden={content.projectExperience.length === 0}>
        <div className="resume-preview__timeline">
          {content.projectExperience.map((item, index) => (
            <div key={`${item.name}-${index}`}>
              <p className="resume-preview__item-title">{item.name || '项目'}</p>
              <p className="resume-preview__meta">
                {[item.role].filter(Boolean).join(' · ')}
                {item.startDate || item.endDate ? ` · ${item.startDate} - ${item.endDate}` : ''}
              </p>
              {item.description ? <p className="resume-preview__body">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="技能" hidden={content.skills.length === 0}>
        <Space wrap>
          {content.skills.map((skill, index) => (
            <Tag key={`${skill.name}-${index}`} color="blue">
              {skill.name || '技能'}
              {skill.level ? ` · ${skill.level}` : ''}
            </Tag>
          ))}
        </Space>
      </PreviewSection>

      <PreviewSection title="荣誉奖项" hidden={content.honors.length === 0}>
        <div className="resume-preview__timeline">
          {content.honors.map((item, index) => (
            <div key={`${item.title}-${index}`}>
              <p className="resume-preview__item-title">{item.title || '荣誉'}</p>
              <p className="resume-preview__meta">
                {[item.issuer, item.awardedAt].filter(Boolean).join(' · ')}
              </p>
              {item.description ? <p className="resume-preview__body">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="证书" hidden={content.certificates.length === 0}>
        <div className="resume-preview__timeline">
          {content.certificates.map((item, index) => (
            <div key={`${item.name}-${index}`}>
              <p className="resume-preview__item-title">{item.name || '证书'}</p>
              <p className="resume-preview__meta">
                {[item.issuer, item.issuedAt, item.credentialId].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </PreviewSection>
    </article>
  )
}

interface PreviewSectionProps {
  title: string
  hidden: boolean
  children: ReactNode
}

function PreviewSection({ title, hidden, children }: PreviewSectionProps) {
  if (hidden) {
    return null
  }

  return (
    <section className="resume-preview__section">
      <h3>{title}</h3>
      {children}
    </section>
  )
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
