import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, FileInput, FileArchive, Gauge } from 'lucide-react'

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, to: '/' },
  { key: 'fileConverter', icon: FileInput, to: '/file-converter' },
  { key: 'fileCompress', icon: FileArchive, to: '/file-compress' },
  { key: 'speedTest', icon: Gauge, to: '/speed-test' },
] as const

export function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="w-[240px] shrink-0 h-screen sticky top-0 flex flex-col border-r border-gray-200/80 dark:border-white/[0.06] bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-200/80 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Gauge size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">
            Portfolio<span className="text-blue-500">Tools</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ key, icon: Icon, to }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
                <Icon size={16} className="shrink-0" />
                {t(`nav.${key}`)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom badge */}
      <div className="px-4 py-4 border-t border-gray-200/80 dark:border-white/[0.06]">
        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-600 tracking-wide">
          emilb.no · Portfolio Tools
        </p>
      </div>
    </aside>
  )
}
