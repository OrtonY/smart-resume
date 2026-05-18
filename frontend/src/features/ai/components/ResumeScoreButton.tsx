import { BarChartOutlined } from '@ant-design/icons'
import { Alert, App, Button, Empty, Input, Modal, Progress, Space, Spin, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
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
      void message.error(error instanceof Error ? error.message : '简历评分失败')
    } finally {
      setScoring(false)
    }
  }

  return (
    <>
      <Button icon={<BarChartOutlined />} onClick={() => setOpen(true)}>
        简历评分
      </Button>

      <Modal
        open={open}
        title="简历评分"
        onCancel={handleClose}
        footer={null}
        destroyOnHidden={false}
      >
        <div className="resume-score-panel">
          <div className="resume-score-panel__intro">
            <Tag color="blue">当前简历</Tag>
            <Text strong>{draft.title}</Text>
            <Tag color="default">JD 选填</Tag>
          </div>

          {showJobDescriptionInput ? (
            <div className="resume-score-panel__composer">
              <TextArea
                rows={6}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="可填写目标岗位 JD，帮助评分更贴近投递场景；留空也可以直接评分。"
              />
              <div className="resume-score-panel__actions">
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  当前为可跑通前后端流程的模拟评分结果，后续可无缝替换成真实 AI 评分。
                </Paragraph>
                <Button type="primary" icon={<BarChartOutlined />} loading={scoring} onClick={() => void handleScore()}>
                  {result ? '重新评分' : '开始评分'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="resume-score-panel__collapsed">
              <div className="resume-score-panel__collapsed-copy">
                <Text strong>JD 输入区已收起</Text>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {jobDescription.trim() ? '本次评分已使用你填写的 JD。' : '本次评分未填写 JD，结果基于通用简历质量。'}
                </Paragraph>
                <Text type="secondary">评分结果已保存在当前浏览器，下次打开可继续查看。</Text>
              </div>
              <Space wrap>
                <Button onClick={() => setShowJobDescriptionInput(true)}>
                  修改 JD
                </Button>
                <Button type="primary" icon={<BarChartOutlined />} loading={scoring} onClick={() => void handleScore()}>
                  重新评分
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
                    message="当前展示的是 Mock 评分结果"
                    description="接口结构已经稳定，后续接入真实 AI 时无需调整页面交互。"
                  />
                ) : null}

                <div className="resume-score-result__hero">
                  <div className="resume-score-result__meter">
                    <Progress
                      type="dashboard"
                      percent={result.score}
                      strokeColor="#3157a4"
                      format={(percent) => `${percent ?? 0} 分`}
                    />
                  </div>
                  <div className="resume-score-result__summary">
                    <Space wrap>
                      <Tag color="geekblue">评分完成</Tag>
                      {result.jobDescriptionProvided ? <Tag color="green">已结合 JD</Tag> : <Tag color="gold">未填写 JD</Tag>}
                    </Space>
                    <Paragraph>{result.summary}</Paragraph>
                    <Text type="secondary">生成时间：{new Date(result.generatedAt).toLocaleString()}</Text>
                  </div>
                </div>

                <div className="resume-score-result__strengths">
                  <Text strong>当前亮点</Text>
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
                  description="填写 JD 后点击开始评分，或直接评分查看当前简历的结构与内容建议。"
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
