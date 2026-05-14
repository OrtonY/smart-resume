import type { PropsWithChildren } from 'react'
import { App, ConfigProvider } from 'antd'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#3157a4',
          colorInfo: '#3157a4',
          colorSuccess: '#1f8f63',
          colorWarning: '#ff8c42',
          colorBorderSecondary: 'rgba(20, 33, 61, 0.08)',
          borderRadius: 20,
          fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}
