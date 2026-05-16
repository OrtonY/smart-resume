import { Button, Card, Form, Input, Result, Spin, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyPreview, ResumePreview } from '../features/resume/components/ResumePreview'
import { getPublicShare, verifySharePassword } from '../features/resume/api/resumeApi'
import { useResumeTemplateCatalog } from '../features/resume/hooks/useResumeTemplateCatalog'
import type { ResumeDetail } from '../features/resume/types'

const SHARE_TOKEN_KEY_PREFIX = 'smart-resume-share-token:'

function getShareToken(shareCode: string): string | undefined {
  return sessionStorage.getItem(`${SHARE_TOKEN_KEY_PREFIX}${shareCode}`) || undefined
}

function setShareToken(shareCode: string, token: string) {
  sessionStorage.setItem(`${SHARE_TOKEN_KEY_PREFIX}${shareCode}`, token)
}

function clearShareToken(shareCode: string) {
  sessionStorage.removeItem(`${SHARE_TOKEN_KEY_PREFIX}${shareCode}`)
}

export function PublicSharePage() {
  const { shareCode = '' } = useParams()
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [messageApi, contextHolder] = message.useMessage()
  const { templates } = useResumeTemplateCatalog()

  const loadPublicShare = useCallback(async (token?: string) => {
    setLoading(true)
    setNeedsPassword(false)
    setErrorMessage(null)
    try {
      const shareToken = token || getShareToken(shareCode)
      setResume(await getPublicShare(shareCode, shareToken))
    } catch (error) {
      const msg = error instanceof Error ? error.message : '无法加载分享的简历。'
      if (msg === 'Password required' || msg.includes('password') || msg.includes('Password')) {
        setNeedsPassword(true)
        clearShareToken(shareCode)
      } else {
        void messageApi.error(msg)
        setErrorMessage(msg)
      }
      setResume(null)
    } finally {
      setLoading(false)
    }
  }, [messageApi, shareCode])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPublicShare()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPublicShare])

  const handlePasswordSubmit = async (values: { password: string }) => {
    setVerifying(true)
    try {
      const { token } = await verifySharePassword(shareCode, values.password)
      setShareToken(shareCode, token)
      await loadPublicShare(token)
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '密码验证失败')
    } finally {
      setVerifying(false)
    }
  }

  if (needsPassword) {
    return (
      <div className="full-page-center">
        {contextHolder}
        <Card className="auth-card" bordered={false} style={{ width: 400, textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>此分享链接需要密码</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>请输入密码以查看简历内容</p>
          <Form onFinish={handlePasswordSubmit} layout="vertical">
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="输入密码" size="large" autoFocus />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={verifying} block size="large">
                验证
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    )
  }

  return (
    <div className="full-page-center">
      {contextHolder}
      <Card className="auth-card" bordered={false} style={{ width: 'min(960px, 100%)' }}>
        {loading ? (
          <div className="full-page-center" style={{ minHeight: 320 }}>
            <Spin size="large" tip="正在加载分享的简历..." />
          </div>
        ) : resume ? (
          <ResumePreview resume={resume} templates={templates} previewMode="a4-paged" />
        ) : (
          <Result status="404" title="分享链接不可用" subTitle={errorMessage || '此公开分享可能已过期或不存在。'} />
        )}

        {!loading && !resume && !needsPassword ? <EmptyPreview /> : null}
      </Card>
    </div>
  )
}
