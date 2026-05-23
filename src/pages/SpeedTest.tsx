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
  const latest = samples.at(-1) ?? null
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
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isActive ? color : undefined }}
            className={`text-xs font-semibold uppercase tracking-wider ${isActive ? '' : 'text-gray-400 dark:text-gray-600'}`}>
            {label}
          </span>
        </div>
        <span className="text-xs font-mono font-semibold tabular-nums"
          style={{ color: latest !== null ? color : undefined }}
          className={latest !== null ? '' : 'text-gray-300 dark:text-gray-700'}>
          {latest !== null ? `${latest.toFixed(1)}` : '--'}<span className="text-gray-400 font-normal"> Mbps</span>
        </span>
      </div>

      <div className="relative flex items-end gap-px rounded-lg px-0.5 py-0.5"
        style={{ height: 52, backgroundColor: isActive ? bgColor : undefined }}
        className={`relative flex items-end gap-px rounded-lg px-0.5 py-0.5 ${isActive ? '' : 'bg-gray-50 dark:bg-gray-800/40'}`}>
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
  const gridColor = isDark ? '#1f2937' : '#f3f4f6'
  const axisColor = isDark ? '#6b7280' : '#9ca3af'
  const tooltipBg = isDark ? '#111827' : '#ffffff'
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb'
  const tooltipText = isDark ? '#f3f4f6' : '#111827'

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
        <div className="p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20">
          <Gauge size={20} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('speedTest.title')}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Cloudflare · {t(`speedTest.mode${mode === 'continuous' ? 'Continuous' : 'Max'}`)}</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-gray-100/80 dark:bg-white/[0.05] rounded-xl w-fit border border-gray-200/60 dark:border-white/[0.06]">
        {(['continuous', 'max'] as const).map((m) => (
          <button key={m} onClick={() => { if (!isRunning) setMode(m) }} disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed ${
              mode === m
                ? 'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm dark:shadow-none border border-gray-200/80 dark:border-white/10'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {m === 'continuous' ? <Activity size={15} /> : <Zap size={15} />}
            {t(`speedTest.mode${m === 'continuous' ? 'Continuous' : 'Max'}`)}
          </button>
        ))}
      </div>

      {/* Duration selector */}
      {mode === 'continuous' && !isRunning && (
        <div className="flex items-center gap-3 flex-wrap">
          <Timer size={14} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">Run for</span>
          <div className="flex gap-1.5 flex-wrap">
            {DURATION_OPTIONS.map(({ label, ms }) => (
              <button key={label} onClick={() => setLimitMs(ms)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  limitMs === ms
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>{label}
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
              )}
              <span className={`text-sm ${phase === 'complete' ? 'text-emerald-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {phaseKey(phase) ? t(phaseKey(phase)) : ''}
              </span>
            </>
          )}
        </div>
        {remaining !== null && (
          <span className="text-sm tabular-nums font-mono text-gray-400">
            {formatCountdown(remaining)} remaining
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map(({ key, value, unit, color, decimals }) => (
          <div key={key} className="rounded-2xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] p-6 flex flex-col items-center gap-1">
            <p className="text-4xl font-bold tabular-nums transition-colors duration-300"
              style={{ color: value !== null ? color : undefined }}
              className={`text-4xl font-bold tabular-nums transition-colors duration-300 ${value !== null ? '' : 'text-gray-300 dark:text-gray-700'}`}>
              {fmt(value, decimals)}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{unit}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t(`speedTest.${key}`)}</p>
          </div>
        ))}
      </div>

      {/* Combined data card — always visible in continuous mode */}
      {mode === 'continuous' && (
        <div className="rounded-2xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] p-6 space-y-5">

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
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: DL_COLOR }} />
              {t('speedTest.download')}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: UL_COLOR }} />
              {t('speedTest.upload')}
            </div>
          </div>

          {/* Historical line chart */}
          {history.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isRunning ? (
          <button onClick={stop}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold transition-colors">
            <Square size={15} fill="currentColor" />{t('speedTest.stop')}
          </button>
        ) : (
          <button onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold transition-colors">
            <Zap size={17} />{t('speedTest.start')}
          </button>
        )}
        {phase === 'complete' && (
          <button onClick={handleStart}
            className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {t('speedTest.retest')}
          </button>
        )}
      </div>
    </div>
  )
}
