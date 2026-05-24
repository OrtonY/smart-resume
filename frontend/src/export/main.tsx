import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import i18n from '../i18n'
import '../index.css'
import { ResumePreview } from '../features/resume/components/ResumePreview'
import type { ResumeDetail } from '../features/resume/types'
import { FALLBACK_RESUME_TEMPLATE_CATALOG, type ResumeTemplateDefinition } from '../features/resume/templateCatalog'

interface ExportPayload {
  resume: ResumeDetail
  templates?: ResumeTemplateDefinition[]
  language?: 'zh-CN' | 'en-US'
}

declare global {
  interface Window {
    smartResumeExportRender?: (payload: ExportPayload) => Promise<void>
  }
}

const rootEl = document.getElementById('export-root')!
const root = createRoot(rootEl)
document.documentElement.classList.add('resume-export-document')

function markReady() {
  document.body.setAttribute('data-export-ready', 'true')
}

function markFailed(message: string) {
  document.body.setAttribute('data-export-error', message)
}

async function render(payload: ExportPayload) {
  document.body.removeAttribute('data-export-ready')
  document.body.removeAttribute('data-export-error')

  if (payload.language && payload.language !== i18n.language) {
    await i18n.changeLanguage(payload.language)
  }

  const templates = payload.templates ?? FALLBACK_RESUME_TEMPLATE_CATALOG

  root.render(
    <StrictMode>
      <ResumePreview resume={payload.resume} templates={templates} previewMode="a4-paged" />
    </StrictMode>,
  )

  await waitForRenderComplete()
  markReady()
}

function waitForRenderComplete(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const images = Array.from(document.querySelectorAll('img'))
        if (images.length === 0) {
          resolve()
          return
        }
        const pending = images.filter((img) => !img.complete)
        if (pending.length === 0) {
          resolve()
          return
        }
        let remaining = pending.length
        const done = () => {
          remaining -= 1
          if (remaining <= 0) resolve()
        }
        pending.forEach((img) => {
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
        })
      })
    })
  })
}

window.smartResumeExportRender = async (payload: ExportPayload) => {
  try {
    await render(payload)
  } catch (error) {
    markFailed(error instanceof Error ? error.message : 'render failed')
    throw error
  }
}

document.body.setAttribute('data-export-bootstrapped', 'true')
