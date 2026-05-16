import { Card, Result, Spin, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyPreview, ResumePreview } from '../features/resume/components/ResumePreview'
import { getPublicShare } from '../features/resume/api/resumeApi'
import { useResumeTemplateCatalog } from '../features/resume/hooks/useResumeTemplateCatalog'
import type { ResumeDetail } from '../features/resume/types'

export function PublicSharePage() {
  const { shareCode = '' } = useParams()
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageApi, contextHolder] = message.useMessage()
  const { templates } = useResumeTemplateCatalog()

  const loadPublicShare = useCallback(async () => {
    setLoading(true)
    try {
      setResume(await getPublicShare(shareCode))
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '无法加载分享的简历。')
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
          <Result status="404" title="分享链接不可用" subTitle="此公开分享可能已过期或不存在。" />
        )}

        {!loading && !resume ? <EmptyPreview /> : null}
      </Card>
    </div>
  )
}
