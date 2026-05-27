import { KeyOutlined, SettingOutlined } from '@ant-design/icons'
import { App, Button, Form, Input, Space, Switch, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '../../../components/shared/ResponsiveModal'
import { changePassword } from '../api/systemApi'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants'
import type { RegistrationSettingsResponse, SessionUser } from '../types'

const { Text } = Typography

interface PasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

interface WorkspaceSessionCardProps {
  currentUser: SessionUser
  registrationEnabled: boolean
  onRegistrationEnabledChange: (enabled: boolean) => Promise<RegistrationSettingsResponse>
  onLogout: () => void
}

export function WorkspaceSessionCard({
  currentUser,
  registrationEnabled,
  onRegistrationEnabledChange,
  onLogout,
}: WorkspaceSessionCardProps) {
  const { message } = App.useApp()
  const { t } = useTranslation('system')
  const [open, setOpen] = useState(false)
  const [passwordForm] = Form.useForm<PasswordFormValues>()
  const [updatingRegistration, setUpdatingRegistration] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  async function handleRegistrationToggle(nextEnabled: boolean) {
    setUpdatingRegistration(true)
    try {
      const result = await onRegistrationEnabledChange(nextEnabled)
      void message.success(result.registrationEnabled ? t('session.registration.enabled') : t('session.registration.disabled'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('session.registration.updateFailed'))
    } finally {
      setUpdatingRegistration(false)
    }
  }

  async function handleChangePassword(values: PasswordFormValues) {
    setChangingPassword(true)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setOpen(false)
      passwordForm.resetFields()
      void message.success(t('session.password.success'))
      onLogout()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('session.password.failed'))
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
        {t('session.openButton')}
      </Button>

      <ResponsiveModal
        title={t('session.modalTitle')}
        open={open}
        onCancel={() => {
          setOpen(false)
          passwordForm.resetFields()
        }}
        footer={null}
        destroyOnHidden
      >
        <Space direction={'vertical'} size={20} style={{ width: '100%' }}>
          {currentUser.admin ? (
            <div className={'workspace-session-card__setting-row'}>
              <div>
                <Text strong>{t('session.registration.label')}</Text>
                <div>
                  <Text type={'secondary'}>{t('session.registration.description')}</Text>
                </div>
              </div>
              <Switch
                checked={registrationEnabled}
                checkedChildren={t('session.registration.on')}
                unCheckedChildren={t('session.registration.off')}
                loading={updatingRegistration}
                onChange={(checked) => {
                  void handleRegistrationToggle(checked)
                }}
              />
            </div>
          ) : null}

          <div>
            <Space align={'center'} size={8} style={{ marginBottom: 12 }}>
              <KeyOutlined />
              <Text strong>{t('session.password.title')}</Text>
            </Space>
            <Form form={passwordForm} layout={'vertical'} onFinish={(values) => void handleChangePassword(values)}>
              <Form.Item
                name={'currentPassword'}
                label={t('session.password.currentLabel')}
                rules={[{ required: true, message: t('session.password.currentRequired') }]}
              >
                <Input.Password autoComplete={'current-password'} placeholder={t('session.password.currentPlaceholder')} />
              </Form.Item>

              <Form.Item
                name={'newPassword'}
                label={t('session.password.newLabel')}
                rules={[
                  { required: true, message: t('session.password.newRequired') },
                  { min: PASSWORD_MIN_LENGTH, message: t('session.password.newMin') },
                  { max: PASSWORD_MAX_LENGTH, message: t('session.password.newMax') },
                ]}
              >
                <Input.Password autoComplete={'new-password'} placeholder={t('session.password.newPlaceholder')} />
              </Form.Item>

              <Form.Item
                name={'confirmNewPassword'}
                label={t('session.password.confirmLabel')}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('session.password.confirmRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value === getFieldValue('newPassword')) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error(t('session.password.mismatch')))
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete={'new-password'} placeholder={t('session.password.confirmPlaceholder')} />
              </Form.Item>

              <Button type={'primary'} htmlType={'submit'} block loading={changingPassword}>
                {t('session.password.submit')}
              </Button>
            </Form>
          </div>
        </Space>
      </ResponsiveModal>
    </>
  )
}
