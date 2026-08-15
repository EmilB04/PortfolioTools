import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock } from 'lucide-react'

interface Stat {
  label: string
  value: string
}

interface ToolCardProps {
  title: string
  description: string
  badge: string
  icon: React.ReactNode
  stats: Stat[]
  href: string
  accentColor: string
  accentBg: string
  comingSoon?: boolean
}

export function ToolCard({ title, description, badge, icon, stats, href, accentColor, accentBg, comingSoon }: ToolCardProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={comingSoon ? '#' : href}
      onClick={comingSoon ? (e) => e.preventDefault() : undefined}
      className={`tool-card group relative flex flex-col rounded-2xl border overflow-hidden ${
        comingSoon ? 'cursor-default opacity-50' : ''
      }`}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', '--tool': accentColor } as React.CSSProperties}
    >
      {/* Top accent line */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}${comingSoon ? '30' : '70'}, transparent)` }} />

      <div className="p-5 sm:p-6 flex-1 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: accentBg }}>
            {icon}
          </div>
          <span
            className="tool-text text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide shrink-0"
            style={{ backgroundColor: accentBg }}
          >
            {badge}
          </span>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="fs-lg font-display font-bold leading-tight" style={{ color: 'var(--text)' }}>{title}</h3>
          <p className="fs-sm leading-relaxed" style={{ color: 'var(--text-subtle)' }}>{description}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-3 py-2.5 border"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
            >
              <p className="fs-sm font-mono font-semibold leading-none tracking-tight" style={{ color: 'var(--text)' }}>{s.value}</p>
              <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--text-subtle)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA footer */}
      <div
        className="px-5 sm:px-6 py-3 border-t flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-card)' }}
      >
        {comingSoon ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--text-subtle)' }}>
            <Clock size={13} />
            {t('dashboard.comingSoon')}
          </span>
        ) : (
          <>
            <span className="tool-text text-[13px] font-medium">
              {t('dashboard.openTool')}
            </span>
            <ArrowRight size={14} className="tool-text transition-transform duration-150 group-hover:translate-x-0.5" />
          </>
        )}
      </div>
    </Link>
  )
}
