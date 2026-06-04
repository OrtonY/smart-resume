import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Input, Pagination, Popconfirm, Select, Space, Spin, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getInterviewStatusOptions, type InterviewPage as InterviewPageData, type InterviewStatus } from '../types'
import {
  buildInterviewCardMeta,
  companyContextColor,
  companyContextStatusLabel,
  INTERVIEWS_PER_PAGE,
  interviewReportStatusLabel,
  interviewStatusLabel,
  statusColor,
} from '../interviewPageUtils'

const { Text } = Typography

interface InterviewCenterViewProps {
  filterResumeId?: string
  filterStatus?: InterviewStatus
  filterTargetCompany: string
  interviewPage: InterviewPageData | null
  keyword: string
  loading: boolean
  resumeOptions: Array<{ value: string; label: string }>
  onCreate: () => void
  onDelete: (interviewId: string) => void
  onOpenDetail: (interviewId: string) => void
  onUpdateSearch: (next: Record<string, string | undefined>) => void
}

export function InterviewCenterView({
  filterResumeId,
  filterStatus,
  filterTargetCompany,
  interviewPage,
  keyword,
  loading,
  resumeOptions,
  onCreate,
  onDelete,
  onOpenDetail,
  onUpdateSearch,
}: InterviewCenterViewProps) {
  const { t } = useTranslation('interview')

  return (
    <div className="workspace-layout">
      <div className="interview-center">
        <div className="workspace-hub__hero">
          <div className="workspace-hub__copy">
            <Tag color="blue">{t('center.tag')}</Tag>
            <h1>{t('center.title')}</h1>
            <p>{t('center.description')}</p>
          </div>

          <div className="workspace-hub__actions">
            <Link to="/app">
              <Button icon={<ArrowLeftOutlined />}>{t('center.backToHome')}</Button>
            </Link>
            <Link to="/app/interview-question-banks">
              <Button icon={<UnorderedListOutlined />}>{t('center.questionBanks')}</Button>
            </Link>
            <Button icon={<PlusOutlined />} onClick={onCreate}>
              {t('center.newInterview')}
            </Button>
          </div>
        </div>

        <Card className="glass-card interview-filter-card" bordered={false}>
          <Space wrap align="center">
            <Input.Search
              key={`keyword-${keyword}`}
              allowClear
              placeholder={t('filter.searchPlaceholder')}
              defaultValue={keyword}
              onSearch={(value) => onUpdateSearch({ keyword: value.trim() || undefined, page: '1' })}
              style={{ width: 260 }}
            />
            <Input.Search
              key={`company-${filterTargetCompany}`}
              allowClear
              placeholder={t('filter.companyPlaceholder')}
              defaultValue={filterTargetCompany}
              onSearch={(value) => onUpdateSearch({ targetCompany: value.trim() || undefined, page: '1' })}
              style={{ width: 220 }}
            />
            <Select
              allowClear
              placeholder={t('filter.resumePlaceholder')}
              value={filterResumeId}
              options={resumeOptions}
              onChange={(value?: string) => onUpdateSearch({ resumeId: value, page: '1' })}
              style={{ width: 220 }}
            />
            <Select
              allowClear
              placeholder={t('filter.statusPlaceholder')}
              value={filterStatus}
              options={getInterviewStatusOptions(t)}
              onChange={(value?: InterviewStatus) => onUpdateSearch({ status: value, page: '1' })}
              style={{ width: 160 }}
            />
          </Space>
        </Card>

        {loading ? (
          <div className="workspace-loading-state">
            <Spin size="large" />
          </div>
        ) : !interviewPage || interviewPage.items.length === 0 ? (
          <Card className="glass-card workspace-hub__empty" bordered={false}>
            <Empty description={t('list.empty')} />
          </Card>
        ) : (
          <>
            <div className="interview-card-grid">
              {interviewPage.items.map((item) => (
                <div
                  className="interview-card"
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDetail(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenDetail(item.id)
                    }
                  }}
                >
                  <div className="interview-card__head">
                    <span className="interview-card__status-tags">
                      <Tag color={statusColor(item.status)}>{interviewStatusLabel(item.status, t)}</Tag>
                      <Tag color="purple">{interviewReportStatusLabel(item.reportStatus, t)}</Tag>
                    </span>
                    <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                      <Popconfirm
                        title={t('list.deleteConfirm')}
                        okText={t('list.deleteOk')}
                        cancelText={t('common:actions.cancel')}
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(item.id)}
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          title={t('list.deleteTitle')}
                          aria-label={t('list.deleteTitle')}
                        />
                      </Popconfirm>
                    </span>
                  </div>
                  <strong>{item.title}</strong>
                  {item.targetCompany ? (
                    <div className="interview-card__company">
                      <Tag color="gold">{item.targetCompany}</Tag>
                      <Tag color={companyContextColor(item.companyContextStatus)}>
                        {companyContextStatusLabel(item.companyContextStatus, t)}
                      </Tag>
                    </div>
                  ) : null}
                  <p>{item.jobDescription || t('list.noJd')}</p>
                  <div className="interview-card__meta">
                    {buildInterviewCardMeta(item, t).map((meta) => (
                      <span key={`${item.id}-${meta}`}>{meta}</span>
                    ))}
                  </div>
                  <Text type="secondary">{t('list.updatedAt', { time: new Date(item.updatedAt).toLocaleString() })}</Text>
                </div>
              ))}
            </div>

            {interviewPage.totalPages > 1 ? (
              <div className="resume-list-pagination">
                <Pagination
                  current={interviewPage.page}
                  pageSize={INTERVIEWS_PER_PAGE}
                  total={interviewPage.total}
                  showSizeChanger={false}
                  onChange={(nextPage) => onUpdateSearch({ page: String(nextPage) })}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
