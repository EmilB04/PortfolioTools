import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge, Activity, Zap, Square, Timer } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useSpeedTest, type TestPhase } from '../hooks/useSpeedTest'
import { useTheme } from '../contexts/ThemeContext'

type Mode = 'continuous' | 'max'

const DURATION_OPTIONS: { label: string; ms: number | null }[] = [
  { label: '∞', ms: null },
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 300_000 },
  { label: '10 min', ms: 600_000 },
  { label: '30 min', ms: 1_800_000 },
]

// Blue for download, amber for upload, violet for ping
const DL_COLOR = '#3b82f6'
const UL_COLOR = '#f59e0b'
const PING_COLOR = '#8b5cf6'

function fmt(value: number | null, decimals: number): string {
  return value === null ? '--' : value.toFixed(decimals)
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ── Single-metric waveform ─────────────────────────────────────────────────────
function Waveform({
  samples, isActive, color, bgColor, label,
}: {
  samples: number[]
  isActive: boolean
  color: string
  bgColor: string
  label: string
}) {
  const BARS = 60
  const max = Math.max(10, ...samples) * 1.15
  const pad = Math.max(0, BARS - samples.length)
  const latest = samples[samples.length - 1] ?? null
  const visible = samples.slice(-BARS)

  return (
    <div className={`rounded-xl p-3 border transition-colors ${isActive ? 'border-current/20' : 'border-gray-100 dark:border-gray-800'}`}
      style={{ borderColor: isActive ? `${color}33` : undefined }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {isActive ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: color }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: color }} />
            </span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
          <span className={`text-xs font-semibold uppercase tracking-wider ${isActive ? '' : 'text-gray-400 dark:text-gray-600'}`}
            style={{ color: isActive ? color : undefined }}>
            {label}
          </span>
        </div>
        <span className={`text-xs font-mono font-semibold tabular-nums ${latest !== null ? '' : 'text-gray-300 dark:text-gray-700'}`}
          style={{ color: latest !== null ? color : undefined }}>
          {latest !== null ? `${latest.toFixed(1)}` : '--'}<span className="text-gray-400 font-normal"> Mbps</span>
        </span>
      </div>

      <div className={`relative flex items-end gap-px rounded-lg px-0.5 py-0.5 ${isActive ? '' : 'bg-gray-50 dark:bg-gray-800/40'}`}
        style={{ height: 52, backgroundColor: isActive ? bgColor : undefined }}>
        {/* midline */}
        <div className="absolute left-0.5 right-0.5 border-t border-dashed border-gray-200 dark:border-gray-700" style={{ top: '50%' }} />
        {/* padding bars */}
        {Array.from({ length: pad }, (_, i) => (
          <div key={`p${i}`} className="flex-1 rounded-sm bg-gray-200 dark:bg-gray-700 opacity-20" style={{ height: 3 }} />
        ))}
        {/* data bars */}
        {visible.map((s, i, arr) => {
          const pct = Math.min(100, (s / max) * 100)
          const opacity = (isActive ? 0.35 : 0.2) + (isActive ? 0.65 : 0.3) * ((i + 1) / arr.length)
          return (
            <div key={i} className="flex-1 rounded-sm transition-all duration-150"
              style={{ height: `${Math.max(4, pct)}%`, opacity, backgroundColor: color }} />
          )
        })}
      </div>
    </div>
  )
}

