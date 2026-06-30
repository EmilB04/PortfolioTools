import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Accessibility, ScanLine, Square, Loader2, AlertTriangle,
  CheckCircle2, ChevronDown, ExternalLink, Globe, History, Trash2, Eye,
  Copy, Check,
} from 'lucide-react'
import {
  loadScans, saveScan, deleteScan, clearScans,
  type PageResult, type WcagScanEntry,
} from '../utils/wcagStorage'

const ACCENT = '#14b8a6'
// Same-origin Cloudflare Pages Function. Override with VITE_WCAG_WORKER_URL for local dev.
const SCAN_URL = (import.meta.env.VITE_WCAG_WORKER_URL as string | undefined) || '/api/wcag-scan'

type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

const IMPACT_COLOR: Record<string, string> = {
  critical: '#dc2626',
  serious:  '#ea580c',
  moderate: '#d97706',
  minor:    '#6b7280',
}
const IMPACT_ORDER: Impact[] = ['critical', 'serious', 'moderate', 'minor']

const MAX_OPTIONS = [5, 10, 20, 30]

// Build the plain-text summary for a set of page results. Reused by the live
// view and by each history row's expandable preview.
function buildSummary(pages: PageResult[], url: string): string {
  if (pages.length === 0) return ''
  const counts: Record<Impact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const p of pages)
    for (const v of p.violations) {
      const imp = (v.impact ?? 'minor') as Impact
      if (imp in counts) counts[imp] += v.nodeCount
    }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const target = (url.trim() || pages[0]?.url || '').replace(/^https?:\/\//, '')
  const lines: string[] = []
  lines.push(`WCAG scan — ${target}`)
  lines.push(`Pages scanned: ${pages.length}`)
  lines.push(
    `Total issues: ${total} ` +
    `(critical ${counts.critical}, serious ${counts.serious}, ` +
    `moderate ${counts.moderate}, minor ${counts.minor})`,
  )
  lines.push('')
  for (const p of pages) {
    const pageUrl = p.url.replace(/^https?:\/\//, '')
    if (p.error) { lines.push(`${pageUrl} — ERROR: ${p.error}`); continue }
    const count = p.violations.reduce((s, v) => s + v.nodeCount, 0)
    if (count === 0) { lines.push(`${pageUrl} — no issues`); continue }
    lines.push(`${pageUrl} — ${count} issue${count === 1 ? '' : 's'}`)
    for (const v of [...p.violations].sort(
      (a, b) => IMPACT_ORDER.indexOf((a.impact ?? 'minor') as Impact) - IMPACT_ORDER.indexOf((b.impact ?? 'minor') as Impact),
    )) {
      lines.push(`  [${v.impact ?? 'minor'}] ${v.help} (×${v.nodeCount}) — ${v.helpUrl}`)
    }
  }
  return lines.join('\n')
}

export function WcagScanner() {
  const { t } = useTranslation()
  const [url, setUrl]           = useState('')
  const [maxPages, setMaxPages] = useState(10)
  const [pages, setPages]       = useState<PageResult[]>([])
  const [status, setStatus]     = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [openPage, setOpenPage] = useState<string | null>(null)
  const [history, setHistory]   = useState<WcagScanEntry[]>(() => loadScans())
  const [openHistory, setOpenHistory] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const totals = useMemo(() => {
    const counts: Record<Impact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 }
    for (const p of pages)
      for (const v of p.violations) {
        const imp = (v.impact ?? 'minor') as Impact
        if (imp in counts) counts[imp] += v.nodeCount
      }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return { counts, total }
  }, [pages])

  const [copied, setCopied] = useState(false)

  const summaryText = useMemo(() => buildSummary(pages, url), [pages, url])

  const copySummary = useCallback(async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable */ }
  }, [summaryText])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus(s => (s === 'scanning' ? 'done' : s))
  }, [])

  const scan = useCallback(async () => {
    const target = url.trim()
    if (!target) return
    const full = /^https?:\/\//i.test(target) ? target : `https://${target}`

    setPages([]); setOpenPage(null); setErrorMsg(null); setStatus('scanning')
    const ac = new AbortController()
    abortRef.current = ac
    const collected: PageResult[] = []

    try {
      const res = await fetch(SCAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: full, maxPages }),
        signal: ac.signal,
      })
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `Worker returned ${res.status}`)
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2)
          if (!chunk.startsWith('data: ')) continue
          const ev = JSON.parse(chunk.slice(6))
          if (ev.type === 'page') {
            const pr: PageResult = { url: ev.url, violations: ev.violations ?? [], error: ev.error }
            collected.push(pr)
            setPages(prev => [...prev, pr])
          } else if (ev.type === 'done') {
            setStatus('done')
          } else if (ev.type === 'error') {
            setErrorMsg(ev.message); setStatus('error')
          }
        }
      }
      setStatus(s => (s === 'scanning' ? 'done' : s))
      if (collected.length > 0) {
        const totalIssues = collected.reduce(
          (s, p) => s + p.violations.reduce((n, v) => n + v.nodeCount, 0), 0,
        )
        const entry: WcagScanEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          url: full,
          maxPages,
          pages: collected,
          pagesScanned: collected.length,
          totalIssues,
        }
        setHistory(saveScan(entry))
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setErrorMsg(e instanceof Error ? e.message : 'Scan failed')
      setStatus('error')
    } finally {
      abortRef.current = null
    }
  }, [url, maxPages])

  const isScanning = status === 'scanning'

  const viewScan = useCallback((entry: WcagScanEntry) => {
    abortRef.current?.abort()
    abortRef.current = null
    setUrl(entry.url)
    setMaxPages(entry.maxPages)
    setPages(entry.pages)
    setOpenPage(null)
    setErrorMsg(null)
    setStatus('done')
  }, [])

  const removeScan = useCallback((id: string) => setHistory(deleteScan(id)), [])
  const clearAll = useCallback(() => setHistory(clearScans()), [])

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border"
          style={{ background: 'rgba(20,184,166,0.12)', borderColor: 'rgba(20,184,166,0.35)' }}>
          <Accessibility size={20} style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {t('wcagScanner.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
            {t('wcagScanner.subtitle')}
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl border px-3 py-2.5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Globe size={15} style={{ color: 'var(--text-subtle)' }} className="shrink-0" />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !isScanning) scan() }}
            disabled={isScanning}
            placeholder={t('wcagScanner.placeholder')}
            className="flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
            style={{ color: 'var(--text)' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: 'var(--text-subtle)' }}>{t('wcagScanner.pages')}</span>
          <div className="flex gap-1 p-1 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {MAX_OPTIONS.map(n => (
              <button key={n} onClick={() => setMaxPages(n)} disabled={isScanning}
                className="px-2.5 py-1 rounded-lg text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed"
                style={{
                  background: maxPages === n ? ACCENT : 'transparent',
                  color: maxPages === n ? '#ffffff' : 'var(--text-subtle)',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {isScanning ? (
          <button onClick={stop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#dc2626' }}>
            <Square size={13} fill="currentColor" /> {t('wcagScanner.stop')}
          </button>
        ) : (
          <button onClick={scan} disabled={!url.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: ACCENT }}>
            <ScanLine size={15} /> {t('wcagScanner.scan')}
          </button>
        )}
      </div>

      {/* Status line */}
      {(isScanning || pages.length > 0) && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
          {isScanning && <Loader2 size={14} className="animate-spin" style={{ color: ACCENT }} />}
          <span>{t('wcagScanner.scanned', { count: pages.length })}</span>
          {status === 'done' && totals.total === 0 && (
            <span className="flex items-center gap-1" style={{ color: '#10b981' }}>
              <CheckCircle2 size={14} /> {t('wcagScanner.clean')}
            </span>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-sm flex items-center gap-1.5" style={{ color: '#ef4444' }}>
          <AlertTriangle size={14} /> {errorMsg}
        </p>
      )}

      {/* Summary */}
      {totals.total > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {IMPACT_ORDER.map(imp => (
            <div key={imp} className="rounded-xl border p-3 flex flex-col items-center"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <span className="text-2xl font-bold tabular-nums" style={{ color: IMPACT_COLOR[imp] }}>
                {totals.counts[imp]}
              </span>
              <span className="text-xs capitalize mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                {t(`wcagScanner.impact.${imp}`)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Per-page results */}
      <div className="space-y-2">
        {pages.map(p => {
          const count = p.violations.reduce((s, v) => s + v.nodeCount, 0)
          const isOpen = openPage === p.url
          return (
            <div key={p.url} className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <button onClick={() => setOpenPage(isOpen ? null : p.url)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm truncate" style={{ color: 'var(--text)' }}>
                  {p.url.replace(/^https?:\/\//, '')}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  {p.error ? (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#ef4444' }}>
                      <AlertTriangle size={12} /> {t('wcagScanner.pageError')}
                    </span>
                  ) : count === 0 ? (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                      <CheckCircle2 size={12} /> 0
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
                      {t('wcagScanner.issues', { count })}
                    </span>
                  )}
                  <ChevronDown size={15} className="transition-transform duration-200"
                    style={{ color: 'var(--text-subtle)', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  {p.error && (
                    <p className="text-sm" style={{ color: '#ef4444' }}>{p.error}</p>
                  )}
                  {!p.error && p.violations.length === 0 && (
                    <p className="text-sm" style={{ color: '#10b981' }}>{t('wcagScanner.pageClean')}</p>
                  )}
                  {[...p.violations]
                    .sort((a, b) => IMPACT_ORDER.indexOf((a.impact ?? 'minor') as Impact) - IMPACT_ORDER.indexOf((b.impact ?? 'minor') as Impact))
                    .map(v => (
                      <div key={v.id} className="rounded-lg border p-3"
                        style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded"
                                style={{ background: `${IMPACT_COLOR[v.impact ?? 'minor']}22`, color: IMPACT_COLOR[v.impact ?? 'minor'] }}>
                                {v.impact ?? 'minor'}
                              </span>
                              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{v.help}</span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{v.description}</p>
                          </div>
                          <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-subtle)' }}>
                            ×{v.nodeCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <a href={v.helpUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs flex items-center gap-1 hover:underline" style={{ color: ACCENT }}>
                            {t('wcagScanner.howToFix')} <ExternalLink size={11} />
                          </a>
                        </div>
                        {v.nodes[0] && (
                          <pre className="text-xs mt-2 p-2 rounded overflow-x-auto"
                            style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                            {v.nodes[0].html}
                          </pre>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Copyable summary */}
      {pages.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {t('wcagScanner.summary')}
            </h2>
            <button onClick={copySummary}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-80"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: copied ? '#10b981' : 'var(--text-subtle)' }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? t('wcagScanner.copied') : t('wcagScanner.copy')}
            </button>
          </div>
          <pre className="text-xs p-3 rounded-xl border overflow-x-auto whitespace-pre-wrap break-words"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {summaryText}
          </pre>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
              <History size={14} style={{ color: 'var(--text-subtle)' }} /> {t('wcagScanner.history')}
            </h2>
            <button onClick={clearAll}
              className="text-xs hover:underline" style={{ color: 'var(--text-subtle)' }}>
              {t('wcagScanner.clearHistory')}
            </button>
          </div>
          {history.map(h => {
            const isOpen = openHistory === h.id
            return (
            <div key={h.id} className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <button onClick={() => setOpenHistory(isOpen ? null : h.id)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  <ChevronDown size={15} className="shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--text-subtle)', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--text)' }}>
                      {h.url.replace(/^https?:\/\//, '')}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                      {new Date(h.timestamp).toLocaleString()} · {t('wcagScanner.scanned', { count: h.pagesScanned })}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {h.totalIssues === 0 ? (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                      <CheckCircle2 size={12} /> 0
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
                      {t('wcagScanner.issues', { count: h.totalIssues })}
                    </span>
                  )}
                  <button onClick={() => viewScan(h)} title={t('wcagScanner.view')}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ color: ACCENT }}>
                    <Eye size={15} />
                  </button>
                  <button onClick={() => removeScan(h.id)} title={t('wcagScanner.delete')}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-subtle)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {isOpen && (
                <pre className="text-xs px-4 pb-4 pt-3 border-t overflow-x-auto whitespace-pre-wrap break-words"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {buildSummary(h.pages, h.url)}
                </pre>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
