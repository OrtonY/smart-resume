import { Button, Card, Form, Input, Result, Spin, message } from 'antd'
import { DownloadOutlined, LockOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { EmptyPreview, ResumePreview } from '../features/resume/components/ResumePreview'
import { getPublicShare, getPublicShareAccess, verifySharePassword } from '../features/resume/api/resumeApi'
import { exportSharePdf } from '../features/resume/export/serverPdfExport'
import { useResumeTemplateCatalog } from '../features/resume/hooks/useResumeTemplateCatalog'
import type { ResumeDetail } from '../features/resume/types'

const SHARE_TOKEN_KEY_PREFIX = 'smart-resume-share-token:'
const SHARE_AUTH_ERROR_KEYWORDS = ['password', 'token', 'share token', '\u5bc6\u7801', '\u4ee4\u724c']

function getShareToken(shareCode: string): string | undefined {
  return sessionStorage.getItem(`${SHARE_TOKEN_KEY_PREFIX}${shareCode}`) || undefined
}

function setShareToken(shareCode: string, token: string) {
  sessionStorage.setItem(`${SHARE_TOKEN_KEY_PREFIX}${shareCode}`, token)
}

function clearShareToken(shareCode: string) {
  sessionStorage.removeItem(`${SHARE_TOKEN_KEY_PREFIX}${shareCode}`)
}

type PublicSharePageState =
  | { status: 'loading' }
  | { status: 'password' }
  | { status: 'ready'; resume: ResumeDetail }
  | { status: 'error'; message: string }

function isShareAuthError(messageText: string) {
  const normalizedMessage = messageText.toLowerCase()
  return SHARE_AUTH_ERROR_KEYWORDS.some((keyword) => normalizedMessage.includes(keyword))
}

export function PublicSharePage() {
  const { shareCode = '' } = useParams()
  const { t } = useTranslation('share')
  const [pageState, setPageState] = useState<PublicSharePageState>({ status: 'loading' })
  const [verifying, setVerifying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()
  const { templates } = useResumeTemplateCatalog({ scope: 'public' })
  const resume = pageState.status === 'ready' ? pageState.resume : null
  const previewTemplates = !resume?.resolvedTemplate
    ? templates
    : templates.some((template) => template.key === resume.resolvedTemplate?.key)
      ? templates
      : [resume.resolvedTemplate, ...templates]

  const loadProtectedShare = useCallback(async (token?: string) => {
    const shareToken = token || getShareToken(shareCode)
    return getPublicShare(shareCode, shareToken)
  }, [shareCode])

  const initializePage = useCallback(async () => {
    setPageState({ status: 'loading' })

    try {
      const accessInfo = await getPublicShareAccess(shareCode)
      if (accessInfo.hasPassword) {
        const cachedToken = getShareToken(shareCode)
        if (!cachedToken) {
          setPageState({ status: 'password' })
          return
        }

        try {
          const sharedResume = await loadProtectedShare(cachedToken)
          setPageState({ status: 'ready', resume: sharedResume })
          return
        } catch (error) {
          const msg = error instanceof Error ? error.message : t('page.loadFailed')
          if (isShareAuthError(msg)) {
            clearShareToken(shareCode)
            setPageState({ status: 'password' })
            return
          }

          void messageApi.error(msg)
          setPageState({ status: 'error', message: msg })
          return
        }
      }

      const sharedResume = await getPublicShare(shareCode)
      setPageState({ status: 'ready', resume: sharedResume })
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('page.loadFailed')
      void messageApi.error(msg)
      setPageState({ status: 'error', message: msg })
    }
  }, [loadProtectedShare, messageApi, shareCode, t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void initializePage()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [initializePage])

  const handlePasswordSubmit = async (values: { password: string }) => {
    setVerifying(true)
    try {
      const { token } = await verifySharePassword(shareCode, values.password)
      setShareToken(shareCode, token)
      const sharedResume = await loadProtectedShare(token)
      setPageState({ status: 'ready', resume: sharedResume })
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('page.verifyFailed')
      if (isShareAuthError(msg)) {
        clearShareToken(shareCode)
        setPageState({ status: 'password' })
      }
      void messageApi.error(msg)
    } finally {
      setVerifying(false)
    }
  }

  if (pageState.status === 'password') {
    return (
      <div className="public-share-page public-share-page--password">
        {contextHolder}
        <Card className="auth-card public-share-page__password-card" bordered={false}>
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
    <div className="public-share-page">
      {contextHolder}
      <Card className="public-share-page__card" bordered={false}>
        {pageState.status === 'loading' ? (
          <div className="full-page-center" style={{ minHeight: 320 }}>
            <Spin size="large" tip={t('page.loading')} />
          </div>
        ) : pageState.status === 'ready' ? (
          <>
            <div style={{ marginBottom: 12, textAlign: 'right' }}>
              <Button icon={<DownloadOutlined />} loading={downloading} onClick={() => void handleDownloadPdf()}>
                {t('page.downloadPdf')}
              </Button>
            </div>
            <ResumePreview resume={pageState.resume} templates={previewTemplates} previewMode="a4-paged" />
          </>
        ) : (
          <Result status="404" title={t('notFound.title')} subTitle={pageState.message || t('notFound.subtitle')} />
        )}

        {pageState.status === 'error' ? <EmptyPreview /> : null}
      </Card>
    </div>
  )
}
