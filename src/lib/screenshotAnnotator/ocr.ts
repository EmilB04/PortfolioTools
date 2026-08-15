// Screenshot Annotator — optional OCR for alt-text suggestions.
//
// tesseract.js pulls ~2 MB of wasm + traineddata, so it is imported dynamically
// and only when the user asks for a suggestion. The worker is kept alive across
// runs; the first call pays the download, later calls are fast.

import type { Worker } from 'tesseract.js'

const ALT_MAX_CHARS = 110
const MIN_LINE_CHARS = 3

let workerPromise: Promise<Worker> | null = null

export type OcrProgress = (fraction: number) => void

async function getWorker(onProgress?: OcrProgress): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('eng', undefined, {
        logger: m => {
          if (typeof m.progress === 'number') onProgress?.(m.progress)
        },
      }),
    ).catch(err => {
      workerPromise = null // let the next attempt retry the download
      throw err
    })
  }
  return workerPromise
}

/** Collapse OCR noise into a single short line usable as markdown alt text. */
export function altFromText(raw: string): string {
  const lines = raw
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    // Drop stray punctuation-only fragments OCR loves to invent.
    .filter(l => l.length >= MIN_LINE_CHARS && /[a-z0-9]/i.test(l))

  if (!lines.length) return ''

  // Prefer the longest line — headings and error messages tend to win, and they
  // describe the screenshot better than scattered UI chrome.
  const best = lines.reduce((a, b) => (b.length > a.length ? b : a))
  const alt = best.length >= 12 ? best : lines.slice(0, 3).join(' — ')

  return alt.length > ALT_MAX_CHARS ? `${alt.slice(0, ALT_MAX_CHARS - 1).trimEnd()}…` : alt
}

/** Run OCR over the rendered canvas and return a suggested alt string. */
export async function suggestAlt(
  canvas: HTMLCanvasElement,
  onProgress?: OcrProgress,
): Promise<string> {
  const worker = await getWorker(onProgress)
  const { data } = await worker.recognize(canvas)
  return altFromText(data.text ?? '')
}
