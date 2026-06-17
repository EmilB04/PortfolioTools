import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Accessibility, ScanLine, Square, Loader2, AlertTriangle,
  CheckCircle2, ChevronDown, ExternalLink, Globe,
} from 'lucide-react'

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

interface ViolationNode { html: string; target: string[]; failureSummary: string }
interface Violation {
  id: string
  impact: string | null
  help: string
  helpUrl: string
  description: string
  nodes: ViolationNode[]
  nodeCount: number
}
interface PageResult { url: string; violations: Violation[]; error?: string }

const MAX_OPTIONS = [5, 10, 20, 30]

export function WcagScanner() {
  const { t } = useTranslation()
  const [url, setUrl]           = useState('')
  const [maxPages, setMaxPages] = useState(10)
  const [pages, setPages]       = useState<PageResult[]>([])
  const [status, setStatus]     = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [openPage, setOpenPage] = useState<string | null>(null)
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
            setPages(prev => [...prev, { url: ev.url, violations: ev.violations ?? [], error: ev.error }])
          } else if (ev.type === 'done') {
            setStatus('done')
          } else if (ev.type === 'error') {
            setErrorMsg(ev.message); setStatus('error')
          }
        }
      }
      setStatus(s => (s === 'scanning' ? 'done' : s))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setErrorMsg(e instanceof Error ? e.message : 'Scan failed')
      setStatus('error')
    } finally {
      abortRef.current = null
    }
  }, [url, maxPages])

  const isScanning = status === 'scanning'

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
    </div>
  )
}
