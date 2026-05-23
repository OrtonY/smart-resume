import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { App, ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import type { Locale } from 'antd/lib/locale'
import { useTranslation } from 'react-i18next'

const ANTD_LOCALES: Record<string, Locale> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

function resolveAntdLocale(language: string): Locale {
  if (ANTD_LOCALES[language]) {
    return ANTD_LOCALES[language]
  }
  // Fall back by language prefix (e.g. `zh` → zh-CN, `en` → en-US).
  const prefix = language.split('-')[0]
  if (prefix === 'en') return enUS
  return zhCN
}

function LocalizedConfigProvider({ children }: PropsWithChildren) {
  const { i18n } = useTranslation()
  const locale = useMemo(() => resolveAntdLocale(i18n.language), [i18n.language])

  return (
    <ConfigProvider
      locale={locale}
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

export function AppProviders({ children }: PropsWithChildren) {
  return <LocalizedConfigProvider>{children}</LocalizedConfigProvider>
}
