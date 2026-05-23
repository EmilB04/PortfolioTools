import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

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
  gradient: string
  iconBg: string
}

export function ToolCard({ title, description, badge, icon, stats, href, gradient, iconBg }: ToolCardProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={href}
      className="group relative flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className={`h-1.5 w-full ${gradient}`} />

      <div className="p-6 flex-1 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className={`p-3 rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {badge}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
          {t('dashboard.openTool')}
        </span>
        <ArrowRight size={15} className="text-blue-600 dark:text-blue-400 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
