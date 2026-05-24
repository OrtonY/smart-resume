import { Button, Card, Form, Input, Result, Spin, message } from 'antd'
import { DownloadOutlined, LockOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { EmptyPreview, ResumePreview } from '../features/resume/components/ResumePreview'
import { getPublicShare, verifySharePassword } from '../features/resume/api/resumeApi'
import { exportSharePdf } from '../features/resume/export/serverPdfExport'
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
  const { t } = useTranslation('share')
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [messageApi, contextHolder] = message.useMessage()
  const { templates } = useResumeTemplateCatalog({ scope: 'public' })
  const previewTemplates = !resume?.resolvedTemplate
    ? templates
    : templates.some((template) => template.key === resume.resolvedTemplate?.key)
      ? templates
      : [resume.resolvedTemplate, ...templates]

  const loadPublicShare = useCallback(async (token?: string) => {
    setLoading(true)
    setNeedsPassword(false)
    setErrorMessage(null)
    try {
      const shareToken = token || getShareToken(shareCode)
      setResume(await getPublicShare(shareCode, shareToken))
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('page.loadFailed')
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
  }, [messageApi, shareCode, t])

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
      void messageApi.error(error instanceof Error ? error.message : t('page.verifyFailed'))
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
          <h2 style={{ marginBottom: 8 }}>{t('passwordGate.title')}</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>{t('passwordGate.subtitle')}</p>
          <Form onFinish={handlePasswordSubmit} layout="vertical">
            <Form.Item name="password" rules={[{ required: true, message: t('passwordGate.passwordRequired') }]}>
              <Input.Password placeholder={t('passwordGate.passwordPlaceholder')} size="large" autoFocus />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={verifying} block size="large">
                {t('passwordGate.verifyButton')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    )
  }

  async function handleDownloadPdf() {
    if (!resume || downloading) return
    setDownloading(true)
    try {
      const shareToken = getShareToken(shareCode)
      await exportSharePdf(shareCode, resume.title, shareToken)
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : t('page.downloadFailed'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="full-page-center">
      {contextHolder}
      <Card className="auth-card" bordered={false} style={{ width: 'min(960px, 100%)' }}>
        {loading ? (
          <div className="full-page-center" style={{ minHeight: 320 }}>
            <Spin size="large" tip={t('page.loading')} />
          </div>
        ) : resume ? (
          <>
            <div style={{ marginBottom: 12, textAlign: 'right' }}>
              <Button icon={<DownloadOutlined />} loading={downloading} onClick={() => void handleDownloadPdf()}>
                {t('page.downloadPdf')}
              </Button>
            </div>
            <ResumePreview resume={resume} templates={previewTemplates} previewMode="a4-paged" />
          </>
        ) : (
          <Result status="404" title={t('notFound.title')} subTitle={errorMessage || t('notFound.subtitle')} />
        )}

        {!loading && !resume && !needsPassword ? <EmptyPreview /> : null}
      </Card>
    </div>
  )
}
