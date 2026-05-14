import { LockOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { verifyPassword } from '../features/system/api/systemApi'

const { Paragraph } = Typography

interface UnlockPageProps {
  onAuthenticated: (token: string) => void
}

export function UnlockPage({ onAuthenticated }: UnlockPageProps) {
  const [form] = Form.useForm<{ password: string }>()
  const [messageApi, contextHolder] = message.useMessage()

  async function handleFinish(values: { password: string }) {
    const result = await verifyPassword(values.password)
    onAuthenticated(result.accessToken)
    void messageApi.success('欢迎回来。')
  }

  return (
    <div className="full-page-center">
      {contextHolder}
      <Card className="auth-card" bordered={false}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <div className="auth-kicker">私人访问</div>
            <h1 className="auth-title">简历工作从这里开始</h1>
            <p className="auth-subtitle">
              一个密码，一个私人工作区。解锁您的编辑器、模板和公开分享控制。
            </p>
          </div>

          <Space align="center">
            <ThunderboltOutlined style={{ color: '#ff8c42' }} />
            <Paragraph style={{ margin: 0 }} type="secondary">
              自动保存和多模板编辑功能，让您从上次离开的地方继续。
            </Paragraph>
          </Space>

          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码。' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="输入您的密码" size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" size="large" block>
              解锁工作区
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  )
}