function phaseKey(phase: TestPhase): string {
  if (phase === 'idle') return ''
  if (phase === 'complete') return 'speedTest.phase.complete'
  return `speedTest.phase.${phase}`
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function SpeedTest() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [mode, setMode] = useState<Mode>('continuous')
  const [limitMs, setLimitMs] = useState<number | null>(null)
  const { phase, current, dlSamples, ulSamples, history, start, stop, isRunning } = useSpeedTest()

  const startedAtRef = useRef<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!isRunning || !limitMs) { setRemaining(null); return }
    startedAtRef.current = Date.now()
    const id = setInterval(() => {
      setRemaining(Math.max(0, limitMs - (Date.now() - (startedAtRef.current ?? Date.now()))))
    }, 500)
    return () => clearInterval(id)
  }, [isRunning, limitMs])

  const handleStart = () => start(mode, limitMs ?? undefined)

  const isDark = theme === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(28,16,37,0.06)'
  const axisColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(28,16,37,0.4)'
  const tooltipBg = isDark ? '#000000' : '#f7f4f1'
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,16,37,0.09)'
  const tooltipText = isDark ? '#ffffff' : '#1c1025'

  const chartData = history.map((m, i) => ({ i, dl: m.download, ul: m.upload }))

  const metrics = [
    { key: 'download', value: current.download, unit: t('speedTest.mbps'), color: DL_COLOR, decimals: 1 },
    { key: 'upload',   value: current.upload,   unit: t('speedTest.mbps'), color: UL_COLOR, decimals: 1 },
    { key: 'ping',     value: current.ping,      unit: t('speedTest.ms'),  color: PING_COLOR, decimals: 0 },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border" style={{ background: 'var(--accent-bg)', borderColor: 'var(--accent-border)' }}>
          <Gauge size={20} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>{t('speedTest.title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>Cloudflare · {t(`speedTest.mode${mode === 'continuous' ? 'Continuous' : 'Max'}`)}</p>
        </div>
      </div>

      {/* Mode tabs + primary action */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {(['continuous', 'max'] as const).map((m) => (
            <button key={m} onClick={() => { if (!isRunning) setMode(m) }} disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed"
              style={{
                background: mode === m ? 'var(--surface-card)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-subtle)',
                borderColor: mode === m ? 'var(--border)' : 'transparent',
              }}>
              {m === 'continuous' ? <Activity size={15} /> : <Zap size={15} />}
              {t(`speedTest.mode${m === 'continuous' ? 'Continuous' : 'Max'}`)}
            </button>
          ))}
        </div>

        {isRunning ? (
          <button onClick={stop}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all duration-150 hover:opacity-90"
            style={{ background: '#dc2626' }}>
            <Square size={13} fill="currentColor" />{t('speedTest.stop')}
          </button>
        ) : (
          <button onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all duration-150 hover:opacity-90"
            style={{ background: 'var(--accent)' }}>
            <Zap size={15} />{t('speedTest.start')}
          </button>
        )}
        {phase === 'complete' && (
          <button onClick={handleStart}
            className="px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface-card)' }}>
            {t('speedTest.retest')}
          </button>
        )}
      </div>

      {/* Duration selector */}
      {mode === 'continuous' && !isRunning && (
        <div className="flex items-center gap-3 flex-wrap">
          <Timer size={14} style={{ color: 'var(--text-subtle)' }} className="shrink-0" />
          <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>Run for</span>
          <div className="flex gap-1.5 flex-wrap">
            {DURATION_OPTIONS.map(({ label, ms }) => (
              <button key={label} onClick={() => setLimitMs(ms)}
                className="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: limitMs === ms ? 'var(--accent)' : 'var(--surface-card)',
                  color: limitMs === ms ? '#ffffff' : 'var(--text-muted)',
                  borderColor: 'var(--border)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phase indicator + countdown */}
      <div className="h-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {phase !== 'idle' && (
            <>
              {isRunning && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--accent)' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent)' }} />
                </span>
              )}
              <span className="text-sm font-medium" style={{ color: phase === 'complete' ? '#10b981' : 'var(--text-subtle)' }}>
                {phaseKey(phase) ? t(phaseKey(phase)) : ''}
              </span>
            </>
          )}
        </div>
        {remaining !== null && (
          <span className="text-sm tabular-nums font-mono" style={{ color: 'var(--text-subtle)' }}>
            {formatCountdown(remaining)} remaining
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {metrics.map(({ key, value, unit, color, decimals }) => (
          <div key={key} className="rounded-2xl border p-4 sm:p-6 flex flex-col items-center gap-1"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-3xl sm:text-4xl font-bold tabular-nums transition-colors duration-300"
              style={{ color: value !== null ? color : 'var(--text-subtle)' }}>
              {fmt(value, decimals)}
            </p>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--text-subtle)' }}>{unit}</p>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t(`speedTest.${key}`)}</p>
          </div>
        ))}
      </div>

      {/* Combined data card — always visible in continuous mode */}
      {mode === 'continuous' && (
        <div className="rounded-2xl border p-4 sm:p-6 space-y-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

          {/* Two waveforms side by side */}
          <div className="grid grid-cols-2 gap-3">
            <Waveform
              samples={dlSamples}
              isActive={phase === 'download'}
              color={DL_COLOR}
              bgColor="#3b82f610"
              label={t('speedTest.download')}
            />
            <Waveform
              samples={ulSamples}
              isActive={phase === 'upload'}
              color={UL_COLOR}
              bgColor="#f59e0b10"
              label={t('speedTest.upload')}
            />
          </div>

          {/* Chart legend */}
          <div className="flex gap-5">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: DL_COLOR }} />
              {t('speedTest.download')}
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: UL_COLOR }} />
              {t('speedTest.upload')}
            </div>
          </div>

          {/* Historical line chart */}
          {history.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--text-subtle)' }}>
              {t('speedTest.chartEmpty')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} unit=" Mbps" width={72} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '0.5rem', fontSize: '12px', color: tooltipText }}
                  formatter={(value) => [`${value} Mbps`]}
                />
                <Line type="monotone" dataKey="dl" name={t('speedTest.download')} stroke={DL_COLOR}
                  strokeWidth={2} dot={{ r: 3, fill: DL_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ul" name={t('speedTest.upload')} stroke={UL_COLOR}
                  strokeWidth={2} dot={{ r: 3, fill: UL_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Session summary — continuous mode only, shown when complete */}
      {mode === 'continuous' && phase === 'complete' && history.length > 0 && (() => {
        const avgDl = history.reduce((s, m) => s + (m.download ?? 0), 0) / history.length
        const avgUl = history.reduce((s, m) => s + (m.upload ?? 0), 0) / history.length
        const avgPing = history.reduce((s, m) => s + (m.ping ?? 0), 0) / history.length
        const peakDl = Math.max(...history.map(m => m.download ?? 0))
        const peakUl = Math.max(...history.map(m => m.upload ?? 0))
        return (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm uppercase tracking-wider">
                {t('speedTest.summary.title')}
              </h3>
              <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">
                {t('speedTest.summary.cycles', { count: history.length })}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: t('speedTest.summary.avgDownload'), value: avgDl.toFixed(1), unit: 'Mbps', color: DL_COLOR },
                { label: t('speedTest.summary.avgUpload'),   value: avgUl.toFixed(1), unit: 'Mbps', color: UL_COLOR },
                { label: t('speedTest.summary.avgPing'),     value: avgPing.toFixed(0), unit: 'ms', color: PING_COLOR },
                { label: t('speedTest.summary.peakDownload'), value: peakDl.toFixed(1), unit: 'Mbps', color: DL_COLOR },
                { label: t('speedTest.summary.peakUpload'),   value: peakUl.toFixed(1), unit: 'Mbps', color: UL_COLOR },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <span className="text-xl font-bold tabular-nums" style={{ color }}>{value}</span>
                  <span className="text-xs text-gray-400 font-normal">{unit}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

    </div>
  )
}
