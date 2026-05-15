import { createExportFilename, downloadBlob } from './fileDownload'
import {
  normalizeResumeLayout,
  normalizeResumeSectionOrder,
  type CertificateItem,
  type EducationItem,
  type HonorItem,
  type ProjectExperienceItem,
  type ResumeDetail,
  type ResumeSectionKey,
  type SkillItem,
  type WorkExperienceItem,
} from '../types'
import type { ResumeTemplateDefinition, ResumeTemplateLayout } from '../templateCatalog'

type ExportResume = Pick<ResumeDetail, 'title' | 'content' | 'layout' | 'templateKey'>
type DocxModule = typeof import('docx')
type DocxParagraph = InstanceType<DocxModule['Paragraph']>
type DocxTable = InstanceType<DocxModule['Table']>
type DocxTextRun = InstanceType<DocxModule['TextRun']>

interface TemplateDocxStyle {
  pageMargins: { top: number; right: number; bottom: number; left: number }
  titleAlignment: keyof typeof import('docx')['AlignmentType']
  titleColor: string
  headlineColor: string
  bodyColor: string
  mutedColor: string
  borderColor: string
  sectionFill: string
  sidebarFill: string
  heroFill: string
  useTwoColumn: boolean
  useCompactHeader: boolean
}

const SECTION_TITLES: Record<ResumeSectionKey, string> = {
  summary: '个人简介',
  workExperience: '工作经历',
  projectExperience: '项目经历',
  education: '教育经历',
  skills: '技能特长',
  honors: '荣誉奖项',
  certificates: '资格证书',
}

export async function exportResumeDocx(
  resume: ExportResume,
  template?: ResumeTemplateDefinition,
) {
  const docx = await import('docx')
  const style = buildTemplateStyle(template?.layout ?? 'classic', template)
  const titleAlignment = docx.AlignmentType[style.titleAlignment]
  const document = new docx.Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Microsoft YaHei',
            size: 21,
            color: style.bodyColor,
          },
          paragraph: {
            spacing: { after: 90 },
          },
        },
      },
      paragraphStyles: [
        {
          id: 'ResumeTitle',
          name: 'Resume Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            bold: true,
            size: 34,
            color: style.titleColor,
          },
          paragraph: {
            alignment: titleAlignment,
            spacing: { after: 100 },
          },
        },
        {
          id: 'ResumeHeadline',
          name: 'Resume Headline',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 20,
            color: style.headlineColor,
          },
          paragraph: {
            alignment: titleAlignment,
            spacing: { after: 130 },
          },
        },
        {
          id: 'ResumeSection',
          name: 'Resume Section',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            bold: true,
            size: 24,
            color: style.titleColor,
          },
          paragraph: {
            spacing: { before: 140, after: 70 },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: style.pageMargins,
          },
        },
        children: createDocumentChildren(resume, style, docx),
      },
    ],
  })

  const blob = await docx.Packer.toBlob(document)
  downloadBlob(blob, createExportFilename(resume.title, 'docx'))
}

function buildTemplateStyle(
  layout: ResumeTemplateLayout,
  template?: ResumeTemplateDefinition,
): TemplateDocxStyle {
  const accent = cssColorToHex(template?.theme.accent, '3157A4')
  const muted = cssColorToHex(template?.theme.mutedText, '4B5563')
  const border = cssColorToHex(template?.theme.borderColor, 'D1D5DB')
  const titleColor = accent
  const headlineColor = muted
  const bodyColor = '1F2937'

  switch (layout) {
    case 'two-column':
      return {
        pageMargins: { top: 720, right: 720, bottom: 720, left: 720 },
        titleAlignment: 'CENTER',
        titleColor,
        headlineColor: muted,
        bodyColor,
        mutedColor: muted,
        borderColor: border,
        sectionFill: 'F3F7FF',
        sidebarFill: 'F8FAFC',
        heroFill: 'EAF0FF',
        useTwoColumn: true,
        useCompactHeader: false,
      }
    case 'editorial':
      return {
        pageMargins: { top: 720, right: 720, bottom: 720, left: 720 },
        titleAlignment: 'CENTER',
        titleColor,
        headlineColor,
        bodyColor,
        mutedColor: muted,
        borderColor: border,
        sectionFill: 'F8F3FF',
        sidebarFill: 'F4EDF9',
        heroFill: 'F4EDF9',
        useTwoColumn: true,
        useCompactHeader: false,
      }
    case 'minimal':
      return {
        pageMargins: { top: 650, right: 720, bottom: 650, left: 720 },
        titleAlignment: 'CENTER',
        titleColor,
        headlineColor,
        bodyColor,
        mutedColor: muted,
        borderColor: border,
        sectionFill: 'F9FAFB',
        sidebarFill: 'F9FAFB',
        heroFill: 'F3F4F6',
        useTwoColumn: false,
        useCompactHeader: true,
      }
    case 'classic':
    default:
      return {
        pageMargins: { top: 680, right: 740, bottom: 680, left: 740 },
        titleAlignment: 'CENTER',
        titleColor,
        headlineColor,
        bodyColor,
        mutedColor: muted,
        borderColor: border,
        sectionFill: 'F7FAFF',
        sidebarFill: 'F7FAFF',
        heroFill: 'EAF1FF',
        useTwoColumn: false,
        useCompactHeader: false,
      }
  }
}

