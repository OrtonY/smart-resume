import { BarChartOutlined } from '@ant-design/icons'
import { Alert, App, Button, Empty, Input, Progress, Space, Spin, Tag, Typography } from 'antd'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPersistedAiResumeScore, scoreAiResume } from '../api/aiApi'
import type { AiResumeHeatmapStatus, AiResumeRequirementStatus, AiResumeScoreResponse } from '../types'
import type { ResumeDetail } from '../../resume/types'

const { Paragraph, Text } = Typography
const { TextArea } = Input

const STATUS_TAG_COLORS: Record<string, string> = {
  matched: 'green',
  partial: 'gold',
  missing: 'red',
  strong: 'green',
  medium: 'blue',
  weak: 'orange',
}

const SECTION_STROKE_COLORS: Record<string, string> = {
  strong: '#18a058',
  medium: '#3157a4',
  weak: '#d46b08',
  missing: '#cf1322',
}

function getStatusTagColor(status: AiResumeRequirementStatus | AiResumeHeatmapStatus | string) {
  return STATUS_TAG_COLORS[status] ?? 'default'
}

function getSectionStrokeColor(status: AiResumeHeatmapStatus | string) {
  return SECTION_STROKE_COLORS[status] ?? '#3157a4'
}

function getHeatmapStatusLabel(status: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t('score.heatmapStatus.' + status, { defaultValue: status })
}

function getImportanceLabel(importance: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t('score.heatmapImportance.' + importance, { defaultValue: importance })
}

function getSectionLabel(sectionKey: string, fallback: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t('section.' + sectionKey, { defaultValue: fallback || sectionKey })
}

