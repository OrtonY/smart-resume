import { KeyOutlined, SettingOutlined } from '@ant-design/icons'
import { App, Button, Form, Input, Modal, Space, Switch, Typography } from 'antd'
import { useState } from 'react'
import { changePassword } from '../api/systemApi'
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
  const [open, setOpen] = useState(false)
  const [passwordForm] = Form.useForm<PasswordFormValues>()
  const [updatingRegistration, setUpdatingRegistration] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  async function handleRegistrationToggle(nextEnabled: boolean) {
    setUpdatingRegistration(true)
    try {
      const result = await onRegistrationEnabledChange(nextEnabled)
      void message.success(result.registrationEnabled ? '已开启注册' : '已关闭注册')
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '注册开关更新失败')
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
      void message.success('密码修改成功，请重新登录')
      onLogout()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '修改密码失败')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
        {'系统设置'}
      </Button>

      <Modal
        title={'系统设置'}
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
                <Text strong>{'注册开关'}</Text>
                <div>
                  <Text type={'secondary'}>{'控制新用户是否可以在登录页自助注册'}</Text>
                </div>
              </div>
              <Switch
                checked={registrationEnabled}
                checkedChildren={'开'}
                unCheckedChildren={'关'}
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
              <Text strong>{'修改密码'}</Text>
            </Space>
            <Form form={passwordForm} layout={'vertical'} onFinish={(values) => void handleChangePassword(values)}>
              <Form.Item
                name={'currentPassword'}
                label={'当前密码'}
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password autoComplete={'current-password'} placeholder={'请输入当前密码'} />
              </Form.Item>

              <Form.Item
                name={'newPassword'}
                label={'新密码'}
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '新密码至少 6 位' },
                  { max: 64, message: '新密码不能超过 64 位' },
                ]}
              >
                <Input.Password autoComplete={'new-password'} placeholder={'请输入新密码'} />
              </Form.Item>

              <Form.Item
                name={'confirmNewPassword'}
                label={'确认新密码'}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请再次输入新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value === getFieldValue('newPassword')) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的新密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete={'new-password'} placeholder={'请再次输入新密码'} />
              </Form.Item>

              <Button type={'primary'} htmlType={'submit'} block loading={changingPassword}>
                {'保存新密码'}
              </Button>
            </Form>
          </div>
        </Space>
      </Modal>
    </>
  )
}
