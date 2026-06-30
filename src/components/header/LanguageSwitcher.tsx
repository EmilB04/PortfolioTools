import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'no', label: 'Norsk' },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0]

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [])

  function select(code: string) {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-[38px] min-w-[7rem] items-center justify-between gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200"
        style={{
          background: 'var(--surface)',
          borderColor: open ? 'var(--accent)' : 'var(--border)',
          color: 'var(--text)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          backdropFilter: 'blur(12px)',
          outline: open ? '4px solid color-mix(in srgb, var(--accent) 16%, transparent)' : 'none',
        }}
      >
        <span>{current.label}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            color: 'var(--text-subtle)',
          }}
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        className="absolute right-0 top-[calc(100%+0.5rem)] z-[400] min-w-full overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-200 origin-top"
        style={{
          background: 'color-mix(in srgb, var(--surface-card) 90%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
          opacity: open ? 1 : 0,
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.95) translateY(-4px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="p-1.5">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>
            Language
          </p>
          {LANGUAGES.map(lang => {
            const selected = lang.code === current.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => select(lang.code)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-150"
                style={{
                  background: selected ? 'color-mix(in srgb, var(--accent) 16%, var(--surface-card))' : 'transparent',
                  color: selected ? 'var(--text)' : 'var(--text-subtle)',
                  boxShadow: selected ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)' : 'none',
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {lang.label}
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full transition-all duration-150"
                  style={{ background: selected ? 'var(--accent)' : 'transparent' }}
                >
                  {selected && (
                    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" style={{ color: '#fff' }}>
                      <path d="M5 10.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
