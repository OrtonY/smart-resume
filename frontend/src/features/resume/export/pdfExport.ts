import i18n from '../../../i18n'
import { createExportFilename, downloadBlob } from './fileDownload'

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

export async function exportResumePdf(previewRoot: HTMLElement, title: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('.resume-preview-paper--page'))

  if (pages.length === 0) {
    throw new Error(i18n.t('export.noPreviewError', { ns: 'template' }))
  }

  await waitForImages(previewRoot)

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  for (const [pageIndex, page] of pages.entries()) {
    const canvas = await html2canvas(page, {
      backgroundColor: '#ffffff',
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      logging: false,
    })
    const imageData = canvas.toDataURL('image/jpeg', 0.98)

    if (pageIndex > 0) {
      pdf.addPage()
    }

    pdf.addImage(imageData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM)
  }

  downloadBlob(pdf.output('blob'), createExportFilename(title, 'pdf'))
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))

  await Promise.all(images.map((image) => {
    image.loading = 'eager'

    if (image.complete) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
}
