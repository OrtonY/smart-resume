import { LockOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Segmented, Space, Tag, Tooltip, message } from 'antd'
import { useMemo, useState } from 'react'
import { login, register } from '../features/system/api/systemApi'
import type { AccessTokenResponse, BootstrapStatus } from '../features/system/types'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  bootstrapStatus: BootstrapStatus
  onAuthenticated: (result: AccessTokenResponse) => Promise<void>
}

interface AuthFormValues {
  username: string
  password: string
  confirmPassword?: string
}

export function AuthPage({ bootstrapStatus, onAuthenticated }: AuthPageProps) {
  const [form] = Form.useForm<AuthFormValues>()
  const [messageApi, contextHolder] = message.useMessage()
  const [mode, setMode] = useState<AuthMode>('login')
  const [submitting, setSubmitting] = useState(false)

  const canRegister = !bootstrapStatus.hasUsers || bootstrapStatus.registrationEnabled
  const activeMode: AuthMode = mode === 'register' && canRegister ? 'register' : 'login'
  const modeOptions = useMemo<Array<{ label: string; value: AuthMode }>>(() => {
    const options: Array<{ label: string; value: AuthMode }> = [{ label: '登录', value: 'login' }]
    if (canRegister) {
      options.push({
        label: bootstrapStatus.hasUsers ? '注册' : '创建管理员',
        value: 'register',
      })
    }
    return options
  }, [bootstrapStatus.hasUsers, canRegister])

  async function handleFinish(values: AuthFormValues) {
    setSubmitting(true)
    try {
      const payload = {
        username: values.username.trim(),
        password: values.password,
      }
      const result = activeMode === 'register' ? await register(payload) : await login(payload)
      await onAuthenticated(result)
      void messageApi.success(activeMode === 'register' ? '注册成功' : '登录成功')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '认证失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={'full-page-center'}>
      {contextHolder}
      <Card className={'auth-card'} bordered={false}>
        <Space direction={'vertical'} size={20} style={{ width: '100%' }}>
          <div className={'auth-header-row'}>
            <div>
              <div className={'auth-kicker'}>{'账号访问'}</div>
              <h1 className={'auth-title'}>{'登录 Smart Resume'}</h1>
              <p className={'auth-subtitle'}>{'多用户模式下，每个账号的数据独立保存。'}</p>
            </div>
            <Tooltip
              title={(
                <div>
                  <div>{'1.原工作区密码迁移至admin用户下'}</div>
                  <div>{'2.默认用户名密码admin/admin123，登录后请及时修改'}</div>
                </div>
              )}
            >
              <button type={'button'} className={'auth-help-trigger'} aria-label={'登录帮助'}>
                <QuestionCircleOutlined />
              </button>
            </Tooltip>
          </div>

          <Space size={[8, 8]} wrap>
            <Tag color={bootstrapStatus.registrationEnabled ? 'green' : 'default'}>
              {bootstrapStatus.registrationEnabled ? '注册已开启' : '注册已关闭'}
            </Tag>
          </Space>

          {modeOptions.length > 1 ? (
            <Segmented<AuthMode>
              block
              className={'auth-segmented'}
              options={modeOptions}
              value={activeMode}
              onChange={(value) => {
                setMode(value)
                form.resetFields(['password', 'confirmPassword'])
              }}
            />
          ) : null}

          {!canRegister && bootstrapStatus.hasUsers ? (
            <Alert
              type={'info'}
              showIcon
              message={'当前未开放自助注册'}
              description={'请使用已有账号登录，或联系管理员开启注册。'}
            />
          ) : null}

          <Form form={form} layout={'vertical'} onFinish={(values) => void handleFinish(values)}>
            <Form.Item
              label={'用户名'}
              name={'username'}
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少 3 位' },
                { max: 80, message: '用户名不能超过 80 位' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder={'请输入用户名'} size={'large'} autoComplete={'username'} />
            </Form.Item>

            <Form.Item
              label={'密码'}
              name={'password'}
              rules={[
                { required: true, message: '请输入密码' },
                ...(activeMode === 'register' ? [{ min: 6, message: '密码至少 6 位' }] : []),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={activeMode === 'register' ? '请设置密码' : '请输入密码'}
                size={'large'}
                autoComplete={activeMode === 'register' ? 'new-password' : 'current-password'}
              />
            </Form.Item>

            {activeMode === 'register' ? (
              <Form.Item
                label={'确认密码'}
                name={'confirmPassword'}
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value === getFieldValue('password')) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={'请再次输入密码'}
                  size={'large'}
                  autoComplete={'new-password'}
                />
              </Form.Item>
            ) : null}

            <Button type={'primary'} htmlType={'submit'} size={'large'} block loading={submitting}>
              {activeMode === 'register' ? '注册账号' : '登录'}
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  )
}
