// Cloudflare Pages Function — WCAG scanner backend.
// Served at /api/wcag-scan on the deployed Pages site (same origin, no CORS).
// Requires a Browser Rendering binding named BROWSER (see root wrangler.toml)
// and Browser Rendering enabled on the Cloudflare account.
import puppeteer, { type Browser } from '@cloudflare/puppeteer'
// axe-core ships its full source as a string in `axe.source`, injectable into any page.
import axe from 'axe-core'

interface Env {
  BROWSER: Fetcher
}

const MAX_PAGES_CAP = 30
const DEFAULT_MAX_PAGES = 10
const GOTO_TIMEOUT = 20_000

const SKIP_EXT = /\.(pdf|zip|rar|7z|tar|gz|jpe?g|png|gif|webp|svg|ico|bmp|tiff?|mp4|webm|mov|mp3|wav|ogg|css|js|mjs|json|xml|rss|woff2?|ttf|eot|csv|xlsx?|docx?)$/i

interface AxeViolation {
  id: string
  impact: string | null
  help: string
  helpUrl: string
  description: string
  nodes: { html: string; target: string[]; failureSummary: string }[]
}

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    u.hash = ''
    let s = u.toString()
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1)
    return s
  } catch {
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { url?: string; maxPages?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const startUrl = body.url ? normalizeUrl(body.url) : null
  if (!startUrl) return Response.json({ error: 'Valid `url` required' }, { status: 400 })

  const maxPages = Math.min(MAX_PAGES_CAP, Math.max(1, body.maxPages ?? DEFAULT_MAX_PAGES))
  const origin0 = new URL(startUrl).origin

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const send = (event: object) => writer.write(enc.encode(`data: ${JSON.stringify(event)}\n\n`))

  ;(async () => {
    let browser: Browser | null = null
    try {
      browser = await puppeteer.launch(env.BROWSER)
      const seen = new Set<string>([startUrl])
      const queue: string[] = [startUrl]
      let scanned = 0
      let totalViolations = 0

      await send({ type: 'start', maxPages })

      while (queue.length > 0 && scanned < maxPages) {
        const url = queue.shift()!
        const page = await browser.newPage()
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT })
          // SPAs rarely hit networkidle; give client render a short settle.
          await new Promise(r => setTimeout(r, 1200))

          await page.evaluate(axe.source)
          const results = (await page.evaluate(async () => {
            // @ts-expect-error axe injected above
            return await window.axe.run(document, { resultTypes: ['violations'] })
          })) as { violations: AxeViolation[] }

          const violations = (results.violations ?? []).map(v => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            description: v.description,
            nodes: v.nodes.slice(0, 8).map(n => ({
              html: n.html.slice(0, 400),
              target: n.target,
              failureSummary: n.failureSummary,
            })),
            nodeCount: v.nodes.length,
          }))
          totalViolations += violations.reduce((s, v) => s + v.nodeCount, 0)
          scanned++

          await send({ type: 'page', url, violations })

          if (scanned < maxPages) {
            const links = await page.evaluate(() =>
              Array.from(document.querySelectorAll('a[href]'), a => (a as HTMLAnchorElement).href)
            )
            for (const link of links) {
              const n = normalizeUrl(link)
              if (!n || seen.has(n)) continue
              if (new URL(n).origin !== origin0) continue
              if (SKIP_EXT.test(new URL(n).pathname)) continue
              seen.add(n)
              if (queue.length + scanned < maxPages) queue.push(n)
            }
          }
        } catch (e) {
          scanned++
          await send({ type: 'page', url, error: e instanceof Error ? e.message : 'Scan failed', violations: [] })
        } finally {
          await page.close()
        }
      }

      await send({ type: 'done', pagesScanned: scanned, totalViolations })
    } catch (e) {
      await send({ type: 'error', message: e instanceof Error ? e.message : 'Scan error' })
    } finally {
      if (browser) await browser.close().catch(() => {})
      await writer.close().catch(() => {})
    }
  })()

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
