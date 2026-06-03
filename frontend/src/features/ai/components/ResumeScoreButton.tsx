import { BarChartOutlined } from '@ant-design/icons'
import { Alert, App, Button, Empty, Input, Space, Spin, Tag, Typography } from 'antd'
import { startTransition, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import type { ResumeDetail } from '../../resume/types'
import { getPersistedAiResumeScore, scoreAiResume } from '../api/aiApi'
import type {
  AiResumeHeatmapStatus,
  AiResumeRequirementMatch,
  AiResumeRequirementStatus,
  AiResumeScoreResponse,
  AiResumeScoreSuggestionGroup,
  AiResumeSectionHeatmap,
} from '../types'

const { Paragraph, Text } = Typography
const { TextArea } = Input

const SECTION_STROKE_COLORS: Record<string, string> = {
  strong: '#18a058',
  medium: '#3157a4',
  weak: '#d46b08',
  missing: '#cf1322',
}

type Translate = (key: string, options?: Record<string, unknown>) => string

function getSectionStrokeColor(status: AiResumeHeatmapStatus | string) {
  return SECTION_STROKE_COLORS[status] ?? '#3157a4'
}

function getRequirementStrokeColor(status: AiResumeRequirementStatus | string) {
  return status === 'missing' ? '#cf1322' : '#3157a4'
}

function getHeatmapStatusLabel(status: string, t: Translate) {
  return t('score.heatmapStatus.' + status, { defaultValue: status })
}

function getImportanceLabel(importance: string, t: Translate) {
  return t('score.heatmapImportance.' + importance, { defaultValue: importance })
}

function getSectionLabel(sectionKey: string, fallback: string, t: Translate) {
  return t('section.' + sectionKey, { defaultValue: fallback || sectionKey })
}

function normalizeScorePercent(score: number) {
  if (!Number.isFinite(score)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getScoreChipTone(status: AiResumeRequirementStatus | AiResumeHeatmapStatus | string) {
  if (status === 'matched' || status === 'partial' || status === 'missing' || status === 'strong' || status === 'medium' || status === 'weak') {
    return status
  }
  return 'default'
}

function HeatmapScoreBar({ color, percent }: { color: string; percent: number }) {
  const normalizedPercent = normalizeScorePercent(percent)
  const style = {
    '--resume-score-bar-color': color,
    '--resume-score-bar-percent': `${normalizedPercent}%`,
  } as CSSProperties

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalizedPercent}
      className="resume-score-bar"
      role="progressbar"
      style={style}
    >
      <span className="resume-score-bar__track">
        <span className="resume-score-bar__fill" />
      </span>
      <span className="resume-score-bar__value">{normalizedPercent}%</span>
    </div>
  )
}

function ScoreGauge({ score, t }: { score: number; t: Translate }) {
  const normalizedScore = normalizeScorePercent(score)

  return (
    <div
      aria-label={t('score.scoreUnit', { score: normalizedScore })}
      className="resume-score-gauge"
      role="img"
    >
      <strong>{normalizedScore}</strong>
      <span>{t('score.scoreGaugeUnit', { defaultValue: 'pts' })}</span>
    </div>
  )
}

function ScoreChip({ children, tone = 'default' }: { children: ReactNode; tone?: string }) {
  return (
    <span className={'resume-score-chip resume-score-chip--' + tone}>
      {children}
    </span>
  )
}

function SectionHeatmapCard({ section, t }: { section: AiResumeSectionHeatmap; t: Translate }) {
  return (
    <div className="resume-score-section-card">
      <div className="resume-score-section-card__heading">
        <strong>{getSectionLabel(section.sectionKey, section.sectionLabel, t)}</strong>
        <ScoreChip tone={getScoreChipTone(section.status)}>
          {getHeatmapStatusLabel(section.status, t)}
        </ScoreChip>
      </div>
      <HeatmapScoreBar color={getSectionStrokeColor(section.status)} percent={section.score} />
      <span className="resume-score-muted">
        {t('score.sectionHeatmapCounts', {
          matched: section.matchedCount,
          missing: section.missingCount,
        })}
      </span>
      {section.summary ? <p className="resume-score-paragraph resume-score-muted">{section.summary}</p> : null}
    </div>
  )
}

function RequirementMatchCard({ item, index, t }: { item: AiResumeRequirementMatch; index: number; t: Translate }) {
  return (
    <div className="resume-score-requirement" key={item.text + index}>
      <div className="resume-score-requirement__heading">
        <div className="resume-score-requirement__title">
          <strong>{item.text}</strong>
          <div className="resume-score-chip-list">
            {item.category ? <ScoreChip>{item.category}</ScoreChip> : null}
            {item.importance ? (
              <ScoreChip tone="blue">
                {getImportanceLabel(item.importance, t)}
              </ScoreChip>
            ) : null}
          </div>
        </div>
        <ScoreChip tone={getScoreChipTone(item.status)}>
          {getHeatmapStatusLabel(item.status, t)}
        </ScoreChip>
      </div>

      <HeatmapScoreBar color={getRequirementStrokeColor(item.status)} percent={item.score} />

      {item.matchedSections.length > 0 ? (
        <div className="resume-score-requirement__sections">
          <span className="resume-score-muted">{t('score.matchedSectionsLabel')}</span>
          <div className="resume-score-chip-list">
            {item.matchedSections.map((section) => (
              <ScoreChip key={section} tone="geekblue">
                {getSectionLabel(section, section, t)}
              </ScoreChip>
            ))}
          </div>
        </div>
      ) : null}

      {item.evidence.length > 0 ? (
        <div className="resume-score-requirement__block">
          <span className="resume-score-muted">{t('score.evidenceLabel')}</span>
          <ul>
            {item.evidence.map((evidence, evidenceIndex) => (
              <li key={evidence + evidenceIndex}>{evidence}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.suggestion ? (
        <div className="resume-score-requirement__suggestion">
          <span className="resume-score-muted">{t('score.suggestionLabel')}</span>
          <p>{item.suggestion}</p>
        </div>
      ) : null}
    </div>
  )
}

function SuggestionGroupCard({ group }: { group: AiResumeScoreSuggestionGroup }) {
  return (
    <div className="resume-score-group">
      <strong>{group.title}</strong>
      <ul>
        {group.suggestions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
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
          startTransition(() => {
            setJobDescription(persisted.jobDescription)
            setSavedJobDescription(persisted.jobDescription)
            setResult(persisted.result)
            setShowJobDescriptionInput(false)
          })
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

      startTransition(() => {
        setResult(response)
        setJobDescription(normalizedJobDescription)
        setSavedJobDescription(normalizedJobDescription)
        setShowJobDescriptionInput(false)
      })
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
        destroyOnHidden
        width={720}
        className="resume-score-modal"
        styles={{
          body: {
            height: '70vh',
            overflowX: 'hidden',
            overflowY: 'hidden',
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

          <div className="resume-score-scroll-region">
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
                    <ScoreGauge score={result.score} t={t} />
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
                  <div className="resume-score-chip-list">
                    {result.strengths.map((item) => (
                      <ScoreChip key={item} tone="blue">
                        {item}
                      </ScoreChip>
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
                            <SectionHeatmapCard key={section.sectionKey} section={section} t={t} />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {requirementMatches.length > 0 ? (
                      <div className="resume-score-requirements">
                        <Text strong>{t('score.requirementMatchesTitle')}</Text>
                        <div className="resume-score-requirements__list">
                          {requirementMatches.map((item, index) => (
                            <RequirementMatchCard index={index} item={item} key={item.text + index} t={t} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="resume-score-result__groups">
                  {result.suggestionGroups.map((group) => (
                    <SuggestionGroupCard group={group} key={group.title} />
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
        </div>
      </ResponsiveModal>
    </>
  )
}
