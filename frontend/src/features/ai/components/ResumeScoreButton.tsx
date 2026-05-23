import { BarChartOutlined } from '@ant-design/icons'
import { Alert, App, Button, Empty, Input, Modal, Progress, Space, Spin, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { scoreAiResume } from '../api/aiApi'
import { toAiResumeContext } from '../resumeContext'
import type { AiResumeScoreResponse } from '../types'
import type { ResumeDetail } from '../../resume/types'

const { Paragraph, Text } = Typography
const { TextArea } = Input
const RESUME_SCORE_STORAGE_KEY_PREFIX = 'smart-resume:resume-score:'

interface PersistedResumeScoreState {
  version: 1
  jobDescription: string
  result: AiResumeScoreResponse
}

export function ResumeScoreButton({ draft }: { draft: ResumeDetail }) {
  const persistedState = loadPersistedResumeScore(draft.id)

  return <ResumeScoreButtonInner key={draft.id} draft={draft} persistedState={persistedState} />
}

function ResumeScoreButtonInner({
  draft,
  persistedState,
}: {
  draft: ResumeDetail
  persistedState: PersistedResumeScoreState | null
}) {
  const { t } = useTranslation('ai')
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [jobDescription, setJobDescription] = useState(persistedState?.jobDescription ?? '')
  const [savedJobDescription, setSavedJobDescription] = useState(persistedState?.jobDescription ?? '')
  const [scoring, setScoring] = useState(false)
  const [result, setResult] = useState<AiResumeScoreResponse | null>(persistedState?.result ?? null)
  const [showJobDescriptionInput, setShowJobDescriptionInput] = useState(!persistedState)

  const resumeContext = useMemo(() => toAiResumeContext(draft), [draft])

  function handleClose() {
    if (scoring) {
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
        resume: resumeContext,
        jobDescription: normalizedJobDescription || undefined,
      })

      setResult(response)
      setJobDescription(normalizedJobDescription)
      setSavedJobDescription(normalizedJobDescription)
      persistResumeScore(draft.id, {
        version: 1,
        jobDescription: normalizedJobDescription,
        result: response,
      })
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

      <Modal
        open={open}
        title={t('score.modalTitle')}
        onCancel={handleClose}
        footer={null}
        destroyOnHidden={false}
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
              />
              <div className="resume-score-panel__actions">
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {t('score.mockHint')}
                </Paragraph>
                <Button type="primary" icon={<BarChartOutlined />} loading={scoring} onClick={() => void handleScore()}>
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
                <Button onClick={() => setShowJobDescriptionInput(true)}>
                  {t('score.modifyJd')}
                </Button>
                <Button type="primary" icon={<BarChartOutlined />} loading={scoring} onClick={() => void handleScore()}>
                  {t('score.rescore')}
                </Button>
              </Space>
            </div>
          )}

          <Spin spinning={scoring}>
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
      </Modal>
    </>
  )
}

function buildResumeScoreStorageKey(resumeId: string) {
  return `${RESUME_SCORE_STORAGE_KEY_PREFIX}${resumeId}`
}

function loadPersistedResumeScore(resumeId: string): PersistedResumeScoreState | null {
  try {
    const raw = window.localStorage.getItem(buildResumeScoreStorageKey(resumeId))
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PersistedResumeScoreState>
    if (
      parsed.version !== 1
      || typeof parsed.jobDescription !== 'string'
      || !parsed.result
      || typeof parsed.result.score !== 'number'
      || typeof parsed.result.summary !== 'string'
    ) {
      return null
    }

    return {
      version: 1,
      jobDescription: parsed.jobDescription,
      result: parsed.result,
    }
  } catch {
    return null
  }
}

function persistResumeScore(resumeId: string, value: PersistedResumeScoreState) {
  try {
    window.localStorage.setItem(buildResumeScoreStorageKey(resumeId), JSON.stringify(value))
  } catch {
    // Ignore storage failures so scoring UX still works when persistence is unavailable.
  }
}