function createDocumentChildren(resume: ExportResume, style: TemplateDocxStyle, docx: DocxModule) {
  const { personalInfo } = resume.content
  const layout = normalizeResumeLayout(resume.layout)
  const hiddenSections = new Set(layout.hiddenSections)
  const orderedSections = normalizeResumeSectionOrder(layout.sectionOrder)
  const name = personalInfo.fullName.trim() || resume.title.trim() || '个人简历'
  const headline = [
    personalInfo.headline,
    personalInfo.city,
    personalInfo.expectedSalary ? `期望薪资：${personalInfo.expectedSalary}` : '',
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' · ')
  const contact = [
    personalInfo.phone,
    personalInfo.email,
    personalInfo.website,
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' · ')
  const visibleSections = orderedSections.filter((sectionKey) => !hiddenSections.has(sectionKey))
  const leftSections = visibleSections.filter((sectionKey) => ['skills', 'honors', 'certificates'].includes(sectionKey))
  const rightSections = visibleSections.filter((sectionKey) => !leftSections.includes(sectionKey))

  if (style.useTwoColumn) {
    return [
      ...createHeaderBlock(name, headline, contact, style, docx),
      createTwoColumnLayout(rightSections, leftSections, resume, style, docx),
    ]
  }

  return [
    ...createHeaderBlock(name, headline, contact, style, docx),
    ...visibleSections.flatMap((sectionKey) => createSection(sectionKey, resume, style, docx)),
  ]
}

function createHeaderBlock(
  name: string,
  headline: string,
  contact: string,
  style: TemplateDocxStyle,
  docx: DocxModule,
) {
  const headerChildren: DocxParagraph[] = [
    new docx.Paragraph({ style: 'ResumeTitle', text: name }),
  ]

  if (headline) {
    headerChildren.push(new docx.Paragraph({ style: 'ResumeHeadline', text: headline }))
  }

  if (contact) {
    headerChildren.push(
      new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [new docx.TextRun({ text: contact, color: style.mutedColor })],
      }),
    )
  }

  const children: Array<DocxParagraph | DocxTable> = [
    new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      borders: borderlessTableBorders(style, docx),
      rows: [
        new docx.TableRow({
          children: [
            new docx.TableCell({
              shading: {
                type: docx.ShadingType.CLEAR,
                fill: style.heroFill,
                color: 'auto',
              },
              margins: { top: 220, bottom: 200, left: 220, right: 220 },
              children: headerChildren,
            }),
          ],
        }),
      ],
    }),
  ]

  if (!style.useCompactHeader) {
    children.push(
      new docx.Paragraph({
        spacing: { after: 80 },
        children: [new docx.TextRun({ text: ' ', break: 1 })],
      }),
    )
  }

  return children
}

function createTwoColumnLayout(
  rightSections: ResumeSectionKey[],
  leftSections: ResumeSectionKey[],
  resume: ExportResume,
  style: TemplateDocxStyle,
  docx: DocxModule,
) {
  const body = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: borderlessTableBorders(style, docx),
    rows: [
      new docx.TableRow({
        children: [
          createColumnCell(leftSections, resume, style, docx, true),
          createColumnCell(rightSections, resume, style, docx, false),
        ],
      }),
    ],
  })

  return body
}

function borderlessTableBorders(style: TemplateDocxStyle, docx: DocxModule) {
  const emptyBorder = { style: docx.BorderStyle.NONE, size: 0, color: style.borderColor }

  return {
    top: emptyBorder,
    bottom: emptyBorder,
    left: emptyBorder,
    right: emptyBorder,
    insideHorizontal: emptyBorder,
    insideVertical: emptyBorder,
  }
}

function createColumnCell(
  sections: ResumeSectionKey[],
  resume: ExportResume,
  style: TemplateDocxStyle,
  docx: DocxModule,
  isSidebar: boolean,
) {
  const sectionChildren = sections.flatMap((sectionKey) => createSection(sectionKey, resume, style, docx))

  return new docx.TableCell({
    width: { size: isSidebar ? 34 : 66, type: docx.WidthType.PERCENTAGE },
    shading: {
      type: docx.ShadingType.CLEAR,
      fill: isSidebar ? style.sidebarFill : 'FFFFFF',
      color: 'auto',
    },
    margins: { top: 220, bottom: 220, left: 220, right: 220 },
    children: sectionChildren.length > 0
      ? sectionChildren
      : [
          new docx.Paragraph({
            text: ' ',
          }),
        ],
  })
}

