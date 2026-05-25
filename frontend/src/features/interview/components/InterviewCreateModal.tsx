import { PlayCircleOutlined } from '@ant-design/icons'
import { Button, Form, Input, Select, Space, Tag } from 'antd'
import type { FormInstance } from 'antd'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { InterviewerRoleSorter } from './InterviewerRoleSorter'
import { getInterviewDifficultyOptions, INTERVIEWER_ROLE_OPTIONS } from '../types'
import type { ResumeSummary } from '../../resume/types'
import type { CreateFormValues } from '../interviewPageUtils'

interface InterviewCreateModalProps {
  creating: boolean
  filterResumeId?: string
  form: FormInstance<CreateFormValues>
  open: boolean
  resumes: ResumeSummary[]
  selectedInterviewerRoles: string[]
  onCancel: () => void
  onSubmit: (values: CreateFormValues) => void
}

export function InterviewCreateModal({
  creating,
  filterResumeId,
  form,
  open,
  resumes,
  selectedInterviewerRoles,
  onCancel,
  onSubmit,
}: InterviewCreateModalProps) {
  const { t } = useTranslation('interview')
  const resumeOptions = resumes.map((resume) => ({ value: resume.id, label: resume.title }))

  return (
    <ResponsiveModal
      title={t('create.title')}
      open={open}
      centered
      width={720}
      className="interview-create-modal"
      footer={null}
      onCancel={onCancel}
      destroyOnHidden
    >
      <div className="interview-create-modal__body">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ difficulty: 'MEDIUM', resumeId: filterResumeId, interviewerRoles: [] }}
          onFinish={(values) => void onSubmit(values)}
        >
          <Form.Item
            name="resumeId"
            label={t('create.resumeLabel')}
            rules={[
              {
                validator: (_, value) => {
                  if (value || form.getFieldValue('jobDescription')?.trim()) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('create.resumeOrJdRequired')))
                },
              },
            ]}
          >
            <Select allowClear placeholder={t('create.resumePlaceholder')} options={resumeOptions} />
          </Form.Item>

          <Form.Item name="title" label={t('create.titleLabel')} rules={[{ required: true, message: t('create.titleRequired') }]}>
            <Input maxLength={200} placeholder={t('create.titlePlaceholder')} />
          </Form.Item>

          <Form.Item name="targetCompany" label={t('create.companyLabel')} extra={t('create.companyExtra')}>
            <Input maxLength={200} placeholder={t('create.companyPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="jobDescription"
            label={t('create.jdLabel')}
            rules={[
              {
                validator: (_, value) => {
                  if (value?.trim() || form.getFieldValue('resumeId')) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('create.resumeOrJdRequired')))
                },
              },
            ]}
          >
            <Input.TextArea rows={8} placeholder={t('create.jdPlaceholder')} />
          </Form.Item>

          <Form.Item name="difficulty" label={t('create.difficultyLabel')} rules={[{ required: true, message: t('create.difficultyRequired') }]}>
            <Select options={getInterviewDifficultyOptions(t)} />
          </Form.Item>

          <Form.Item
            name="interviewerRoles"
            label={t('create.rolesLabel')}
            rules={[{ required: true, message: t('create.rolesRequired') }]}
          >
            <Select
              mode="tags"
              placeholder={t('create.rolesPlaceholder')}
              options={INTERVIEWER_ROLE_OPTIONS.map((role) => ({ value: role, label: role }))}
            />
          </Form.Item>

          <div className="interview-create-modal__tips">
            <Tag color="blue">{t('create.tipDragSort')}</Tag>
            <Tag color="default">{t('create.tipFirstRole')}</Tag>
            <Tag color="gold">{t('create.tipMixRoles')}</Tag>
          </div>

          <InterviewerRoleSorter
            roles={selectedInterviewerRoles}
            onChange={(roles) => form.setFieldValue('interviewerRoles', roles)}
          />

          <Space style={{ marginTop: 20 }}>
            <Button type="primary" htmlType="submit" loading={creating} icon={<PlayCircleOutlined />}>
              {t('create.startInterview')}
            </Button>
            <Button onClick={onCancel}>{t('common:actions.cancel')}</Button>
          </Space>
        </Form>
      </div>
    </ResponsiveModal>
  )
}
