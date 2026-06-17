#!/usr/bin/env node
// Zero-infra WCAG scanner — crawls same-origin pages, runs axe-core on each.
// Usage: npm run scan -- <url> [--max N] [--out report.json]
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync } from 'node:fs'

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
let start, max = 10, out = null
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--max') max = Number(args[++i])
  else if (a === '--out') out = args[++i]
  else if (!a.startsWith('--')) start = a
}
if (!start) {
  console.error('Usage: npm run scan -- <url> [--max N] [--out report.json]')
  process.exit(2)
}
if (!/^https?:\/\//i.test(start)) start = 'https://' + start

// ── Helpers ──────────────────────────────────────────────────────────────────
const SKIP_EXT = /\.(pdf|zip|rar|7z|tar|gz|jpe?g|png|gif|webp|svg|ico|bmp|tiff?|mp4|webm|mov|mp3|wav|ogg|css|js|mjs|json|xml|rss|woff2?|ttf|eot|csv|xlsx?|docx?)$/i
const norm = (u) => {
  try {
    const x = new URL(u); x.hash = ''
    let s = x.toString()
    if (s.endsWith('/') && x.pathname !== '/') s = s.slice(0, -1)
    return s
  } catch { return null }
}
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor']
const C = { critical: '\x1b[31m', serious: '\x1b[33m', moderate: '\x1b[33m', minor: '\x1b[90m' }
const R = '\x1b[0m', B = '\x1b[1m', G = '\x1b[32m', RED = '\x1b[31m'

// ── Crawl ────────────────────────────────────────────────────────────────────
const origin = new URL(start).origin
const seen = new Set([norm(start)])
const queue = [norm(start)]
const results = []

const browser = await chromium.launch()
const ctx = await browser.newContext()
let scanned = 0

console.log(`\n${B}Scanning ${origin}${R}  (max ${max} pages)\n`)

while (queue.length && scanned < max) {
  const url = queue.shift()
  const page = await ctx.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    // Let client-rendered content settle (SPAs rarely hit networkidle)
    await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1200)
    const { violations } = await new AxeBuilder({ page }).analyze()
    results.push({ url, violations })
    scanned++

    const total = violations.reduce((s, v) => s + v.nodes.length, 0)
    console.log(`${B}${url}${R}  ${total === 0 ? `${G}✓ clean${R}` : `${RED}${total} issues${R}`}`)
    for (const v of [...violations].sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact))) {
      console.log(`  ${C[v.impact] ?? ''}[${v.impact}]${R} ${v.help} ${B}×${v.nodes.length}${R}`)
      console.log(`     ${'\x1b[2m'}${v.helpUrl}${R}`)
    }

    if (scanned < max) {
      const links = await page.$$eval('a[href]', els => els.map(e => e.href))
      for (const l of links) {
        const n = norm(l)
        if (!n || seen.has(n)) continue
        if (new URL(n).origin !== origin) continue
        if (SKIP_EXT.test(new URL(n).pathname)) continue
        seen.add(n)
        if (queue.length + scanned < max) queue.push(n)
      }
    }
  } catch (e) {
    results.push({ url, error: String(e?.message ?? e) })
    scanned++
    console.log(`${B}${url}${R}  ${RED}✗ ${e?.message ?? e}${R}`)
  } finally {
    await page.close()
  }
}
await browser.close()

// ── Summary ──────────────────────────────────────────────────────────────────
const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 }
for (const r of results)
  for (const v of (r.violations ?? []))
    counts[v.impact] = (counts[v.impact] ?? 0) + v.nodes.length
const grand = Object.values(counts).reduce((a, b) => a + b, 0)

console.log(`\n${B}── Summary ──${R}`)
console.log(`Pages scanned: ${scanned}`)
console.log(`Total issues:  ${grand}  (${RED}critical ${counts.critical}${R}, ${C.serious}serious ${counts.serious}${R}, moderate ${counts.moderate}, ${'\x1b[2m'}minor ${counts.minor}${R})`)

if (out) {
  writeFileSync(out, JSON.stringify({ start, scanned, counts, results }, null, 2))
  console.log(`Report → ${out}`)
}
process.exit(grand > 0 ? 1 : 0)
