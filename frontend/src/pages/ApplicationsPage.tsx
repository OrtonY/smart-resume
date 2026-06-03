import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import {
  App,
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from '../features/application/api/applicationApi'
import { DEFAULT_CHANNELS } from '../features/application/constants/channels'
import type {
  ApplicationStatus,
  JobApplication,
  JobApplicationCreatePayload,
  JobApplicationPage,
} from '../features/application/types'
import { listResumes } from '../features/resume/api/resumeApi'
import type { ResumeSummary } from '../features/resume/types'
import { DEFAULT_PAGE_SIZE } from '../lib/http/pageDefaults'

const { Text } = Typography

const STATUS_OPTIONS: ApplicationStatus[] = ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn']

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: 'blue',
  interviewing: 'gold',
  offered: 'green',
  rejected: 'red',
  withdrawn: 'default',
}

interface FormValues {
  company: string
  position: string
  status: ApplicationStatus
  channel?: string
  resumeId?: string
  appliedAt?: Dayjs
  notes?: string
}

export function ApplicationsPage() {
  const { t } = useTranslation('application')
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const [pageData, setPageData] = useState<JobApplicationPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [keyword, setKeyword] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<JobApplication | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const channelOptions = useMemo(
    () => DEFAULT_CHANNELS.map((channel) => ({ value: channel })),
    [],
  )
  const resumeOptions = useMemo(
    () => resumes.map((resume) => ({ value: resume.id, label: resume.title })),
    [resumes],
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listApplications({
        status: statusFilter,
        keyword: keyword || undefined,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
      })
      setPageData(result)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [keyword, message, page, statusFilter, t])

  const loadResumes = useCallback(async () => {
    try {
      const result = await listResumes(false, 1, 100)
      setResumes(result.items)
    } catch {
      // resumes are optional for the page; ignore
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadList()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadList])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadResumes()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadResumes])

  function openCreateModal() {
    setEditing(null)
    setModalMode('create')
    form.resetFields()
    form.setFieldsValue({
      status: 'applied',
      appliedAt: dayjs(),
    })
    setModalOpen(true)
  }

  function openEditModal(record: JobApplication) {
    setEditing(record)
    setModalMode('edit')
    form.setFieldsValue({
      company: record.company,
      position: record.position,
      status: record.status,
      channel: record.channel ?? undefined,
      resumeId: record.resumeId ?? undefined,
      appliedAt: record.appliedAt ? dayjs(record.appliedAt) : undefined,
      notes: record.notes ?? undefined,
    })
    setModalOpen(true)
  }

  function openViewModal(record: JobApplication) {
    setEditing(record)
    setModalMode('view')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function handleModalAfterClose() {
    setEditing(null)
    form.resetFields()
  }

  const modalTitle =
    modalMode === 'view'
      ? t('modal.viewTitle')
      : modalMode === 'edit'
        ? t('modal.editTitle')
        : t('modal.createTitle')

  async function handleSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload: JobApplicationCreatePayload = {
        company: values.company.trim(),
        position: values.position.trim(),
        status: values.status,
        channel: values.channel?.trim() || null,
        resumeId: values.resumeId || null,
        appliedAt: values.appliedAt ? values.appliedAt.toISOString() : null,
        notes: values.notes?.trim() || null,
      }

      if (editing) {
        await updateApplication(editing.id, payload)
        void message.success(t('feedback.updateSuccess'))
      } else {
        await createApplication(payload)
        void message.success(t('feedback.createSuccess'))
      }

      closeModal()
      void loadList()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteApplication(id)
      void message.success(t('feedback.deleteSuccess'))
      if (pageData && pageData.items.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        void loadList()
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('feedback.deleteFailed'))
    }
  }

  const columns: ColumnsType<JobApplication> = [
    {
      title: t('table.company'),
      dataIndex: 'company',
      key: 'company',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('table.position'),
      dataIndex: 'position',
      key: 'position',
      width: 160,
      ellipsis: true,
    },
    {
      title: t('table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: ApplicationStatus) => (
        <Tag color={STATUS_COLORS[status]}>{t(`status.${status}`)}</Tag>
      ),
    },
    {
      title: t('table.channel'),
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
      ellipsis: true,
      render: (value: string | null) => value ?? <Text type="secondary">—</Text>,
    },
    {
      title: t('table.resume'),
      dataIndex: 'resumeTitle',
      key: 'resumeTitle',
      width: 160,
      ellipsis: true,
      render: (value: string | null) => value ?? <Text type="secondary">—</Text>,
    },
    {
      title: t('table.appliedAt'),
      dataIndex: 'appliedAt',
      key: 'appliedAt',
      width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('table.actions'),
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openViewModal(record)}
          >
            {t('actions.view')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            {t('actions.edit')}
          </Button>
          <Popconfirm
            title={t('confirm.deleteTitle')}
            description={t('confirm.deleteDescription')}
            onConfirm={() => void handleDelete(record.id)}
            okText={t('confirm.ok')}
            cancelText={t('confirm.cancel')}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {t('actions.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="workspace-layout">
      <div className="interview-center">
        <div className="workspace-hub__hero">
          <div className="workspace-hub__copy">
            <Tag color="purple">{t('hero.tag')}</Tag>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.description')}</p>
          </div>

          <div className="workspace-hub__actions">
            <Link to="/app">
              <Button icon={<ArrowLeftOutlined />}>{t('actions.backToHome')}</Button>
            </Link>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              {t('actions.create')}
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
              onSearch={(value) => {
                setPage(1)
                setKeyword(value.trim())
              }}
              style={{ width: 280 }}
            />
            <Select
              allowClear
              placeholder={t('filter.statusPlaceholder')}
              value={statusFilter}
              onChange={(value) => {
                setPage(1)
                setStatusFilter(value)
              }}
              options={STATUS_OPTIONS.map((status) => ({
                value: status,
                label: t(`status.${status}`),
              }))}
              style={{ width: 180 }}
            />
          </Space>
        </Card>

        <Card className="glass-card" bordered={false} style={{ marginTop: 16 }}>
          {isMobile ? (
            <div className="application-card-list">
              {loading && <div style={{ textAlign: 'center', padding: 24 }}>{t('table.loading')}</div>}
              {!loading && (pageData?.items ?? []).map((record) => (
                <div key={record.id} className="application-card-item">
                  <div className="application-card-item__header">
                    <div className="application-card-item__title">
                      <Text strong ellipsis>{record.company}</Text>
                      <Text type="secondary" ellipsis style={{ fontSize: 13 }}>{record.position}</Text>
                    </div>
                    <Tag color={STATUS_COLORS[record.status]}>{t(`status.${record.status}`)}</Tag>
                  </div>
                  <div className="application-card-item__meta">
                    {record.channel && <Text type="secondary" style={{ fontSize: 12 }}>{record.channel}</Text>}
                    {record.appliedAt && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(record.appliedAt).format('YYYY-MM-DD')}
                      </Text>
                    )}
                  </div>
                  <div className="application-card-item__actions">
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => openViewModal(record)}
                    >
                      {t('actions.view')}
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(record)}
                    >
                      {t('actions.edit')}
                    </Button>
                    <Popconfirm
                      title={t('confirm.deleteTitle')}
                      description={t('confirm.deleteDescription')}
                      onConfirm={() => void handleDelete(record.id)}
                      okText={t('confirm.ok')}
                      cancelText={t('confirm.cancel')}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                        {t('actions.delete')}
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
              {!loading && (pageData?.items ?? []).length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                  {t('table.empty')}
                </div>
              )}
            </div>
          ) : (
            <Table<JobApplication>
              rowKey="id"
              columns={columns}
              dataSource={pageData?.items ?? []}
              loading={loading}
              pagination={false}
              scroll={{ x: 900 }}
              size="middle"
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Pagination
              current={page}
              pageSize={DEFAULT_PAGE_SIZE}
              total={pageData?.total ?? 0}
              onChange={(next) => setPage(next)}
              showSizeChanger={false}
            />
          </div>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        title={modalTitle}
        onCancel={closeModal}
        afterClose={handleModalAfterClose}
        onOk={modalMode === 'view' ? closeModal : () => form.submit()}
        confirmLoading={submitting}
        okText={modalMode === 'view' ? t('modal.close') : t('modal.ok')}
        cancelText={t('modal.cancel')}
        cancelButtonProps={modalMode === 'view' ? { style: { display: 'none' } } : undefined}
        forceRender
        width={isMobile ? '100%' : 620}
        style={isMobile ? { top: 12, maxWidth: '100vw', paddingBottom: 0 } : undefined}
        styles={{
          body: {
            maxHeight: isMobile ? 'calc(100vh - 180px)' : 'calc(100vh - 220px)',
            overflowY: 'auto',
          },
        }}
      >
        {modalMode === 'view' && editing ? (
          <Descriptions
            column={1}
            size="small"
            colon={false}
            labelStyle={{ width: 88, color: 'rgba(0,0,0,0.55)' }}
          >
            <Descriptions.Item label={t('form.company')}>{editing.company}</Descriptions.Item>
            <Descriptions.Item label={t('form.position')}>{editing.position}</Descriptions.Item>
            <Descriptions.Item label={t('form.status')}>
              <Tag color={STATUS_COLORS[editing.status]}>{t(`status.${editing.status}`)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('form.channel')}>
              {editing.channel ?? <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label={t('form.resume')}>
              {editing.resumeTitle ?? <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label={t('form.appliedAt')}>
              {editing.appliedAt
                ? dayjs(editing.appliedAt).format('YYYY-MM-DD HH:mm')
                : <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label={t('form.notes')}>
              {editing.notes
                ? <span style={{ whiteSpace: 'pre-wrap' }}>{editing.notes}</span>
                : <Text type="secondary">—</Text>}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => void handleSubmit(values)}
          >
            <Form.Item
              name="company"
              label={t('form.company')}
              rules={[{ required: true, message: t('form.companyRequired') }]}
            >
              <Input maxLength={255} placeholder={t('form.companyPlaceholder')} />
            </Form.Item>
            <Form.Item
              name="position"
              label={t('form.position')}
              rules={[{ required: true, message: t('form.positionRequired') }]}
            >
              <Input maxLength={255} placeholder={t('form.positionPlaceholder')} />
            </Form.Item>
            <Form.Item
              name="status"
              label={t('form.status')}
              rules={[{ required: true, message: t('form.statusRequired') }]}
            >
              <Select
                options={STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label: t(`status.${status}`),
                }))}
              />
            </Form.Item>
            <Form.Item name="channel" label={t('form.channel')}>
              <AutoComplete
                options={channelOptions}
                placeholder={t('form.channelPlaceholder')}
                filterOption={(input, option) =>
                  (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                }
                allowClear
              />
            </Form.Item>
            <Form.Item name="resumeId" label={t('form.resume')}>
              <Select
                allowClear
                options={resumeOptions}
                placeholder={t('form.resumePlaceholder')}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item name="appliedAt" label={t('form.appliedAt')}>
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                placeholder={t('form.appliedAtPlaceholder')}
              />
            </Form.Item>
            <Form.Item name="notes" label={t('form.notes')}>
              <Input.TextArea rows={3} maxLength={2000} placeholder={t('form.notesPlaceholder')} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
