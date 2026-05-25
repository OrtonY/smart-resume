import { Card, Empty, Pagination, Space, Spin } from 'antd'
import { ResumeVisualCard } from './ResumeVisualCard'
import { RESUMES_PER_PAGE } from '../constants'
import type { ResumeTemplateDefinition } from '../templateCatalog'
import type { ResumeDetail, ResumePage, ResumeSummary } from '../types'

interface ResumeVisualGridProps {
  emptyDescription: string
  emptySlotKeyPrefix: string
  loading: boolean
  onCopyResume?: (resumeId: string, title: string) => Promise<void>
  onDeleteResume?: (resumeId: string) => Promise<void>
  onOpenResume?: (resumeId: string) => void
  onOpenShareDialog?: (resume: ResumeSummary) => Promise<void>
  onPageChange: (page: number) => Promise<void>
  onRestoreResume?: (resumeId: string) => Promise<void>
  previewDetailsByResumeId: Record<string, ResumeDetail>
  resumeList: ResumeSummary[]
  resumePage: ResumePage | null
  selectedTemplateName: (templateKey: string) => string
  status?: 'active' | 'deleted'
  templates: ResumeTemplateDefinition[]
}

export function ResumeVisualGrid({
  emptyDescription,
  emptySlotKeyPrefix,
  loading,
  onCopyResume,
  onDeleteResume,
  onOpenResume,
  onOpenShareDialog,
  onPageChange,
  onRestoreResume,
  previewDetailsByResumeId,
  resumeList,
  resumePage,
  selectedTemplateName,
  status = 'active',
  templates,
}: ResumeVisualGridProps) {
  const emptySlotCount = Math.max(0, RESUMES_PER_PAGE - resumeList.length)

  if (loading) {
    return (
      <div className="workspace-loading-state">
        <Spin size="large" />
      </div>
    )
  }

  if (resumeList.length === 0) {
    return (
      <Card className="glass-card workspace-hub__empty" bordered={false}>
        <Empty description={emptyDescription} />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={18} style={{ width: '100%' }}>
      <div className="resume-list-grid">
        {resumeList.map((item) => (
          <ResumeVisualCard
            key={item.id}
            item={item}
            loadingPreview={!previewDetailsByResumeId[item.id]}
            onCopyResume={onCopyResume}
            onDeleteResume={onDeleteResume}
            onOpenResume={onOpenResume}
            onOpenShareDialog={onOpenShareDialog}
            onRestoreResume={onRestoreResume}
            previewDetail={previewDetailsByResumeId[item.id]}
            selectedTemplateName={selectedTemplateName(item.templateKey)}
            status={status}
            templates={templates}
          />
        ))}
        {Array.from({ length: emptySlotCount }).map((_, index) => (
          <div className="resume-list-card resume-list-card--empty" key={`${emptySlotKeyPrefix}-${index}`} aria-hidden="true" />
        ))}
      </div>

      {resumePage && resumePage.totalPages > 1 ? (
        <div className="resume-list-pagination">
          <Pagination
            current={resumePage.page}
            pageSize={RESUMES_PER_PAGE}
            total={resumePage.total}
            onChange={(nextPage) => void onPageChange(nextPage)}
            showSizeChanger={false}
          />
        </div>
      ) : null}
    </Space>
  )
}
