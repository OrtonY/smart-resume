import type { ContentRequest, JobSnapshot } from './types'

const contentGlobal = globalThis as typeof globalThis & { __smartResumeBossHelperReady?: boolean }
const SNAPSHOT_SETTLE_DELAY_MS = 250

const DETAIL_ROOT_SELECTORS = [
  '.job-detail-box',
  '.job-detail-container',
  '.job-detail',
  '.detail-content',
]

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
  salary: [
    '.job-salary',
    '.salary',
    '[class*="salary"]',
    '.red',
  ],
  description: [
    '.job-detail-body .desc',
    '.job-detail-body',
    '.job-sec-text',
    '.job-detail-section',
    '.job-description',
    '.desc',
    '.detail-content',
    '[class*="job"] [class*="description"]',
  ],
  metadata: [
    '.tag-list li',
    '.tag-list span',
    '.job-tag li',
    '.job-tag span',
    '.job-primary .info-desc',
    '[class*="tag"] li',
    '[class*="tag"] span',
  ],
}

if (!contentGlobal.__smartResumeBossHelperReady) {
  contentGlobal.__smartResumeBossHelperReady = true
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isContentRequest(message)) {
      void extractStableJobSnapshot().then(sendResponse)
      return true
    }
    return false
  })
}

function isContentRequest(message: unknown): message is ContentRequest {
  return typeof message === 'object' && message !== null && (message as ContentRequest).type === 'GET_JOB_SNAPSHOT'
}

async function extractStableJobSnapshot(): Promise<JobSnapshot> {
  await delay(SNAPSHOT_SETTLE_DELAY_MS)
  return extractJobSnapshot()
}

function extractJobSnapshot(): JobSnapshot {
  const detailRoot = firstVisibleElement(DETAIL_ROOT_SELECTORS)
  const titleFallback = parseDocumentTitle(document.title)
  const detailPosition = firstText(TEXT_SELECTORS.position, detailRoot)
  const currentCard = findCurrentJobCard(detailPosition)
  const company = cleanCompany(
    firstText(TEXT_SELECTORS.company, detailRoot)
    || firstText(TEXT_SELECTORS.company, currentCard)
    || titleFallback.company,
  )
  const position = cleanPosition(detailPosition || firstText(TEXT_SELECTORS.position, currentCard) || titleFallback.position)
  const jobDescription = firstText(TEXT_SELECTORS.description, detailRoot) || fallbackVisibleDescription()
  const salary = decodeSalary(firstText(TEXT_SELECTORS.salary, detailRoot) || firstText(TEXT_SELECTORS.salary, currentCard))
  const metadata = [
    ...textsFromSelectors(TEXT_SELECTORS.metadata, detailRoot),
    ...textsFromSelectors(TEXT_SELECTORS.metadata, currentCard),
  ]
  const education = firstMatch(metadata, isEducationText)
  const workDuration = firstMatch(metadata, isWorkDurationText)
  const extraNotes = buildExtraNotes({ salary, education, workDuration })
  const url = currentCardUrl(currentCard) || detailUrl(detailRoot) || window.location.href
  const warnings: string[] = []

  if (!company) warnings.push('company_missing')
  if (!position) warnings.push('position_missing')
  if (!jobDescription) warnings.push('job_description_missing')

  return {
    company,
    position,
    jobDescription,
    extraNotes,
    url,
    warnings,
  }
}

function firstText(selectors: string[], root: Element | Document | null = document) {
  for (const selector of selectors) {
    const nodes = Array.from((root ?? document).querySelectorAll<HTMLElement>(selector))
    for (const node of nodes) {
      const text = normalizeText(node.innerText || node.textContent || '')
      if (isVisible(node) && text.length >= 2) {
        return text
      }
    }
  }
  return ''
}

function textsFromSelectors(selectors: string[], root: Element | Document | null) {
  const texts: string[] = []
  for (const selector of selectors) {
    const nodes = Array.from((root ?? document).querySelectorAll<HTMLElement>(selector))
    for (const node of nodes) {
      const text = normalizeText(node.innerText || node.textContent || '')
      if (isVisible(node) && text && text.length <= 40 && !texts.includes(text)) {
        texts.push(text)
      }
    }
  }
  return texts
}

function findCurrentJobCard(detailPosition: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.job-card-wrap, .job-card-box, li[class*="job-card"]'))
    .filter(isVisible)
  const activeCard = cards.find((card) => /\b(active|selected|cur|current)\b/.test(card.className))
  if (activeCard) return activeCard

  const normalizedPosition = cleanPosition(detailPosition)
  if (!normalizedPosition) return cards[0] ?? null

  return cards.find((card) => cleanPosition(firstText(TEXT_SELECTORS.position, card)) === normalizedPosition) ?? cards[0] ?? null
}

function firstVisibleElement(selectors: string[]) {
  for (const selector of selectors) {
    const node = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible)
    if (node) return node
  }
  return null
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

function decodeSalary(value: string) {
  const mapping: Record<string, string> = {
    '\uE031': '0',
    '\uE032': '1',
    '\uE033': '2',
    '\uE034': '3',
    '\uE035': '4',
    '\uE036': '5',
    '\uE037': '6',
    '\uE038': '7',
    '\uE039': '8',
    '\uE03A': '9',
  }
  return normalizeText(Array.from(value).map((char) => mapping[char] ?? char).join(''))
}

function buildExtraNotes(metadata: { salary: string; education: string; workDuration: string }) {
  return [
    metadata.salary ? `薪资: ${metadata.salary}` : null,
    metadata.education ? `学历要求: ${metadata.education}` : null,
    metadata.workDuration ? `工作时长: ${metadata.workDuration}` : null,
  ].filter(Boolean).join('\n')
}

function firstMatch(values: string[], predicate: (value: string) => boolean) {
  return values.find((value) => predicate(value)) ?? ''
}

function isEducationText(value: string) {
  return /(学历不限|初中|中专|高中|大专|本科|硕士|博士)/.test(value)
}

function isWorkDurationText(value: string) {
  return /(经验|应届|在校|不限|\d+\s*(?:天\/周|个月|月|周|年)|\d+\s*-\s*\d+\s*年)/.test(value) && !isEducationText(value)
}

function currentCardUrl(card: Element | null) {
  const href = card?.querySelector<HTMLAnchorElement>('a.job-name[href], a[href*="/job_detail/"]')?.getAttribute('href')
  return absoluteBossUrl(href)
}

function detailUrl(root: Element | null) {
  const href = root?.querySelector<HTMLAnchorElement>('a[href*="/job_detail/"]')?.getAttribute('href')
  return absoluteBossUrl(href)
}

function absoluteBossUrl(href: string | null | undefined) {
  if (!href) return ''
  try {
    return new URL(href, window.location.origin).toString()
  } catch {
    return ''
  }
}

function isVisible(node: HTMLElement) {
  const style = window.getComputedStyle(node)
  return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
