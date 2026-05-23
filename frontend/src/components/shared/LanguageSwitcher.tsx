import { Segmented } from 'antd'
import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '../../i18n'
import { SUPPORTED_LANGUAGES } from '../../i18n'

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'zh-CN': '中',
  'en-US': 'EN',
}

/**
 * Compact language switcher (中 / EN).
 * Reads current language from i18n and calls changeLanguage on toggle.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const currentLang = SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? (i18n.language as SupportedLanguage)
    : 'zh-CN'

  const options = SUPPORTED_LANGUAGES.map((lang) => ({
    label: LANGUAGE_LABELS[lang],
    value: lang,
  }))

  return (
    <Segmented
      size="small"
      options={options}
      value={currentLang}
      onChange={(value) => void i18n.changeLanguage(value as SupportedLanguage)}
      aria-label="Language"
    />
  )
}
