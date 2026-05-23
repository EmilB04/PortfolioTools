import { useTheme } from '../contexts/ThemeContext'

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line
          key={a}
          x1={12 + 6.5 * Math.cos(a * Math.PI / 180)}
          y1={12 + 6.5 * Math.sin(a * Math.PI / 180)}
          x2={12 + 9.5 * Math.cos(a * Math.PI / 180)}
          y2={12 + 9.5 * Math.sin(a * Math.PI / 180)}
        />
      ))}
    </svg>
  )
}

export function ThemeSwitcher() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative inline-grid grid-cols-2 items-center rounded-full p-1 cursor-pointer shrink-0"
      style={{
        width: 80,
        height: 38,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Sliding indicator */}
      <span
        className="absolute inset-y-1 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          width: 'calc(50% - 4px)',
          transform: isDark ? 'translateX(4px)' : 'translateX(calc(100% + 4px))',
          background: isDark
            ? 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.5))'
            : 'linear-gradient(135deg, rgba(251,191,36,0.4), rgba(249,115,22,0.45))',
        }}
      />
      {/* Moon — left slot */}
      <span
        className="relative z-10 flex h-full items-center justify-center transition-colors duration-200"
        style={{ color: isDark ? '#a5b4fc' : 'var(--text-subtle)' }}
      >
        <MoonIcon />
      </span>
      {/* Sun — right slot */}
      <span
        className="relative z-10 flex h-full items-center justify-center transition-colors duration-200"
        style={{ color: !isDark ? '#fbbf24' : 'var(--text-subtle)' }}
      >
        <SunIcon />
      </span>
    </button>
  )
}
