import {
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { App, Button, Empty, Form, Input, Popconfirm, Radio, Select, Space, Spin, Tabs, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { listApplications } from '../../application/api/applicationApi'
import type { JobApplication } from '../../application/types'
import type { ResumeDetail } from '../../resume/types'
import { copyToClipboard } from '../../../lib/copyToClipboard'
import {
  deleteAiCoverLetter,
  getAiCoverLetter,
  listAiCoverLetters,
  updateAiCoverLetter,
} from '../api/aiApi'
import type {
  AiCoverLetter,
  AiCoverLetterGenerateRequest,
  AiCoverLetterOutputLanguage,
} from '../types'

const { Paragraph, Text } = Typography
const COVER_LETTER_APPLICATION_PAGE_SIZE = 100

interface CoverLetterModalProps {
  draft: ResumeDetail
  open: boolean
  onClose: () => void
  onGenerate: (payload: AiCoverLetterGenerateRequest) => Promise<AiCoverLetter>
}

interface CoverLetterGenerateFormValues {
  applicationId?: string
  company: string
  position: string
  jobDescription?: string
  extraNotes?: string
  outputLanguage: AiCoverLetterOutputLanguage
}

type CoverLetterTabKey = 'generate' | 'history'

export function CoverLetterModal({ draft, open, onClose, onGenerate }: CoverLetterModalProps) {
  const { t, i18n } = useTranslation('workspace')
  const { message } = App.useApp()
  const [form] = Form.useForm<CoverLetterGenerateFormValues>()
  const [activeTab, setActiveTab] = useState<CoverLetterTabKey>('generate')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [coverLetters, setCoverLetters] = useState<AiCoverLetter[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedLetter, setSelectedLetter] = useState<AiCoverLetter | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [savingDetail, setSavingDetail] = useState(false)
  const [deletingDetail, setDeletingDetail] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')

  const defaultLanguage = useMemo<AiCoverLetterOutputLanguage>(
    () => (i18n.language.toLowerCase().startsWith('zh') ? 'CHINESE' : 'ENGLISH'),
    [i18n.language],
  )

  const loadHistory = useCallback(async (preferredId?: string) => {
    setLoadingHistory(true)
    try {
      const items = await listAiCoverLetters(draft.id)
      setCoverLetters(items)
      const nextSelected = preferredId
        ? items.find((item) => item.id === preferredId) ?? null
        : items[0] ?? null
      setSelectedLetter(nextSelected)
      setEditTitle(nextSelected?.title ?? '')
      setEditBody(nextSelected?.body ?? '')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('editor.coverLetter.feedback.loadFailed'))
    } finally {
      setLoadingHistory(false)
    }
  }, [draft.id, message, t])

  useEffect(() => {
    if (!open) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActiveTab('generate')
      form.resetFields()
      form.setFieldsValue({ outputLanguage: defaultLanguage })
      void loadHistory()

      setLoadingApplications(true)
      listApplications({ page: 1, pageSize: COVER_LETTER_APPLICATION_PAGE_SIZE })
        .then((page) => setApplications(page.items))
        .catch((error: unknown) => {
          void message.error(error instanceof Error ? error.message : t('editor.coverLetter.feedback.loadApplicationsFailed'))
        })
        .finally(() => setLoadingApplications(false))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [defaultLanguage, form, loadHistory, message, open, t])

  const applicationOptions = useMemo(
    () => applications.map((application) => ({
      value: application.id,
      label: `${application.company} / ${application.position}`,
    })),
    [applications],
  )

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedLetter?.applicationId) ?? null,
    [applications, selectedLetter?.applicationId],
  )

  const handleApplicationChange = useCallback((applicationId?: string) => {
    const application = applications.find((item) => item.id === applicationId)
    if (!application) {
      return
    }

    const currentNotes = form.getFieldValue('extraNotes')
    form.setFieldsValue({
      company: application.company,
      position: application.position,
      extraNotes: currentNotes || application.notes || undefined,
    })
  }, [applications, form])

  const handleGenerate = useCallback(async (values: CoverLetterGenerateFormValues) => {
    const payload: AiCoverLetterGenerateRequest = {
      outputLanguage: values.outputLanguage,
      company: values.company.trim(),
      position: values.position.trim(),
    }
    if (values.applicationId) payload.applicationId = values.applicationId
    if (values.jobDescription?.trim()) payload.jobDescription = values.jobDescription.trim()
    if (values.extraNotes?.trim()) payload.extraNotes = values.extraNotes.trim()

    setGenerating(true)
    try {
      const generated = await onGenerate(payload)
      setSelectedLetter(generated)
      setEditTitle(generated.title)
      setEditBody(generated.body)
      setActiveTab('history')
      await loadHistory(generated.id)
      void message.success(t('editor.coverLetter.feedback.generated'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('editor.coverLetter.feedback.generateFailed'))
    } finally {
      setGenerating(false)
    }
  }, [loadHistory, message, onGenerate, t])

  const handleSelectLetter = useCallback(async (letter: AiCoverLetter) => {
    setSelectedLetter(letter)
    setEditTitle(letter.title)
    setEditBody(letter.body)
    setLoadingDetail(true)
    try {
      const detail = await getAiCoverLetter(draft.id, letter.id)
      setSelectedLetter(detail)
      setEditTitle(detail.title)
      setEditBody(detail.body)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('editor.coverLetter.feedback.loadDetailFailed'))
    } finally {
      setLoadingDetail(false)
    }
  }, [draft.id, message, t])

  const handleSaveDetail = useCallback(async () => {
    if (!selectedLetter) {
      return
    }
    const title = editTitle.trim()
    const body = editBody.trim()
    if (!title) {
      void message.warning(t('editor.coverLetter.feedback.titleRequired'))
      return
    }
    if (!body) {
      void message.warning(t('editor.coverLetter.feedback.bodyRequired'))
      return
    }

    setSavingDetail(true)
    try {
      const updated = await updateAiCoverLetter(draft.id, selectedLetter.id, { title, body })
      setSelectedLetter(updated)
      setEditTitle(updated.title)
      setEditBody(updated.body)
      await loadHistory(updated.id)
      void message.success(t('editor.coverLetter.feedback.saved'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('editor.coverLetter.feedback.saveFailed'))
    } finally {
      setSavingDetail(false)
    }
  }, [draft.id, editBody, editTitle, loadHistory, message, selectedLetter, t])

  const handleCopyDetail = useCallback(async () => {
    if (!editBody.trim()) {
      return
    }
    const copied = await copyToClipboard(editBody)
    void message[copied ? 'success' : 'error'](
      copied ? t('editor.coverLetter.feedback.copied') : t('editor.coverLetter.feedback.copyFailed'),
    )
  }, [editBody, message, t])

  const handleDeleteDetail = useCallback(async () => {
    if (!selectedLetter) {
      return
    }

    setDeletingDetail(true)
    try {
      await deleteAiCoverLetter(draft.id, selectedLetter.id)
      setSelectedLetter(null)
      setEditTitle('')
      setEditBody('')
      await loadHistory()
      void message.success(t('editor.coverLetter.feedback.deleted'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('editor.coverLetter.feedback.deleteFailed'))
    } finally {
      setDeletingDetail(false)
    }
  }, [draft.id, loadHistory, message, selectedLetter, t])

  return (
    <ResponsiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={980}
      title={t('editor.coverLetter.title')}
      className="cover-letter-modal"
      mobileHeight="100dvh"
    >
      <div className="cover-letter-modal__content">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as CoverLetterTabKey)}
          items={[
            {
              key: 'generate',
              label: t('editor.coverLetter.tabs.generate'),
              children: (
                <div className="cover-letter-generate">
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ outputLanguage: defaultLanguage }}
                    onFinish={(values) => void handleGenerate(values)}
                  >
                    <Form.Item name="applicationId" label={t('editor.coverLetter.fields.application')}>
                      <Select
                        allowClear
                        showSearch
                        loading={loadingApplications}
                        placeholder={t('editor.coverLetter.placeholders.application')}
                        optionFilterProp="label"
                        options={applicationOptions}
                        onChange={handleApplicationChange}
                      />
                    </Form.Item>

                    <div className="cover-letter-generate__grid">
                      <Form.Item
                        name="company"
                        label={t('editor.coverLetter.fields.company')}
                        rules={[{ required: true, whitespace: true, message: t('editor.coverLetter.validation.companyRequired') }]}
                      >
                        <Input maxLength={120} placeholder={t('editor.coverLetter.placeholders.company')} />
                      </Form.Item>
                      <Form.Item
                        name="position"
                        label={t('editor.coverLetter.fields.position')}
                        rules={[{ required: true, whitespace: true, message: t('editor.coverLetter.validation.positionRequired') }]}
                      >
                        <Input maxLength={120} placeholder={t('editor.coverLetter.placeholders.position')} />
                      </Form.Item>
                    </div>

                    <Form.Item name="jobDescription" label={t('editor.coverLetter.fields.jobDescription')}>
                      <Input.TextArea
                        rows={6}
                        maxLength={8000}
                        showCount
                        placeholder={t('editor.coverLetter.placeholders.jobDescription')}
                      />
                    </Form.Item>

                    <Form.Item name="extraNotes" label={t('editor.coverLetter.fields.extraNotes')}>
                      <Input.TextArea
                        rows={4}
                        maxLength={2000}
                        showCount
                        placeholder={t('editor.coverLetter.placeholders.extraNotes')}
                      />
                    </Form.Item>

                    <div className="cover-letter-generate__footer">
                      <Form.Item
                        name="outputLanguage"
                        label={t('editor.coverLetter.fields.outputLanguage')}
                        rules={[{ required: true, message: t('editor.coverLetter.validation.languageRequired') }]}
                      >
                        <Radio.Group>
                          <Radio.Button value="CHINESE">{t('editor.coverLetter.languages.chinese')}</Radio.Button>
                          <Radio.Button value="ENGLISH">{t('editor.coverLetter.languages.english')}</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                      <Button type="primary" htmlType="submit" icon={<FileTextOutlined />} loading={generating}>
                        {t('editor.coverLetter.generate')}
                      </Button>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: 'history',
              label: t('editor.coverLetter.tabs.history'),
              children: (
                <div className="cover-letter-history">
                  <div className="cover-letter-history__list">
                    <div className="cover-letter-history__toolbar">
                      <Text strong>{t('editor.coverLetter.historyTitle')}</Text>
                      <Button size="small" icon={<ReloadOutlined />} loading={loadingHistory} onClick={() => void loadHistory(selectedLetter?.id)}>
                        {t('editor.coverLetter.refresh')}
                      </Button>
                    </div>
                    {loadingHistory ? (
                      <div className="cover-letter-history__loading">
                        <Spin />
                      </div>
                    ) : coverLetters.length === 0 ? (
                      <Empty description={t('editor.coverLetter.emptyHistory')} />
                    ) : (
                      <div className="cover-letter-history__items">
                        {coverLetters.map((letter) => (
                          <button
                            className={'cover-letter-history__item' + (selectedLetter?.id === letter.id ? ' cover-letter-history__item--active' : '')}
                            key={letter.id}
                            type="button"
                            onClick={() => void handleSelectLetter(letter)}
                          >
                            <Text strong>{letter.title}</Text>
                            <span>{letter.company} / {letter.position}</span>
                            <small>{formatDateTime(letter.updatedAt, i18n.language)}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="cover-letter-history__detail">
                    {loadingDetail ? (
                      <div className="cover-letter-history__loading">
                        <Spin />
                      </div>
                    ) : !selectedLetter ? (
                      <Empty description={t('editor.coverLetter.selectHistory')} />
                    ) : (
                      <>
                        <div className="cover-letter-history__meta">
                          <Space wrap>
                            <Tag color="blue">{selectedLetter.company}</Tag>
                            <Tag>{selectedLetter.position}</Tag>
                            <Tag color={selectedLetter.outputLanguage === 'CHINESE' ? 'red' : 'geekblue'}>
                              {selectedLetter.outputLanguage === 'CHINESE'
                                ? t('editor.coverLetter.languages.chinese')
                                : t('editor.coverLetter.languages.english')}
                            </Tag>
                            {selectedApplication ? <Tag color="green">{t('editor.coverLetter.linkedApplication')}</Tag> : null}
                          </Space>
                          <Text type="secondary">{formatDateTime(selectedLetter.updatedAt, i18n.language)}</Text>
                        </div>

                        <Input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          maxLength={160}
                          placeholder={t('editor.coverLetter.placeholders.title')}
                        />
                        <Input.TextArea
                          value={editBody}
                          onChange={(event) => setEditBody(event.target.value)}
                          rows={16}
                          placeholder={t('editor.coverLetter.placeholders.body')}
                          className="cover-letter-history__body"
                        />
                        <Paragraph type="secondary" className="cover-letter-history__hint">
                          {t('editor.coverLetter.editHint')}
                        </Paragraph>
                        <div className="cover-letter-history__actions">
                          <Space wrap>
                            <Button icon={<CopyOutlined />} onClick={() => void handleCopyDetail()}>
                              {t('editor.coverLetter.copy')}
                            </Button>
                            <Button type="primary" icon={<SaveOutlined />} loading={savingDetail} onClick={() => void handleSaveDetail()}>
                              {t('editor.coverLetter.save')}
                            </Button>
                          </Space>
                          <Popconfirm
                            title={t('editor.coverLetter.deleteConfirmTitle')}
                            description={t('editor.coverLetter.deleteConfirmDescription')}
                            okText={t('editor.coverLetter.deleteConfirmOk')}
                            cancelText={t('editor.coverLetter.cancel')}
                            onConfirm={() => void handleDeleteDetail()}
                          >
                            <Button danger icon={<DeleteOutlined />} loading={deletingDetail}>
                              {t('editor.coverLetter.delete')}
                            </Button>
                          </Popconfirm>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </ResponsiveModal>
  )
}

function formatDateTime(value: string, locale: string) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString(locale)
}
