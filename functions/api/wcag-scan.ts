// Cloudflare Pages Function — WCAG scanner backend.
// Served at /api/wcag-scan on the deployed Pages site (same origin, no CORS).
// Requires a Browser Rendering binding named BROWSER (see root wrangler.toml)
// and Browser Rendering enabled on the Cloudflare account.
import puppeteer, { type Browser } from '@cloudflare/puppeteer'
// axe-core ships its full source as a string in `axe.source`, injectable into any page.
import axe from 'axe-core'

interface Env {
  BROWSER: { fetch: typeof fetch }
}

interface RequestContext {
  request: Request
  env: Env
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

// Allow same-origin (prod) plus local dev so `vite dev` can call the deployed
// function cross-origin. localhost/127.0.0.1 on any port are permitted.
function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin')
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    }
  }
  return {} // same-origin requests need no CORS headers
}

export const onRequestOptions = async ({ request }: Pick<RequestContext, 'request'>) =>
  new Response(null, { headers: corsHeaders(request) })

export const onRequestPost = async ({ request, env }: RequestContext) => {
  const cors = corsHeaders(request)

  let body: { url?: string; maxPages?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: cors })
  }

  const startUrl = body.url ? normalizeUrl(body.url) : null
  if (!startUrl) return Response.json({ error: 'Valid `url` required' }, { status: 400, headers: cors })

  const maxPages = Math.min(MAX_PAGES_CAP, Math.max(1, body.maxPages ?? DEFAULT_MAX_PAGES))
  const origin0 = new URL(startUrl).origin

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const send = (event: object) => writer.write(enc.encode(`data: ${JSON.stringify(event)}\n\n`))

    ; (async () => {
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
          let stage = 'init'
          try {
            stage = 'goto'
            console.log(`[wcag] goto ${url}`)
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT })
            // SPAs rarely hit networkidle; give client render a short settle.
            await new Promise(r => setTimeout(r, 1200))

            // Inject axe AND run it in a SINGLE evaluate string, so both share one
            // execution context (separate addScriptTag/evaluate calls can land in
            // different worlds → `window.axe` undefined). Passing a string (not a
            // function) keeps it clear of the Workers bundler's `__name` helper,
            // which lives in the outer Worker scope and is undefined in the page
            // → otherwise "__name is not defined". axe.source's UMD wrapper binds
            // `axe` onto the page window when executed there.
            stage = 'axe-run'
            console.log(`[wcag] inject+run axe (source ${axe.source.length} bytes) ${url}`)
            const results = (await page.evaluate(
              `${axe.source};\nwindow.axe.run(document, { resultTypes: ['violations'] })`
            )) as { violations: AxeViolation[] }

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

            console.log(`[wcag] done ${url}: ${violations.length} rules, ${results.violations?.length ?? 0} raw`)
            await send({ type: 'page', url, violations })

            if (scanned < maxPages) {
              stage = 'extract-links'
              const links = (await page.evaluate(
                `Array.from(document.querySelectorAll('a[href]'), a => a.href)`
              )) as string[]
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
            const msg = e instanceof Error ? e.message : 'Scan failed'
            const stack = e instanceof Error ? e.stack : undefined
            console.error(`[wcag] FAIL ${url} @stage=${stage}: ${msg}\n${stack ?? ''}`)
            await send({ type: 'page', url, stage, error: msg, stack, violations: [] })
          } finally {
            await page.close()
          }
        }

        await send({ type: 'done', pagesScanned: scanned, totalViolations })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Scan error'
        const stack = e instanceof Error ? e.stack : undefined
        console.error(`[wcag] FATAL: ${msg}\n${stack ?? ''}`)
        await send({ type: 'error', message: msg, stack })
      } finally {
        if (browser) await browser.close().catch(() => { })
        await writer.close().catch(() => { })
      }
    })()

  return new Response(readable, {
    headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
