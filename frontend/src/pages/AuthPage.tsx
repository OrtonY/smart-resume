import { LockOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Segmented, Space, Tag, Tooltip, message } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/shared/LanguageSwitcher'
import { login, register } from '../features/system/api/systemApi'
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../features/system/constants'
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
  const { t } = useTranslation('auth')
  const [form] = Form.useForm<AuthFormValues>()
  const [messageApi, contextHolder] = message.useMessage()
  const [mode, setMode] = useState<AuthMode>('login')
  const [submitting, setSubmitting] = useState(false)

  const canRegister = !bootstrapStatus.hasUsers || bootstrapStatus.registrationEnabled
  const activeMode: AuthMode = mode === 'register' && canRegister ? 'register' : 'login'
  const modeOptions = useMemo<Array<{ label: string; value: AuthMode }>>(() => {
    const options: Array<{ label: string; value: AuthMode }> = [{ label: t('mode.login'), value: 'login' }]
    if (canRegister) {
      options.push({
        label: bootstrapStatus.hasUsers ? t('mode.register') : t('mode.createAdmin'),
        value: 'register',
      })
    }
    return options
  }, [bootstrapStatus.hasUsers, canRegister, t])

  async function handleFinish(values: AuthFormValues) {
    setSubmitting(true)
    try {
      const payload = {
        username: values.username.trim(),
        password: values.password,
      }
      const result = activeMode === 'register' ? await register(payload) : await login(payload)
      await onAuthenticated(result)
      void messageApi.success(activeMode === 'register' ? t('feedback.registerSuccess') : t('feedback.loginSuccess'))
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : t('feedback.authFailed'))
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
              <div className={'auth-kicker'}>{t('page.kicker')}</div>
              <h1 className={'auth-title'}>{t('page.title')}</h1>
              <p className={'auth-subtitle'}>{t('page.subtitle')}</p>
            </div>
            <Tooltip
              title={(
                <div>
                  <div>{t('help.tipMigration')}</div>
                  <div>{t('help.tipDefault')}</div>
                </div>
              )}
            >
              <button type={'button'} className={'auth-help-trigger'} aria-label={t('help.trigger')}>
                <QuestionCircleOutlined />
              </button>
            </Tooltip>
            <LanguageSwitcher />
          </div>

          <Space size={[8, 8]} wrap>
            <Tag color={bootstrapStatus.registrationEnabled ? 'green' : 'default'}>
              {bootstrapStatus.registrationEnabled ? t('tag.registrationEnabled') : t('tag.registrationDisabled')}
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
              message={t('alert.registrationClosedTitle')}
              description={t('alert.registrationClosedDescription')}
            />
          ) : null}

          <Form form={form} layout={'vertical'} onFinish={(values) => void handleFinish(values)}>
            <Form.Item
              label={t('form.username')}
              name={'username'}
              rules={[
                { required: true, message: t('form.usernameRequired') },
                { min: USERNAME_MIN_LENGTH, message: t('form.usernameMin') },
                { max: USERNAME_MAX_LENGTH, message: t('form.usernameMax') },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('form.usernamePlaceholder')} size={'large'} autoComplete={'username'} />
            </Form.Item>

            <Form.Item
              label={t('form.password')}
              name={'password'}
              rules={[
                { required: true, message: t('form.passwordRequired') },
                ...(activeMode === 'register' ? [{ min: PASSWORD_MIN_LENGTH, message: t('form.passwordMin') }] : []),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={activeMode === 'register' ? t('form.newPasswordPlaceholder') : t('form.passwordPlaceholder')}
                size={'large'}
                autoComplete={activeMode === 'register' ? 'new-password' : 'current-password'}
              />
            </Form.Item>

            {activeMode === 'register' ? (
              <Form.Item
                label={t('form.confirmPassword')}
                name={'confirmPassword'}
                dependencies={['password']}
                rules={[
                  { required: true, message: t('form.confirmPasswordRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value === getFieldValue('password')) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error(t('form.passwordMismatch')))
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('form.confirmPasswordPlaceholder')}
                  size={'large'}
                  autoComplete={'new-password'}
                />
              </Form.Item>
            ) : null}

            <Button type={'primary'} htmlType={'submit'} size={'large'} block loading={submitting}>
              {activeMode === 'register' ? t('button.register') : t('button.login')}
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  )
}
