import { Spin } from 'antd'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { invalidateManagedResumeTemplateCatalogCache } from '../../features/resume/hooks/useResumeTemplateCatalog'
import {
  getBootstrapStatus,
  getSession,
  updateRegistrationSettings,
} from '../../features/system/api/systemApi'
import type {
  AccessTokenResponse,
  BootstrapStatus,
  RegistrationSettingsResponse,
  SessionResponse,
} from '../../features/system/types'
import {
  clearAccessToken,
  getAccessToken,
  persistAccessToken,
  subscribeAccessToken,
} from '../../lib/auth/tokenStorage'

const AuthPage = lazy(async () => import('../../pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const InterviewPage = lazy(async () => import('../../pages/InterviewPage').then((module) => ({ default: module.InterviewPage })))
const PublicSharePage = lazy(async () => import('../../pages/PublicSharePage').then((module) => ({ default: module.PublicSharePage })))
const TemplateGalleryPage = lazy(async () => import('../../pages/TemplateGalleryPage').then((module) => ({ default: module.TemplateGalleryPage })))
const WorkspacePage = lazy(async () => import('../../pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage })))

async function fetchSession() {
  if (!getAccessToken()) {
    return null
  }

  try {
    return await getSession()
  } catch {
    return null
  }
}

export function AppRouter() {
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null)
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken())

  useEffect(() => subscribeAccessToken((token) => {
    setAccessToken(token)
    if (!token) {
      setSession(null)
    }
  }), [])

  useEffect(() => {
    invalidateManagedResumeTemplateCatalogCache()
  }, [accessToken])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
      }
    })

    void (async () => {
      const [status, currentSession] = await Promise.all([
        getBootstrapStatus(),
        accessToken ? fetchSession() : Promise.resolve(null),
      ])

      if (cancelled) {
        return
      }

      setBootstrapStatus(status)
      setSession(currentSession)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  async function handleAuthenticated(result: AccessTokenResponse) {
    persistAccessToken(result.accessToken)
    setAccessToken(result.accessToken)
    const currentSession = await fetchSession()
    setSession(currentSession ?? {
      user: result.user,
      registrationEnabled: bootstrapStatus?.registrationEnabled ?? true,
    })
  }

  function handleLogout() {
    clearAccessToken()
    setSession(null)
  }

  async function handleRegistrationEnabledChange(enabled: boolean): Promise<RegistrationSettingsResponse> {
    const result = await updateRegistrationSettings(enabled)
    setBootstrapStatus((current) => (current ? { ...current, registrationEnabled: result.registrationEnabled } : current))
    setSession((current) => (current ? { ...current, registrationEnabled: result.registrationEnabled } : current))
    return result
  }

  if (loading || !bootstrapStatus) {
    return (
      <div className="full-page-center">
        <Spin size="large" tip="Loading Smart Resume..." />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/share/:shareCode" element={<PublicSharePage />} />

          {!accessToken || !session ? (
            <Route path="*" element={<AuthPage bootstrapStatus={bootstrapStatus} onAuthenticated={handleAuthenticated} />} />
          ) : (
            <>
              <Route path="/app/templates" element={<TemplateGalleryPage />} />
              <Route path="/app/interviews/:interviewId" element={<InterviewPage onLogout={handleLogout} />} />
              <Route path="/app/interviews" element={<InterviewPage onLogout={handleLogout} />} />
              <Route
                path="/app/recycle-bin"
                element={(
                  <WorkspacePage
                    currentUser={session.user}
                    onLogout={handleLogout}
                    registrationEnabled={session.registrationEnabled}
                    onRegistrationEnabledChange={handleRegistrationEnabledChange}
                  />
                )}
              />
              <Route
                path="/app/resumes/:resumeId"
                element={(
                  <WorkspacePage
                    currentUser={session.user}
                    onLogout={handleLogout}
                    registrationEnabled={session.registrationEnabled}
                    onRegistrationEnabledChange={handleRegistrationEnabledChange}
                  />
                )}
              />
              <Route
                path="/app"
                element={(
                  <WorkspacePage
                    currentUser={session.user}
                    onLogout={handleLogout}
                    registrationEnabled={session.registrationEnabled}
                    onRegistrationEnabledChange={handleRegistrationEnabledChange}
                  />
                )}
              />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function RouteLoadingFallback() {
  return (
    <div className="full-page-center">
      <Spin size="large" tip="Loading page..." />
    </div>
  )
}
