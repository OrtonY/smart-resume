import { ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, Empty, Progress, Spin, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '../../../lib/hooks/useIsMobile'
import { MarkdownMessage } from '../../../lib/markdown/MarkdownMessage'
import { regenerateReport, streamReportEvents } from '../api/interviewApi'
import {
  INTERVIEW_REPORT_COMPACT_SCORE_SIZE,
  INTERVIEW_REPORT_DEFAULT_SCORE_SIZE,
  INTERVIEW_SCORE_EXCELLENT_THRESHOLD,
  INTERVIEW_SCORE_GOOD_THRESHOLD,
  INTERVIEW_SCORE_PASSING_THRESHOLD,
} from '../constants'
import type {
  InterviewReport as InterviewReportData,
  InterviewReportStatus,
  ReportStatusEvent,
} from '../types'

const { Title, Text, Paragraph } = Typography

interface InterviewReportPanelProps {
  interviewId: string
  interviewEnded: boolean
  reportStatus: InterviewReportStatus
  reportContent: string | null
  onStatusChange?: (status: InterviewReportStatus, content: string | null) => void
}

export function InterviewReportPanel({
  interviewId,
  interviewEnded,
  reportStatus,
  reportContent,
  onStatusChange,
}: InterviewReportPanelProps) {
  const { t } = useTranslation('interview')
  const isMobile = useIsMobile()
  const [streamStatus, setStreamStatus] = useState<InterviewReportStatus | null>(null)
  const [streamReport, setStreamReport] = useState<InterviewReportData | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const onStatusChangeRef = useRef(onStatusChange)

  const propReport = useMemo(() => parseReport(reportContent), [reportContent])
  const activeStatus = streamStatus ?? reportStatus
  const activeReport = streamReport ?? propReport

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  useEffect(() => {
    if (!interviewEnded || activeStatus !== 'GENERATING') return

    const controller = new AbortController()
    void streamReportEvents(interviewId, (data: ReportStatusEvent) => {
      setStreamStatus(data.reportStatus)
      if (data.reportContent) {
        setStreamReport(parseReport(data.reportContent))
      }
      onStatusChangeRef.current?.(data.reportStatus, data.reportContent)
      if (data.reportStatus === 'READY' || data.reportStatus === 'FAILED') {
        controller.abort()
      }
    }, { signal: controller.signal }).catch((error) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.warn('Report event stream failed', error)
      }
    })

    return () => {
      controller.abort()
    }
  }, [interviewId, activeStatus, interviewEnded])

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true)
    setStreamStatus('GENERATING')
    setStreamReport(null)
    try {
      await regenerateReport(interviewId)
    } finally {
      setRegenerating(false)
    }
  }, [interviewId])

  if (activeStatus === 'PENDING') {
    return (
      <ReportShell isMobile={isMobile}>
        {!isMobile && <Title level={4}>{t('report.title')}</Title>}
        <Empty description={interviewEnded ? t('report.pendingEnded') : t('report.pendingNotEnded')}>
          {interviewEnded && (
            <Button
              type="primary"
              loading={regenerating}
              onClick={handleRegenerate}
            >
              {t('report.generate')}
            </Button>
          )}
        </Empty>
      </ReportShell>
    )
  }

  if (activeStatus === 'GENERATING') {
    return (
      <ReportShell isMobile={isMobile}>
        {!isMobile && <Title level={4}>{t('report.title')}</Title>}
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>{t('report.generating')}</Paragraph>
        </div>
      </ReportShell>
    )
  }

  if (activeStatus === 'FAILED') {
    return (
      <ReportShell isMobile={isMobile}>
        {!isMobile && <Title level={4}>{t('report.title')}</Title>}
        <Empty description={t('report.failed')}>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={regenerating}
            onClick={handleRegenerate}
          >
            {t('report.regenerate')}
          </Button>
        </Empty>
      </ReportShell>
    )
  }

  if (!activeReport) {
    return (
      <ReportShell isMobile={isMobile}>
        {!isMobile && <Title level={4}>{t('report.title')}</Title>}
        <Empty description={t('report.dataError')} />
      </ReportShell>
    )
  }

  return (
    <ReportShell isMobile={isMobile}>
      {!isMobile && <Title level={4}>{t('report.title')}</Title>}
      <div className="interview-report-content">
        <ScoreOverview report={activeReport} compact={isMobile} />
        <SkillAssessmentSection assessment={activeReport.skillAssessment} />
        <StrengthsAndImprovements strengths={activeReport.strengths} improvements={activeReport.improvements} />
        <RoundsSection rounds={activeReport.rounds} />
        <LearningResourcesSection resources={activeReport.learningResources} />
      </div>
    </ReportShell>
  )
}

function ReportShell({ isMobile, children }: { isMobile: boolean; children: React.ReactNode }) {
  if (isMobile) {
    return <div className="interview-report-panel--mobile">{children}</div>
  }
  return (
    <Card className="glass-card interview-report-panel" bordered={false}>
      {children}
    </Card>
  )
}

