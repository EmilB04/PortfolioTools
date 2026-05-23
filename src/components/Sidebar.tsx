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
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Portfolio<span className="text-blue-600">Tools</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ key, icon: Icon, to }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`
            }
          >
            <Icon size={17} />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
