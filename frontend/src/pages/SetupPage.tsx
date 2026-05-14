import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { setupPassword } from '../features/system/api/systemApi'

const { Paragraph } = Typography

interface SetupPageProps {
  onConfigured: (token: string) => void
  onRefreshBootstrap: () => Promise<void>
}

export function SetupPage({ onConfigured, onRefreshBootstrap }: SetupPageProps) {
  const [form] = Form.useForm<{ password: string; confirmPassword: string }>()
  const [messageApi, contextHolder] = message.useMessage()

  async function handleFinish(values: { password: string; confirmPassword: string }) {
    const result = await setupPassword(values.password)
    onConfigured(result.accessToken)
    await onRefreshBootstrap()
    void messageApi.success('密码已设置，您的私人工作区已就绪。')
  }

  return (
    <div className="full-page-center">
      {contextHolder}
      <Card className="auth-card" bordered={false}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <div className="auth-kicker">首次设置</div>
            <h1 className="auth-title">保护您的私人简历工作室</h1>
            <p className="auth-subtitle">
              本系统采用单用户设计，只需设置一个访问密码即可直接进入，无需用户名或额外的账户配置。
            </p>
          </div>

          <Alert
            type="info"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message="为什么需要密码保护？"
            description="您的简历、模板选择、公开分享设置以及未来的 AI 功能都将受到统一的访问保护。"
          />

          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item
              label="访问密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码。' },
                { min: 6, message: '密码至少需要 6 个字符。' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="创建您的密码" size="large" />
            </Form.Item>

            <Form.Item
              label="确认密码"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码。' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value === getFieldValue('password')) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致。'))
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="再次输入密码" size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" size="large" block>
              初始化工作区
            </Button>
          </Form>

          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            公开分享页面对访客可见，但您的编辑工作区保持私密。
          </Paragraph>
        </Space>
      </Card>
    </div>
  )
}
