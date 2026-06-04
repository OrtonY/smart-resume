import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { App, Button, Card, Empty, Form, Input, Popconfirm, Select, Space, Spin, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ResponsiveModal } from '../components/shared/ResponsiveModal'
import {
  createQuestion,
  createQuestionBank,
  deleteQuestion,
  deleteQuestionBank,
  listQuestionBanks,
  listQuestions,
  updateQuestion,
  updateQuestionBank,
} from '../features/interview/api/questionBankApi'
import { INTERVIEW_MODAL_WIDTH } from '../features/interview/constants'
import { getInterviewDifficultyOptions } from '../features/interview/types'
import { useMediaQuery } from '../lib/hooks/useIsMobile'
import type {
  InterviewQuestion,
  InterviewQuestionBank,
  QuestionBankPayload,
  QuestionPayload,
} from '../features/interview/questionBankTypes'

const { Text } = Typography
const QUESTION_BANK_COMPACT_LAYOUT_QUERY = '(max-width: 900px)'

type BankFormValues = {
  name: string
  description?: string
  tags: string[]
}

type QuestionFormValues = {
  question: string
  difficulty: QuestionPayload['difficulty']
  tags: string[]
  focusPoints?: string
}

export function InterviewQuestionBankPage() {
  const { t } = useTranslation('interview')
  const { message } = App.useApp()
  const isCompactLayout = useMediaQuery(QUESTION_BANK_COMPACT_LAYOUT_QUERY)
  const [bankForm] = Form.useForm<BankFormValues>()
  const [questionForm] = Form.useForm<QuestionFormValues>()

  const [banks, setBanks] = useState<InterviewQuestionBank[]>([])
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [keyword, setKeyword] = useState('')
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null)
  const [mobileQuestionListOpen, setMobileQuestionListOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<InterviewQuestionBank | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [loadingBanks, setLoadingBanks] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.id === selectedBankId) ?? banks[0] ?? null,
    [banks, selectedBankId],
  )

  const tagOptions = useMemo(
    () => (selectedBank?.tags ?? []).map((tag) => ({ value: tag, label: tag })),
    [selectedBank],
  )
  const showBankList = !isCompactLayout || !mobileQuestionListOpen
  const showQuestionDetail = !isCompactLayout || mobileQuestionListOpen
  const showBankFilter = !isCompactLayout || !mobileQuestionListOpen
  const activeQuestionBankId = showQuestionDetail ? selectedBank?.id ?? null : null

  const loadBanks = useCallback(async (nextKeyword = keyword) => {
    setLoadingBanks(true)
    try {
      const result = await listQuestionBanks(nextKeyword)
      setBanks(result)
      setSelectedBankId((current) => {
        if (current && result.some((bank) => bank.id === current)) {
          return current
        }
        return result[0]?.id ?? null
      })
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('questionBank.feedback.loadBanksFailed'))
    } finally {
      setLoadingBanks(false)
    }
  }, [keyword, message, t])

  const loadQuestions = useCallback(async (bankId: string | null) => {
    if (!bankId) {
      setQuestions([])
      return
    }
    setLoadingQuestions(true)
    try {
      setQuestions(await listQuestions(bankId))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('questionBank.feedback.loadQuestionsFailed'))
    } finally {
      setLoadingQuestions(false)
    }
  }, [message, t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBanks('')
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadBanks])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQuestions(activeQuestionBankId)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [activeQuestionBankId, loadQuestions])

  function openCreateBank() {
    setEditingBank(null)
    bankForm.setFieldsValue({ name: '', description: '', tags: [] })
    setBankModalOpen(true)
  }

  function openEditBank(bank: InterviewQuestionBank) {
    setEditingBank(bank)
    bankForm.setFieldsValue({
      name: bank.name,
      description: bank.description ?? '',
      tags: bank.tags,
    })
    setBankModalOpen(true)
  }

  function openCreateQuestion() {
    setEditingQuestion(null)
    questionForm.setFieldsValue({ question: '', difficulty: 'MEDIUM', tags: [], focusPoints: '' })
    setQuestionModalOpen(true)
  }

  function openEditQuestion(question: InterviewQuestion) {
    setEditingQuestion(question)
    questionForm.setFieldsValue({
      question: question.question,
      difficulty: question.difficulty,
      tags: question.tags,
      focusPoints: question.focusPoints ?? '',
    })
    setQuestionModalOpen(true)
  }

  function handleSelectBank(bankId: string) {
    setSelectedBankId(bankId)
    if (isCompactLayout) {
      setMobileQuestionListOpen(true)
    }
  }

  function handleBackToBanks() {
    setMobileQuestionListOpen(false)
  }

  async function handleSaveBank(values: BankFormValues) {
    const payload: QuestionBankPayload = {
      name: values.name.trim(),
      description: values.description?.trim() || null,
      tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
    }
    setSavingBank(true)
    try {
      const saved = editingBank
        ? await updateQuestionBank(editingBank.id, payload)
        : await createQuestionBank(payload)
      void message.success(editingBank ? t('questionBank.feedback.bankUpdated') : t('questionBank.feedback.bankCreated'))
      setBankModalOpen(false)
      await loadBanks(keyword)
      setSelectedBankId(saved.id)
      if (isCompactLayout) {
        setMobileQuestionListOpen(true)
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('questionBank.feedback.saveBankFailed'))
    } finally {
      setSavingBank(false)
    }
  }

  async function handleSaveQuestion(values: QuestionFormValues) {
    if (!selectedBank) {
      return
    }
    const payload: QuestionPayload = {
      question: values.question.trim(),
      difficulty: values.difficulty,
      tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
      focusPoints: values.focusPoints?.trim() || null,
    }
    setSavingQuestion(true)
    try {
      if (editingQuestion) {
        await updateQuestion(selectedBank.id, editingQuestion.id, payload)
      } else {
        await createQuestion(selectedBank.id, payload)
      }
      void message.success(editingQuestion ? t('questionBank.feedback.questionUpdated') : t('questionBank.feedback.questionCreated'))
      setQuestionModalOpen(false)
      await loadQuestions(selectedBank.id)
      await loadBanks(keyword)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('questionBank.feedback.saveQuestionFailed'))
    } finally {
      setSavingQuestion(false)
    }
  }

  async function handleDeleteBank(bankId: string) {
    try {
      await deleteQuestionBank(bankId)
      void message.success(t('questionBank.feedback.bankDeleted'))
      await loadBanks(keyword)
      if (isCompactLayout) {
        setMobileQuestionListOpen(false)
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('questionBank.feedback.deleteBankFailed'))
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!selectedBank) {
      return
    }
    try {
      await deleteQuestion(selectedBank.id, questionId)
      void message.success(t('questionBank.feedback.questionDeleted'))
      await loadQuestions(selectedBank.id)
      await loadBanks(keyword)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('questionBank.feedback.deleteQuestionFailed'))
    }
  }

  return (
    <div className="workspace-layout">
      <div className="interview-center question-bank-page">
        <div className="workspace-hub__hero">
          <div className="workspace-hub__copy">
            <Tag color="blue">{t('questionBank.tag')}</Tag>
            <h1>{t('questionBank.title')}</h1>
            <p>{t('questionBank.description')}</p>
          </div>
          <div className="workspace-hub__actions">
            <Link to="/app/interviews">
              <Button icon={<ArrowLeftOutlined />}>{t('questionBank.backToInterviews')}</Button>
            </Link>
            <Button icon={<PlusOutlined />} onClick={openCreateBank}>
              {t('questionBank.newBank')}
            </Button>
          </div>
        </div>

        {showBankFilter ? (
          <Card className="glass-card interview-filter-card question-bank-filter-card" bordered={false}>
            <Space className="question-bank-filter-card__content" wrap>
              <Input.Search
                allowClear
                className="question-bank-search"
                placeholder={t('questionBank.searchPlaceholder')}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onSearch={(value) => {
                  setMobileQuestionListOpen(false)
                  void loadBanks(value)
                }}
              />
            </Space>
          </Card>
        ) : null}

        <div className={`question-bank-layout${mobileQuestionListOpen ? ' question-bank-layout--mobile-detail' : ' question-bank-layout--mobile-list'}`}>
          {showBankList ? (
            <Card className="glass-card question-bank-list" bordered={false}>
              {loadingBanks ? (
                <div className="workspace-loading-state"><Spin /></div>
              ) : banks.length === 0 ? (
                <Empty description={t('questionBank.emptyBanks')} />
              ) : (
                banks.map((bank) => (
                  <button
                    className={`question-bank-list__item${bank.id === selectedBank?.id ? ' is-active' : ''}`}
                    key={bank.id}
                    type="button"
                    onClick={() => handleSelectBank(bank.id)}
                  >
                    <strong>{bank.name}</strong>
                    <span>{bank.description || t('questionBank.noDescription')}</span>
                    <span className="question-bank-list__tags">
                      {bank.tags.map((tag) => <Tag key={`${bank.id}-${tag}`}>{tag}</Tag>)}
                    </span>
                  </button>
                ))
              )}
            </Card>
          ) : null}

          {showQuestionDetail ? (
            <Card
              className="glass-card question-bank-detail"
              bordered={false}
              title={selectedBank?.name ?? t('questionBank.questionsTitle')}
              extra={selectedBank ? (
                <Space className="question-bank-detail__actions" wrap>
                  {isCompactLayout ? (
                    <Button icon={<ArrowLeftOutlined />} onClick={handleBackToBanks}>
                      {t('questionBank.backToBanks')}
                    </Button>
                  ) : null}
                  <Button icon={<EditOutlined />} onClick={() => openEditBank(selectedBank)}>
                    {t('questionBank.editBank')}
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={openCreateQuestion}>
                    {t('questionBank.newQuestion')}
                  </Button>
                  <Popconfirm
                    title={t('questionBank.deleteBankConfirm')}
                    okText={t('questionBank.deleteOk')}
                    cancelText={t('common:actions.cancel')}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void handleDeleteBank(selectedBank.id)}
                  >
                    <Button danger icon={<DeleteOutlined />}>{t('questionBank.delete')}</Button>
                  </Popconfirm>
                </Space>
              ) : null}
            >
              {!selectedBank ? (
                <Empty description={t('questionBank.emptySelection')} />
              ) : loadingQuestions ? (
                <div className="workspace-loading-state"><Spin /></div>
              ) : questions.length === 0 ? (
                <Empty description={t('questionBank.emptyQuestions')} />
              ) : (
                <div className="question-card-grid">
                  {questions.map((question) => (
                    <div className="question-card" key={question.id}>
                      <div className="question-card__head">
                        <Tag color="orange">{t(`difficulty.${question.difficulty.toLowerCase()}`)}</Tag>
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEditQuestion(question)} />
                          <Popconfirm
                            title={t('questionBank.deleteQuestionConfirm')}
                            okText={t('questionBank.deleteOk')}
                            cancelText={t('common:actions.cancel')}
                            okButtonProps={{ danger: true }}
                            onConfirm={() => void handleDeleteQuestion(question.id)}
                          >
                            <Button danger size="small" icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                      <strong>{question.question}</strong>
                      <div className="question-card__tags">
                        {question.tags.map((tag) => <Tag key={`${question.id}-${tag}`}>{tag}</Tag>)}
                      </div>
                      {question.focusPoints ? <Text type="secondary">{question.focusPoints}</Text> : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </div>

        <ResponsiveModal
          title={editingBank ? t('questionBank.editBank') : t('questionBank.newBank')}
          open={bankModalOpen}
          width={INTERVIEW_MODAL_WIDTH}
          footer={null}
          onCancel={() => setBankModalOpen(false)}
          destroyOnHidden
        >
          <Form form={bankForm} layout="vertical" onFinish={(values) => void handleSaveBank(values)}>
            <Form.Item name="name" label={t('questionBank.bankName')} rules={[{ required: true, message: t('questionBank.bankNameRequired') }]}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="description" label={t('questionBank.bankDescription')}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="tags" label={t('questionBank.bankTags')} rules={[{ required: true, message: t('questionBank.bankTagsRequired') }]}>
              <Select mode="tags" placeholder={t('questionBank.bankTagsPlaceholder')} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={savingBank}>{t('common:actions.save')}</Button>
              <Button onClick={() => setBankModalOpen(false)}>{t('common:actions.cancel')}</Button>
            </Space>
          </Form>
        </ResponsiveModal>

        <ResponsiveModal
          title={editingQuestion ? t('questionBank.editQuestion') : t('questionBank.newQuestion')}
          open={questionModalOpen}
          width={INTERVIEW_MODAL_WIDTH}
          footer={null}
          onCancel={() => setQuestionModalOpen(false)}
          destroyOnHidden
        >
          <Form form={questionForm} layout="vertical" onFinish={(values) => void handleSaveQuestion(values)}>
            <Form.Item name="question" label={t('questionBank.questionContent')} rules={[{ required: true, message: t('questionBank.questionRequired') }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item name="difficulty" label={t('create.difficultyLabel')} rules={[{ required: true, message: t('create.difficultyRequired') }]}>
              <Select options={getInterviewDifficultyOptions(t)} />
            </Form.Item>
            <Form.Item name="tags" label={t('questionBank.questionTags')} rules={[{ required: true, message: t('questionBank.questionTagsRequired') }]}>
              <Select mode="multiple" options={tagOptions} placeholder={t('questionBank.questionTagsPlaceholder')} />
            </Form.Item>
            <Form.Item name="focusPoints" label={t('questionBank.focusPoints')}>
              <Input.TextArea rows={3} placeholder={t('questionBank.focusPointsPlaceholder')} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={savingQuestion}>{t('common:actions.save')}</Button>
              <Button onClick={() => setQuestionModalOpen(false)}>{t('common:actions.cancel')}</Button>
            </Space>
          </Form>
        </ResponsiveModal>
      </div>
    </div>
  )
}
