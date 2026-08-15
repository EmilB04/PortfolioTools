import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, Copy, ShieldCheck } from 'lucide-react'
import { useCopy } from '../../hooks/useCopy'

/* ────────────────────────────────────────────────────────────────────────────
 * Shared building blocks for the utility tools. Every tool composes these so the
 * pages stay presentational and the card / border / spacing language matches the
 * rest of the app. All colours come from the theme tokens, with the per-tool
 * brand tone passed down as `--tool` and read through the `.tool-text` /
 * `.tool-fill` utilities, which already handle the light-theme contrast shift.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Page wrapper: brand header + a stack of panels. */
export function ToolShell({
  icon,
  color,
  title,
  subtitle,
  width = 'default',
  privacyNote,
  children,
}: {
  icon: ReactNode
  color: string
  title: string
  subtitle: string
  width?: 'wide' | 'default' | 'medium' | 'narrow'
  /** Reassurance line for tools that handle secrets. */
  privacyNote?: string
  children: ReactNode
}) {
  const widthClass =
    width === 'wide' ? 'page-container-wide'
    : width === 'medium' ? 'page-container-medium'
    : width === 'narrow' ? 'page-container-narrow'
    : ''

  return (
    <div
      className={`page-container ${widthClass} space-y-6`}
      style={{ '--tool': color } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2.5 rounded-xl border shrink-0"
          style={{ background: `${color}1f`, borderColor: `${color}59` }}
        >
          <span className="tool-text flex">{icon}</span>
        </div>
        <div className="min-w-0">
          <h1 className="fs-xl font-display font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {title}
          </h1>
          <p className="fs-sm mt-0.5 prose-measure" style={{ color: 'var(--text-subtle)' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {privacyNote && (
        <p
          className="flex items-start gap-2 rounded-xl border px-3 py-2.5 fs-xs prose-measure"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text-subtle)' }}
        >
          <ShieldCheck size={14} className="tool-text mt-0.5 shrink-0" aria-hidden="true" />
          <span>{privacyNote}</span>
        </p>
      )}

      {children}
    </div>
  )
}

/** A bordered surface section. Pass `title` to get an accessible labelled region. */
export function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`rounded-2xl border ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {(title || actions) && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
          style={{ borderColor: 'var(--border)' }}
        >
          {title && (
            <h2
              id={headingId}
              className="fs-xs font-mono font-medium uppercase tracking-[0.16em]"
              style={{ color: 'var(--text-subtle)' }}
            >
              {title}
            </h2>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Label + control + optional hint, wired up with htmlFor / aria-describedby. */
export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: (props: { id: string; 'aria-describedby'?: string }) => ReactNode
  className?: string
}) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
        {label}
      </label>
      {children({ id, 'aria-describedby': hint ? hintId : undefined })}
      {hint && (
        <p id={hintId} className="fs-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

const CONTROL_CLASS =
  'w-full rounded-xl border px-3 py-2.5 fs-sm outline-none transition-colors placeholder:opacity-60'

const controlStyle: React.CSSProperties = {
  background: 'var(--surface-card)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
}

export function TextInput({
  mono,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      {...props}
      className={`${CONTROL_CLASS} ${mono ? 'font-mono' : ''} ${className}`}
      style={controlStyle}
    />
  )
}

export function TextArea({
  mono = true,
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }) {
  return (
    <textarea
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      {...props}
      className={`${CONTROL_CLASS} resize-y leading-relaxed ${mono ? 'font-mono' : ''} ${className}`}
      style={controlStyle}
    />
  )
}

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${CONTROL_CLASS} cursor-pointer ${className}`} style={controlStyle} />
  )
}

/**
 * Radio-style tab group. Implements the WAI-ARIA radiogroup keyboard pattern:
 * arrows move and select, Home/End jump to the ends.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = options.length - 1
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex flex-wrap gap-1 p-1 rounded-xl border ${className}`}
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
    >
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            ref={el => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            onKeyDown={e => onKeyDown(e, i)}
            className={`flex-1 min-w-[3.5rem] px-2.5 py-1.5 rounded-lg fs-xs font-semibold transition-all duration-150 ${
              active ? 'tool-fill text-white' : ''
            }`}
            style={active ? undefined : { color: 'var(--text-subtle)' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function ActionButton({
  variant = 'ghost',
  icon,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost'
  icon?: ReactNode
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 fs-xs font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'

  if (variant === 'primary') {
    return (
      <button type="button" {...props} className={`tool-fill text-white ${base} hover:opacity-90 ${className}`}>
        {icon}
        {children}
      </button>
    )
  }

  return (
    <button
      type="button"
      {...props}
      className={`${base} border hover:opacity-80 ${variant === 'outline' ? 'tool-text' : ''} ${className}`}
      style={{
        borderColor: variant === 'outline' ? 'var(--border-strong)' : 'var(--border)',
        color: variant === 'ghost' ? 'var(--text-muted)' : undefined,
        background: 'var(--surface-card)',
      }}
    >
      {icon}
      {children}
    </button>
  )
}

/** Copy button with a live-region acknowledgement, for screen-reader feedback. */
export function CopyButton({
  value,
  label,
  disabled,
  className = '',
}: {
  value: string
  /** Overrides the default "Copy" wording, e.g. "Copy payload". */
  label?: string
  disabled?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const { copy, copied, failed } = useCopy()
  const text = label ?? t('toolCommon.copy')

  return (
    <>
      <ActionButton
        variant="outline"
        onClick={() => copy(value)}
        disabled={disabled || !value}
        aria-label={text}
        icon={copied ? <Check size={13} /> : <Copy size={13} />}
        className={className}
      >
        {copied ? t('toolCommon.copied') : failed ? t('toolCommon.copyFailed') : text}
      </ActionButton>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? t('toolCommon.copied') : failed ? t('toolCommon.copyFailed') : ''}
      </span>
    </>
  )
}

/** Inline error for malformed input. Announced politely rather than assertively. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border px-3 py-2.5 fs-xs"
      style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', color: 'var(--text)' }}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} aria-hidden="true" />
      <span className="break-words">{children}</span>
    </p>
  )
}

/** Read-only monospace result surface with a copy affordance in the header. */
export function OutputBlock({
  label,
  value,
  placeholder,
  rows = 10,
  extraActions,
}: {
  label: string
  value: string
  placeholder?: string
  rows?: number
  extraActions?: ReactNode
}) {
  const id = useId()

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
          {label}
        </label>
        <div className="flex items-center gap-2">
          {extraActions}
          <CopyButton value={value} />
        </div>
      </div>
      <TextArea id={id} readOnly value={value} rows={rows} placeholder={placeholder} aria-label={label} />
    </div>
  )
}

/** Definition-list row used by the read-only inspector tools. */
export function DataRow({ label, children, mono = true }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[minmax(9rem,14rem)_1fr] sm:gap-4">
      <dt className="fs-xs" style={{ color: 'var(--text-subtle)' }}>{label}</dt>
      <dd className={`fs-sm break-words ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text)' }}>
        {children}
      </dd>
    </div>
  )
}

/** Small stat tile, used where a tool reports a handful of derived numbers. */
export function StatTile({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5 min-w-0"
      title={title}
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
    >
      <p className="fs-sm font-mono font-semibold leading-none tracking-tight break-all" style={{ color: 'var(--text)' }}>
        {value}
      </p>
      <p className="fs-xs mt-1 leading-snug" style={{ color: 'var(--text-subtle)' }}>{label}</p>
    </div>
  )
}
