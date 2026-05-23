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
      className={`group relative flex flex-col rounded-2xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] overflow-hidden transition-all duration-200 ${
        comingSoon
          ? 'cursor-default opacity-60'
          : 'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[0.07] dark:hover:shadow-black/40 hover:border-gray-300/80 dark:hover:border-white/[0.12]'
      }`}
    >
      {/* Top accent line */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}${comingSoon ? '40' : '80'}, transparent)` }} />

      <div className="p-6 flex-1 flex flex-col gap-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: accentBg }}>
            {icon}
          </div>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide"
            style={{ backgroundColor: accentBg, color: accentColor }}
          >
            {badge}
          </span>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 mt-auto">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5 border border-gray-100 dark:border-white/[0.05]">
              <p className="text-base font-bold text-gray-900 dark:text-white leading-none">{s.value}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA footer */}
      <div className="px-6 py-3.5 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
        {comingSoon ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-400 dark:text-gray-600">
            <Clock size={13} />
            {t('dashboard.comingSoon')}
          </span>
        ) : (
          <>
            <span className="text-[13px] font-medium" style={{ color: accentColor }}>
              {t('dashboard.openTool')}
            </span>
            <ArrowRight size={14} style={{ color: accentColor }} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </>
        )}
      </div>
    </Link>
  )
}