function createSection(
  sectionKey: ResumeSectionKey,
  resume: ExportResume,
  style: TemplateDocxStyle,
  docx: DocxModule,
) {
  switch (sectionKey) {
    case 'summary':
      return resume.content.personalSummary.trim()
        ? [sectionHeading(SECTION_TITLES.summary, style, docx), paragraph(resume.content.personalSummary, style, docx)]
        : []
    case 'workExperience':
      return timelineSection(SECTION_TITLES.workExperience, resume.content.workExperience, style, docx, (item) => ({
        title: item.company,
        subtitle: item.role,
        meta: dateRange(item.startDate, item.endDate),
        body: item.description,
      }))
    case 'projectExperience':
      return timelineSection(SECTION_TITLES.projectExperience, resume.content.projectExperience, style, docx, (item) => ({
        title: item.name,
        subtitle: item.role,
        meta: dateRange(item.startDate, item.endDate),
        body: item.description,
      }))
    case 'education':
      return timelineSection(SECTION_TITLES.education, resume.content.education, style, docx, (item) => ({
        title: item.school,
        subtitle: [item.degree, item.major].filter(Boolean).join(' / '),
        meta: dateRange(item.startDate, item.endDate),
        body: item.description,
      }))
    case 'skills':
      return skillsSection(resume.content.skills, style, docx)
    case 'honors':
      return timelineSection(SECTION_TITLES.honors, resume.content.honors, style, docx, (item) => ({
        title: item.title,
        subtitle: item.issuer,
        meta: item.awardedAt,
        body: item.description,
      }))
    case 'certificates':
      return timelineSection(SECTION_TITLES.certificates, resume.content.certificates, style, docx, (item) => ({
        title: item.name,
        subtitle: item.issuer,
        meta: item.issuedAt,
        body: item.credentialId ? `证书编号：${item.credentialId}` : '',
      }))
    default:
      return []
  }
}

function sectionHeading(title: string, style: TemplateDocxStyle, docx: DocxModule) {
  return new docx.Paragraph({
    style: 'ResumeSection',
    border: {
      bottom: {
        color: style.borderColor,
        style: docx.BorderStyle.SINGLE,
        size: 3,
        space: 1,
      },
    },
    shading: {
      type: docx.ShadingType.CLEAR,
      fill: style.sectionFill,
      color: 'auto',
    },
    children: [new docx.TextRun({ text: title, bold: true })],
  })
}

function timelineSection<T extends EducationItem | WorkExperienceItem | ProjectExperienceItem | HonorItem | CertificateItem>(
  title: string,
  items: T[],
  style: TemplateDocxStyle,
  docx: DocxModule,
  mapItem: (item: T) => { title: string; subtitle?: string; meta?: string; body?: string },
) {
  const visibleItems = items
    .map(mapItem)
    .filter((item) => item.title.trim() || item.subtitle?.trim() || item.body?.trim())

  if (visibleItems.length === 0) {
    return []
  }

  return [
    sectionHeading(title, style, docx),
    ...visibleItems.flatMap((item) => [
      entryHeading(item.title, item.subtitle, item.meta, style, docx),
      item.body?.trim() ? paragraph(item.body, style, docx) : null,
    ].filter((node): node is DocxParagraph => Boolean(node))),
  ]
}

function skillsSection(items: SkillItem[], style: TemplateDocxStyle, docx: DocxModule) {
  const skills = items
    .map((item) => [item.name, item.level].filter(Boolean).join(' · '))
    .filter(Boolean)

  if (skills.length === 0) {
    return []
  }

  return [
    sectionHeading(SECTION_TITLES.skills, style, docx),
    ...skills.map((skill) => new docx.Paragraph({
      bullet: { level: 0 },
      spacing: { after: 40 },
      children: [new docx.TextRun({ text: skill, color: style.bodyColor })],
    })),
  ]
}

function entryHeading(
  title: string,
  subtitle: string | undefined,
  meta: string | undefined,
  style: TemplateDocxStyle,
  docx: DocxModule,
) {
  const parts = [title.trim(), subtitle?.trim(), meta?.trim()].filter(Boolean)

  return new docx.Paragraph({
    spacing: { before: 90, after: 45 },
    children: [
      new docx.TextRun({
        text: parts.join(' · '),
        bold: true,
        color: style.titleColor,
      }),
    ],
  })
}

function paragraph(text: string, style: TemplateDocxStyle, docx: DocxModule) {
  return new docx.Paragraph({
    spacing: { after: 80 },
    children: text
      .split('\n')
      .flatMap((line, index) => [
        index === 0 ? null : new docx.TextRun({ break: 1 }),
        new docx.TextRun({ text: line, color: style.bodyColor }),
      ])
      .filter((run): run is DocxTextRun => Boolean(run)),
  })
}

function dateRange(startDate: string, endDate: string) {
  const start = startDate.trim()
  const end = endDate.trim()
  if (start && end) {
    return `${start} - ${end}`
  }
  return start || end
}

function cssColorToHex(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  const trimmed = value.trim()
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)

  if (hexMatch) {
    const hex = hexMatch[1]
    return hex.length === 3
      ? hex.split('').map((part) => part + part).join('').toUpperCase()
      : hex.toUpperCase()
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i)
  if (!rgbMatch) {
    return fallback
  }

  const [red, green, blue] = rgbMatch[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number.parseInt(part.trim(), 10))

  if ([red, green, blue].some((part) => Number.isNaN(part))) {
    return fallback
  }

  return [red, green, blue]
    .map((part) => Math.max(0, Math.min(255, part)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}
