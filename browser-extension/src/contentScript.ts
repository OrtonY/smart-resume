import type { ContentRequest, JobSnapshot } from './types'

const contentGlobal = globalThis as typeof globalThis & { __smartResumeBossHelperReady?: boolean }

const TEXT_SELECTORS = {
  company: [
    '.job-detail-company .company-name',
    '.job-detail-company .name',
    '.job-detail-company a[href*="/gongsi/"]',
    '.company-info a[href*="/gongsi/"]',
    '.company-info .company-name',
    '.company-name',
    '.boss-name',
    'a[href*="/gongsi/"]',
  ],
  position: [
    '.job-name',
    'a.job-name',
    '.job-title',
    '.job-banner h1',
    '.job-primary h1',
    '.name-box h1',
    '[class*="job"] h1',
  ],
  description: [
    '.job-detail-body .desc',
    '.job-detail-body',
    '.job-sec-text',
    '.job-detail-section',
    '.job-description',
    '.detail-content',
    '[class*="job"] [class*="description"]',
  ],
}

if (!contentGlobal.__smartResumeBossHelperReady) {
  contentGlobal.__smartResumeBossHelperReady = true
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isContentRequest(message)) {
      sendResponse(extractJobSnapshot())
    }
  })
}

function isContentRequest(message: unknown): message is ContentRequest {
  return typeof message === 'object' && message !== null && (message as ContentRequest).type === 'GET_JOB_SNAPSHOT'
}

function extractJobSnapshot(): JobSnapshot {
  const titleFallback = parseDocumentTitle(document.title)
  const company = cleanCompany(firstText(TEXT_SELECTORS.company) || titleFallback.company)
  const position = cleanPosition(firstText(TEXT_SELECTORS.position) || titleFallback.position)
  const jobDescription = firstText(TEXT_SELECTORS.description) || fallbackVisibleDescription()
  const warnings: string[] = []

  if (!company) warnings.push('company_missing')
  if (!position) warnings.push('position_missing')
  if (!jobDescription) warnings.push('job_description_missing')

  return {
    company,
    position,
    jobDescription,
    url: window.location.href,
    warnings,
  }
}

function firstText(selectors: string[]) {
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector))
    for (const node of nodes) {
      const text = normalizeText(node.innerText || node.textContent || '')
      if (isVisible(node) && text.length >= 2) {
        return text
      }
    }
  }
  return ''
}

function parseDocumentTitle(title: string) {
  const normalized = normalizeText(title)
  const parts = normalized
    .split(/[-_|｜丨]/)
    .map((part) => part.trim())
    .filter(Boolean)

  return {
    position: parts[0] && !parts[0].includes('BOSS') ? cleanPosition(parts[0]) : '',
    company: cleanCompany(parts.find((part) => !part.includes('BOSS') && part !== parts[0]) ?? ''),
  }
}

function fallbackVisibleDescription() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('main, article, section, .job-detail, .job-detail-box'))
    .map((node) => normalizeText(node.innerText || node.textContent || ''))
    .filter((text) => text.length > 80)
    .sort((a, b) => b.length - a.length)

  return candidates[0] ?? ''
}

function cleanPosition(value: string) {
  return removeSalaryText(normalizeText(value))
    .replace(/^(职位|岗位)[:：]/, '')
    .trim()
}

function cleanCompany(value: string) {
  return removeSalaryText(normalizeText(value))
    .replace(/^(公司)[:：]/, '')
    .trim()
}

function removeSalaryText(value: string) {
  return value
    .replace(/\d+(?:\.\d+)?\s*[kK千万]?\s*(?:-|~|—|至)\s*\d+(?:\.\d+)?\s*[kK千万]?(?:·\d+薪)?/g, '')
    .replace(/\d+(?:\.\d+)?\s*(?:元|块)\/?(?:天|日|月|小时|时)/g, '')
    .replace(/(?:薪资|工资)[:：]?\s*(面议|[^ ]{2,20})/g, '')
    .replace(/面议/g, '')
    .trim()
}

function isVisible(node: HTMLElement) {
  const style = window.getComputedStyle(node)
  return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