function ScoreOverview({ report, compact }: { report: InterviewReportData; compact?: boolean }) {
  return (
    <div className={compact ? 'report-score-overview report-score-overview--compact' : 'report-score-overview'}>
      <div className="report-score-circle">
        <Progress
          type={compact ? 'dashboard' : 'circle'}
          percent={report.overallScore}
          format={(percent) => <span className="report-score-value">{percent}</span>}
          size={compact ? INTERVIEW_REPORT_COMPACT_SCORE_SIZE : INTERVIEW_REPORT_DEFAULT_SCORE_SIZE}
          strokeColor={scoreColor(report.overallScore)}
        />
      </div>
      <Paragraph className="report-summary">{report.summary}</Paragraph>
    </div>
  )
}

function SkillAssessmentSection({ assessment }: { assessment: InterviewReportData['skillAssessment'] }) {
  const { t } = useTranslation('interview')
  const skills = [
    { label: t('report.technicalAbility'), value: assessment.technicalAbility },
    { label: t('report.communication'), value: assessment.communication },
    { label: t('report.problemSolving'), value: assessment.problemSolving },
    { label: t('report.professionalism'), value: assessment.professionalism },
  ]

  return (
    <div className="report-section">
      <Title level={5}>{t('report.skillAssessment')}</Title>
      <div className="report-skills">
        {skills.map((skill) => (
          <div key={skill.label} className="report-skill-item">
            <Text className="report-skill-label">{skill.label}</Text>
            <Progress
              percent={skill.value}
              strokeColor={scoreColor(skill.value)}
              size="small"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function StrengthsAndImprovements({
  strengths,
  improvements,
}: {
  strengths: string[]
  improvements: string[]
}) {
  const { t } = useTranslation('interview')
  return (
    <div className="report-section">
      <div className="report-stacked-list">
        <div>
          <Title level={5}>{t('report.strengths')}</Title>
          <div className="report-tag-list">
            {strengths.map((s, i) => (
              <Tag key={i} color="green">{s}</Tag>
            ))}
          </div>
        </div>
        <div>
          <Title level={5}>{t('report.improvements')}</Title>
          <div className="report-tag-list">
            {improvements.map((s, i) => (
              <Tag key={i} color="orange">{s}</Tag>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RoundsSection({ rounds }: { rounds: InterviewReportData['rounds'] }) {
  const { t } = useTranslation('interview')
  const items = rounds.map((round, index) => ({
    key: String(index),
    label: (
      <span>
        {round.role} <Tag color={scoreColor(round.roundScore)}>{round.roundScore}{t('report.scoreUnit')}</Tag>
      </span>
    ),
    children: (
      <div>
        <MarkdownMessage content={round.summary} />
        <Collapse
          size="small"
          items={round.questions.map((q, qi) => ({
            key: String(qi),
            label: (
              <span>
                Q{qi + 1}: {q.question.slice(0, 50)}{q.question.length > 50 ? '...' : ''}
                {' '}<Tag color={scoreColor(q.score)}>{q.score}{t('report.scoreUnit')}</Tag>
              </span>
            ),
            children: (
              <div className="report-question-detail">
                <div><Text strong>{t('report.candidateAnswer')}</Text><MarkdownMessage content={q.candidateAnswer} /></div>
                <div><Text strong>{t('report.feedback')}</Text><MarkdownMessage content={q.feedback} /></div>
                <div><Text strong>{t('report.referenceAnswer')}</Text><MarkdownMessage content={q.referenceAnswer} /></div>
              </div>
            ),
          }))}
        />
      </div>
    ),
  }))

  return (
    <div className="report-section">
      <Title level={5}>{t('report.roundsDetail')}</Title>
      <Collapse items={items} />
    </div>
  )
}

function LearningResourcesSection({ resources }: { resources: InterviewReportData['learningResources'] }) {
  const { t } = useTranslation('interview')
  if (!resources || resources.length === 0) return null

  return (
    <div className="report-section">
      <Title level={5}>{t('report.learningResources')}</Title>
      {resources.map((resource, i) => (
        <Card key={i} size="small" style={{ marginBottom: 8 }}>
          <Text strong>{resource.topic}</Text>
          <Paragraph type="secondary" style={{ margin: '4px 0' }}>{resource.reason}</Paragraph>
          <div>
            {resource.suggestions.map((s, si) => (
              <Tag key={si} style={{ marginBottom: 4 }}>{s}</Tag>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= INTERVIEW_SCORE_EXCELLENT_THRESHOLD) return '#52c41a'
  if (score >= INTERVIEW_SCORE_GOOD_THRESHOLD) return '#1890ff'
  if (score >= INTERVIEW_SCORE_PASSING_THRESHOLD) return '#faad14'
  return '#ff4d4f'
}

function parseReport(content: string | null): InterviewReportData | null {
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}
