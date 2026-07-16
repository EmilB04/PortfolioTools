import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DoorOpen, LogIn, LogOut, Plus, Minus, Pencil, RotateCcw, Smartphone } from 'lucide-react'
import { loadCounterState, saveCounterState } from '../utils/counterStorage'
import { haptic } from '../utils/haptics'

// ── Constants ────────────────────────────────────────────────────────────────────

type Mode = 'entered' | 'exited'

const MODE_COLORS: Record<Mode, { color: string; bg: string; border: string }> = {
  entered: { color: '#22c55e', bg: 'rgba(34,197,94,0.13)', border: 'rgba(34,197,94,0.4)' },
  exited:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.4)' },
}

type ConfirmState = {
  title: string
  body: string
  accentColor: string
  onConfirm: () => void
} | null

// ── Component ──────────────────────────────────────────────────────────────────────

export function Counter() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('entered')
  const [counts, setCounts] = useState(() => loadCounterState())
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { saveCounterState(counts) }, [counts])

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select() }
  }, [editing])

  const modeColors = MODE_COLORS[mode]
  const modeLabel = mode === 'entered' ? t('counter.entered') : t('counter.exited')
  const net = counts.entered - counts.exited

  const increment = (target?: HTMLElement) => {
    haptic('light', target)
    setCounts(c => ({ ...c, [mode]: c[mode] + 1 }))
  }

  const requestDecrement = (target?: HTMLElement) => {
    if (counts[mode] === 0) return
    haptic('medium', target)
    setConfirm({
      title: t('counter.confirmRemoveTitle'),
      body: t('counter.confirmRemoveBody', { label: modeLabel, from: counts[mode], to: counts[mode] - 1 }),
      accentColor: modeColors.color,
      onConfirm: () => setCounts(c => ({ ...c, [mode]: Math.max(0, c[mode] - 1) })),
    })
  }

  const startEdit = () => { setEditValue(String(counts[mode])); setEditing(true) }

  const commitEdit = () => {
    setEditing(false)
    const val = Math.max(0, parseInt(editValue, 10) || 0)
    const current = counts[mode]
    if (val === current) return
    haptic('medium', inputRef.current)
    setConfirm({
      title: t('counter.confirmEditTitle'),
      body: t('counter.confirmEditBody', { label: modeLabel, from: current, to: val }),
      accentColor: modeColors.color,
      onConfirm: () => setCounts(c => ({ ...c, [mode]: val })),
    })
  }

  const requestReset = (target?: HTMLElement) => {
    haptic('medium', target)
    setConfirm({
      title: t('counter.confirmResetTitle'),
      body: t('counter.confirmResetBody'),
      accentColor: '#ef4444',
      onConfirm: () => setCounts({ entered: 0, exited: 0 }),
    })
  }

  return (
    <div className="max-w-md mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border"
          style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.35)' }}>
          <DoorOpen size={20} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {t('counter.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
            {t('counter.subtitle')}
          </p>
        </div>
      </div>

      {/* Mode switch */}
      <div className="flex gap-1 p-1 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {(['entered', 'exited'] as Mode[]).map(m => {
          const c = MODE_COLORS[m]
          const active = mode === m
          const Icon = m === 'entered' ? LogIn : LogOut
          return (
            <button key={m} onClick={e => { haptic('light', e.currentTarget); setMode(m) }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{ background: active ? c.color : 'transparent', color: active ? '#ffffff' : 'var(--text-subtle)' }}>
              <Icon size={16} />
              {m === 'entered' ? t('counter.entered') : t('counter.exited')}
            </button>
          )
        })}
      </div>

      {/* Counter card */}
      <div className="rounded-3xl border px-5 pt-7 pb-5 flex flex-col items-center gap-1.5 transition-colors duration-200"
        style={{ background: 'var(--surface)', borderColor: modeColors.border }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: modeColors.color }} />
          {modeLabel}
        </span>

        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur() }}
            className="w-[4.5ch] text-center bg-transparent outline-none border-b-2 mt-1"
            style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', borderColor: modeColors.color }}
          />
        ) : (
          <button onClick={startEdit}
            className="tabular-nums leading-none mt-1 border-b-2 border-transparent hover:border-dashed transition-colors"
            style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', borderColor: 'var(--border)' }}>
            {counts[mode]}
          </button>
        )}

        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-subtle)' }}>
          <Pencil size={11} />
          {t('counter.tapToCorrect')}
        </span>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border px-2 py-3"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-bold tabular-nums" style={{ color: MODE_COLORS.entered.color }}>{counts.entered}</span>
          <span className="text-[9.5px] uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>{t('counter.entered')}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-bold tabular-nums" style={{ color: MODE_COLORS.exited.color }}>{counts.exited}</span>
          <span className="text-[9.5px] uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>{t('counter.exited')}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-bold tabular-nums" style={{ color: 'var(--text)' }}>{net}</span>
          <span className="text-[9.5px] uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>{t('counter.netInside')}</span>
        </div>
      </div>

      {/* Action zone */}
      <div className="flex items-end justify-center gap-4 py-1">
        <button onClick={e => requestDecrement(e.currentTarget)} disabled={counts[mode] === 0} aria-label={t('counter.confirmRemoveTitle')}
          className="w-12 h-12 rounded-full border flex items-center justify-center mb-2 transition-opacity disabled:opacity-30"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-card)', color: 'var(--text-muted)' }}>
          <Minus size={18} />
        </button>
        <button onClick={e => increment(e.currentTarget)} aria-label={t('counter.entered')}
          className="w-36 h-36 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
          style={{ background: modeColors.color }}>
          <Plus size={56} />
        </button>
      </div>
      <p className="text-center text-xs -mt-2" style={{ color: 'var(--text-subtle)' }}>
        {t('counter.actionHint')}
      </p>

      {/* Utility row */}
      <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'var(--text-subtle)' }}>
        <span className="inline-flex items-center gap-1.5">
          <Smartphone size={13} />
          {t('counter.savedNote')}
        </span>
        <button onClick={e => requestReset(e.currentTarget)}
          className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:opacity-80">
          <RotateCcw size={13} />
          {t('counter.resetLabel')}
        </button>
      </div>

      {/* Confirm sheet */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirm(null) }}>
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border p-5 space-y-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>{confirm.title}</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{confirm.body}</p>
            <div className="flex gap-2.5 pt-1">
              <button onClick={e => { haptic('light', e.currentTarget); setConfirm(null) }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-card)', color: 'var(--text)' }}>
                {t('counter.cancel')}
              </button>
              <button onClick={e => { haptic('heavy', e.currentTarget); confirm.onConfirm(); setConfirm(null) }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: confirm.accentColor }}>
                {t('counter.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
