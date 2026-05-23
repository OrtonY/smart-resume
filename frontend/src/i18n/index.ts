import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCommon from './locales/zh-CN/common.json'
import zhAuth from './locales/zh-CN/auth.json'
import zhWorkspace from './locales/zh-CN/workspace.json'
import zhInterview from './locales/zh-CN/interview.json'
import zhTemplate from './locales/zh-CN/template.json'
import zhAi from './locales/zh-CN/ai.json'
import zhShare from './locales/zh-CN/share.json'
import zhSystem from './locales/zh-CN/system.json'

import enCommon from './locales/en-US/common.json'
import enAuth from './locales/en-US/auth.json'
import enWorkspace from './locales/en-US/workspace.json'
import enInterview from './locales/en-US/interview.json'
import enTemplate from './locales/en-US/template.json'
import enAi from './locales/en-US/ai.json'
import enShare from './locales/en-US/share.json'
import enSystem from './locales/en-US/system.json'

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// TODO(i18n-types): Add `declare module 'i18next'` augmentation with typed
// namespace resources once all locale JSON files are populated. This will
// enable compile-time key checking for t() calls. Blocked until slices 2-5
// stabilize the key structure.

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        common: zhCommon,
        auth: zhAuth,
        workspace: zhWorkspace,
        interview: zhInterview,
        template: zhTemplate,
        ai: zhAi,
        share: zhShare,
        system: zhSystem,
      },
      'en-US': {
        common: enCommon,
        auth: enAuth,
        workspace: enWorkspace,
        interview: enInterview,
        template: enTemplate,
        ai: enAi,
        share: enShare,
        system: enSystem,
      },
    },
    fallbackLng: 'zh-CN',
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ['common', 'auth', 'workspace', 'interview', 'template', 'ai', 'share', 'system'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'smart-resume-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
