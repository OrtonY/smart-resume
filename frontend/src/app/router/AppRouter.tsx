import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { InterviewPage } from '../../pages/InterviewPage'
import { PublicSharePage } from '../../pages/PublicSharePage'
import { SetupPage } from '../../pages/SetupPage'
import { TemplateGalleryPage } from '../../pages/TemplateGalleryPage'
import { UnlockPage } from '../../pages/UnlockPage'
import { WorkspacePage } from '../../pages/WorkspacePage'
import { getBootstrapStatus } from '../../features/system/api/systemApi'
import type { BootstrapStatus } from '../../features/system/types'
import { clearAccessToken, getAccessToken, persistAccessToken } from '../../lib/auth/tokenStorage'

export function AppRouter() {
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken())

  useEffect(() => {
    void loadBootstrapStatus()
  }, [])

  async function loadBootstrapStatus() {
    setLoading(true)
    try {
      const status = await getBootstrapStatus()
      setBootstrapStatus(status)
    } finally {
      setLoading(false)
    }
  }

  function handleAuthenticated(token: string) {
    persistAccessToken(token)
    setAccessToken(token)
  }

  function handleLogout() {
    clearAccessToken()
    setAccessToken(null)
  }

  if (loading || !bootstrapStatus) {
    return (
      <div className="full-page-center">
        <Spin size="large" tip="正在启动智能简历..." />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share/:shareCode" element={<PublicSharePage />} />

        {!bootstrapStatus.passwordConfigured ? (
          <Route
            path="*"
            element={<SetupPage onConfigured={handleAuthenticated} onRefreshBootstrap={loadBootstrapStatus} />}
          />
        ) : !accessToken ? (
          <Route path="*" element={<UnlockPage onAuthenticated={handleAuthenticated} />} />
        ) : (
          <>
            <Route path="/app/templates" element={<TemplateGalleryPage />} />
            <Route path="/app/interviews/:interviewId" element={<InterviewPage onLogout={handleLogout} />} />
            <Route path="/app/interviews" element={<InterviewPage onLogout={handleLogout} />} />
            <Route path="/app/recycle-bin" element={<WorkspacePage accessToken={accessToken} onLogout={handleLogout} />} />
            <Route path="/app/resumes/:resumeId" element={<WorkspacePage accessToken={accessToken} onLogout={handleLogout} />} />
            <Route path="/app" element={<WorkspacePage accessToken={accessToken} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
