export interface ResumeTemplateOption {
  key: string
  name: string
  accent: string
  summary: string
}

export const RESUME_TEMPLATES: ResumeTemplateOption[] = [
  {
    key: 'north-star',
    name: '北极星',
    accent: '#3157a4',
    summary: '沉稳大气，突出头部信息，层次分明。',
  },
  {
    key: 'ink-flow',
    name: '墨流',
    accent: '#392f5a',
    summary: '深色编辑风格，适合作品集导向的个人资料。',
  },
  {
    key: 'grid-slate',
    name: '网格石板',
    accent: '#ff8c42',
    summary: '高对比度现代风格，适合产品和设计岗位。',
  },
]
