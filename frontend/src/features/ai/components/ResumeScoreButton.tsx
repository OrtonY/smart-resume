import { BarChartOutlined } from '@ant-design/icons'
import { Alert, App, Button, Empty, Input, Progress, Space, Spin, Tag, Typography } from 'antd'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPersistedAiResumeScore, scoreAiResume } from '../api/aiApi'
import type { AiResumeScoreResponse } from '../types'
import type { ResumeDetail } from '../../resume/types'

const { Paragraph, Text } = Typography
const { TextArea } = Input

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