export function ResumeScoreButton({ draft }: { draft: ResumeDetail }) {
  const { t } = useTranslation('ai')
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [savedJobDescription, setSavedJobDescription] = useState('')
  const [scoring, setScoring] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restored, setRestored] = useState(false)
  const [result, setResult] = useState<AiResumeScoreResponse | null>(null)
  const [showJobDescriptionInput, setShowJobDescriptionInput] = useState(true)
  const requirementMatches = result?.requirementMatches ?? []
  const sectionHeatmap = result?.sectionHeatmap ?? []
  const hasHeatmap = Boolean(result?.jobDescriptionProvided && (requirementMatches.length > 0 || sectionHeatmap.length > 0))

  useEffect(() => {
    if (!open || restored) {
      return
    }

    let canceled = false
    const restorePersistedScore = async () => {
      setRestoring(true)
      try {
        const persisted = await getPersistedAiResumeScore(draft.id)
        if (canceled) {
          return
        }
        if (persisted) {
          setJobDescription(persisted.jobDescription)
          setSavedJobDescription(persisted.jobDescription)
          setResult(persisted.result)
          setShowJobDescriptionInput(false)
        }
        setRestored(true)
      } catch (error) {
        if (!canceled) {
          void message.error(error instanceof Error ? error.message : t('score.scoreFailed'))
        }
      } finally {
        if (!canceled) {
          setRestoring(false)
        }
      }
    }

    void restorePersistedScore()

    return () => {
      canceled = true
    }
  }, [draft.id, message, open, restored, t])

  function handleClose() {
    if (scoring || restoring) {
      return
    }
    setOpen(false)

    if (result) {
      setJobDescription(savedJobDescription)
      setShowJobDescriptionInput(false)
      return
    }

    setJobDescription('')
    setShowJobDescriptionInput(true)
  }

  async function handleScore() {
    setScoring(true)
    try {
      const normalizedJobDescription = jobDescription.trim()
      const response = await scoreAiResume({
        resumeId: draft.id,
        jobDescription: normalizedJobDescription || undefined,
      })

      setResult(response)
      setJobDescription(normalizedJobDescription)
      setSavedJobDescription(normalizedJobDescription)
      setShowJobDescriptionInput(false)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('score.scoreFailed'))
    } finally {
      setScoring(false)
    }
  }

  return (
    <>
      <Button icon={<BarChartOutlined />} onClick={() => setOpen(true)}>
        {t('score.buttonLabel')}
      </Button>

      <ResponsiveModal
        open={open}
        title={t('score.modalTitle')}
        onCancel={handleClose}
        footer={null}
        destroyOnHidden={false}
        width={720}
        className="resume-score-modal"
        styles={{
          body: {
            maxHeight: '70vh',
            overflowX: 'hidden',
            overflowY: 'auto',
          },
        }}
      >
        <div className="resume-score-panel">
          <div className="resume-score-panel__intro">
            <Tag color="blue">{t('score.currentResume')}</Tag>
            <Text strong>{draft.title}</Text>
            <Tag color="default">{t('score.jdOptional')}</Tag>
          </div>

          {showJobDescriptionInput ? (
            <div className="resume-score-panel__composer">
              <TextArea
                rows={6}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder={t('score.jdPlaceholder')}
                disabled={restoring}
              />
              <div className="resume-score-panel__actions">
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {t('score.mockHint')}
                </Paragraph>
                <Button type="primary" icon={<BarChartOutlined />} loading={scoring} disabled={restoring} onClick={() => void handleScore()}>
                  {result ? t('score.rescore') : t('score.startScoring')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="resume-score-panel__collapsed">
              <div className="resume-score-panel__collapsed-copy">
                <Text strong>{t('score.jdCollapsedTitle')}</Text>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {jobDescription.trim() ? t('score.jdUsed') : t('score.jdNotUsed')}
                </Paragraph>
                <Text type="secondary">{t('score.savedHint')}</Text>
              </div>
              <Space wrap>
                <Button disabled={restoring} onClick={() => setShowJobDescriptionInput(true)}>
                  {t('score.modifyJd')}
                </Button>
                <Button type="primary" icon={<BarChartOutlined />} loading={scoring} disabled={restoring} onClick={() => void handleScore()}>
                  {t('score.rescore')}
                </Button>
              </Space>
            </div>
          )}

          <Spin spinning={scoring || restoring}>
            {result ? (
              <div className="resume-score-result">
                {result.mode === 'mock' ? (
                  <Alert
                    showIcon
                    type="info"
                    message={t('score.mockAlertTitle')}
                    description={t('score.mockAlertDescription')}
                  />
                ) : null}

                <div className="resume-score-result__hero">
                  <div className="resume-score-result__meter">
                    <Progress
                      type="dashboard"
                      percent={result.score}
                      strokeColor="#3157a4"
                      format={(percent) => t('score.scoreUnit', { score: percent ?? 0 })}
                    />
                  </div>
                  <div className="resume-score-result__summary">
                    <Space wrap>
                      <Tag color="geekblue">{t('score.scoreCompleted')}</Tag>
                      {result.jobDescriptionProvided ? <Tag color="green">{t('score.withJd')}</Tag> : <Tag color="gold">{t('score.withoutJd')}</Tag>}
                    </Space>
                    <Paragraph>{result.summary}</Paragraph>
                    <Text type="secondary">{t('score.generatedAt', { time: new Date(result.generatedAt).toLocaleString() })}</Text>
                  </div>
                </div>

                <div className="resume-score-result__strengths">
                  <Text strong>{t('score.strengthsTitle')}</Text>
                  <div className="resume-score-result__tag-list">
                    {result.strengths.map((item) => (
                      <Tag color="blue" key={item}>
                        {item}
                      </Tag>
                    ))}
                  </div>
                </div>

                {hasHeatmap ? (
                  <div className="resume-score-heatmap">
                    <div className="resume-score-heatmap__header">
                      <div>
                        <Text strong>{t('score.heatmapTitle')}</Text>
                        {result.heatmapSummary ? (
                          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            {result.heatmapSummary}
                          </Paragraph>
                        ) : null}
                      </div>
                      <Tag color="purple">{t('score.heatmapTag')}</Tag>
                    </div>

                    {sectionHeatmap.length > 0 ? (
                      <div className="resume-score-section-heatmap">
                        <Text strong>{t('score.sectionHeatmapTitle')}</Text>
                        <div className="resume-score-section-heatmap__grid">
                          {sectionHeatmap.map((section) => (
                            <div className="resume-score-section-card" key={section.sectionKey}>
                              <div className="resume-score-section-card__heading">
                                <Text strong>
                                  {getSectionLabel(section.sectionKey, section.sectionLabel, t)}
                                </Text>
                                <Tag color={getStatusTagColor(section.status)}>
                                  {getHeatmapStatusLabel(section.status, t)}
                                </Tag>
                              </div>
                              <Progress
                                percent={section.score}
                                size="small"
                                strokeColor={getSectionStrokeColor(section.status)}
                              />
                              <Text type="secondary">
                                {t('score.sectionHeatmapCounts', {
                                  matched: section.matchedCount,
                                  missing: section.missingCount,
                                })}
                              </Text>
                              {section.summary ? (
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                  {section.summary}
                                </Paragraph>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {requirementMatches.length > 0 ? (
                      <div className="resume-score-requirements">
                        <Text strong>{t('score.requirementMatchesTitle')}</Text>
                        <div className="resume-score-requirements__list">
                          {requirementMatches.map((item, index) => (
                            <div className="resume-score-requirement" key={item.text + index}>
                              <div className="resume-score-requirement__heading">
                                <div className="resume-score-requirement__title">
                                  <Text strong>{item.text}</Text>
                                  <Space size={4} wrap>
                                    {item.category ? <Tag>{item.category}</Tag> : null}
                                    {item.importance ? (
                                      <Tag color="blue">
                                        {getImportanceLabel(item.importance, t)}
                                      </Tag>
                                    ) : null}
                                  </Space>
                                </div>
                                <Tag color={getStatusTagColor(item.status)}>
                                  {getHeatmapStatusLabel(item.status, t)}
                                </Tag>
                              </div>

                              <Progress
                                percent={item.score}
                                size="small"
                                strokeColor={getStatusTagColor(item.status) === 'red' ? '#cf1322' : '#3157a4'}
                              />

                              {item.matchedSections.length > 0 ? (
                                <div className="resume-score-requirement__sections">
                                  <Text type="secondary">{t('score.matchedSectionsLabel')}</Text>
                                  <Space size={4} wrap>
                                    {item.matchedSections.map((section) => (
                                      <Tag color="geekblue" key={section}>
                                        {getSectionLabel(section, section, t)}
                                      </Tag>
                                    ))}
                                  </Space>
                                </div>
                              ) : null}

                              {item.evidence.length > 0 ? (
                                <div className="resume-score-requirement__block">
                                  <Text type="secondary">{t('score.evidenceLabel')}</Text>
                                  <ul>
                                    {item.evidence.map((evidence) => (
                                      <li key={evidence}>{evidence}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {item.suggestion ? (
                                <div className="resume-score-requirement__suggestion">
                                  <Text type="secondary">{t('score.suggestionLabel')}</Text>
                                  <Paragraph style={{ marginBottom: 0 }}>{item.suggestion}</Paragraph>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="resume-score-result__groups">
                  {result.suggestionGroups.map((group) => (
                    <div className="resume-score-group" key={group.title}>
                      <Text strong>{group.title}</Text>
                      <ul>
                        {group.suggestions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="resume-score-empty">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('score.emptyDescription')}
                />
              </div>
            )}
          </Spin>
        </div>
      </ResponsiveModal>
    </>
  )
}
