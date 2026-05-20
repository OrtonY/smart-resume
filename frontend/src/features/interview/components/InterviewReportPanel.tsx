import { ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, Empty, Progress, Spin, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownMessage } from '../../../lib/markdown/MarkdownMessage'
import { regenerateReport, streamReportEvents } from '../api/interviewApi'
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
      <Card className="glass-card interview-report-panel" bordered={false}>
        <Title level={4}>面试报告</Title>
        <Empty description={interviewEnded ? '报告尚未生成' : '面试结束后将自动生成报告'}>
          {interviewEnded && (
            <Button
              type="primary"
              loading={regenerating}
              onClick={handleRegenerate}
            >
              生成报告
            </Button>
          )}
        </Empty>
      </Card>
    )
  }

  if (activeStatus === 'GENERATING') {
    return (
      <Card className="glass-card interview-report-panel" bordered={false}>
        <Title level={4}>面试报告</Title>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>AI 正在分析面试表现，生成报告中...</Paragraph>
        </div>
      </Card>
    )
  }

  if (activeStatus === 'FAILED') {
    return (
      <Card className="glass-card interview-report-panel" bordered={false}>
        <Title level={4}>面试报告</Title>
        <Empty description="报告生成失败">
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={regenerating}
            onClick={handleRegenerate}
          >
            重新生成
          </Button>
        </Empty>
      </Card>
    )
  }

  if (!activeReport) {
    return (
      <Card className="glass-card interview-report-panel" bordered={false}>
        <Title level={4}>面试报告</Title>
        <Empty description="报告数据异常" />
      </Card>
    )
  }

  return (
    <Card className="glass-card interview-report-panel" bordered={false}>
      <Title level={4}>面试报告</Title>
      <div className="interview-report-content">
        <ScoreOverview report={activeReport} />
        <SkillAssessmentSection assessment={activeReport.skillAssessment} />
        <StrengthsAndImprovements strengths={activeReport.strengths} improvements={activeReport.improvements} />
        <RoundsSection rounds={activeReport.rounds} />
        <LearningResourcesSection resources={activeReport.learningResources} />
      </div>
    </Card>
  )
}

function ScoreOverview({ report }: { report: InterviewReportData }) {
  return (
    <div className="report-score-overview">
      <div className="report-score-circle">
        <Progress
          type="circle"
          percent={report.overallScore}
          format={(percent) => <span className="report-score-value">{percent}</span>}
          size={120}
          strokeColor={scoreColor(report.overallScore)}
        />
      </div>
      <Paragraph className="report-summary">{report.summary}</Paragraph>
    </div>
  )
}

function SkillAssessmentSection({ assessment }: { assessment: InterviewReportData['skillAssessment'] }) {
  const skills = [
    { label: '技术能力', value: assessment.technicalAbility },
    { label: '沟通表达', value: assessment.communication },
    { label: '问题解决', value: assessment.problemSolving },
    { label: '专业素养', value: assessment.professionalism },
  ]

  return (
    <div className="report-section">
      <Title level={5}>能力评估</Title>
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
  return (
    <div className="report-section">
      <div className="report-stacked-list">
        <div>
          <Title level={5}>亮点</Title>
          <div className="report-tag-list">
            {strengths.map((s, i) => (
              <Tag key={i} color="green">{s}</Tag>
            ))}
          </div>
        </div>
        <div>
          <Title level={5}>改进建议</Title>
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
  const items = rounds.map((round, index) => ({
    key: String(index),
    label: (
      <span>
        {round.role} <Tag color={scoreColor(round.roundScore)}>{round.roundScore}分</Tag>
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
                {' '}<Tag color={scoreColor(q.score)}>{q.score}分</Tag>
              </span>
            ),
            children: (
              <div className="report-question-detail">
                <div><Text strong>候选人回答：</Text><MarkdownMessage content={q.candidateAnswer} /></div>
                <div><Text strong>评价：</Text><MarkdownMessage content={q.feedback} /></div>
                <div><Text strong>参考答案：</Text><MarkdownMessage content={q.referenceAnswer} /></div>
              </div>
            ),
          }))}
        />
      </div>
    ),
  }))

  return (
    <div className="report-section">
      <Title level={5}>各轮面试详情</Title>
      <Collapse items={items} />
    </div>
  )
}

function LearningResourcesSection({ resources }: { resources: InterviewReportData['learningResources'] }) {
  if (!resources || resources.length === 0) return null

  return (
    <div className="report-section">
      <Title level={5}>学习资源推荐</Title>
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
  if (score >= 80) return '#52c41a'
  if (score >= 60) return '#1890ff'
  if (score >= 40) return '#faad14'
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
