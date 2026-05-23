import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, FileInput, FileArchive, Gauge, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, to: '/' },
  { key: 'fileConverter', icon: FileInput, to: '/file-converter' },
  { key: 'fileCompress', icon: FileArchive, to: '/file-compress' },
  { key: 'speedTest', icon: Gauge, to: '/speed-test' },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <aside
      className="shrink-0 h-screen sticky top-0 flex flex-col border-r border-gray-200/80 dark:border-white/[0.06] bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-xl transition-[width] duration-200 ease-in-out overflow-hidden"
      style={{ width: collapsed ? 60 : 240 }}
    >
      {/* Logo */}
      <div className="h-[61px] flex items-center border-b border-gray-200/80 dark:border-white/[0.06] px-4 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Gauge size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
              Portfolio<span className="text-blue-500">Tools</span>
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ key, icon: Icon, to }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            title={collapsed ? t(`nav.${key}`) : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
                <Icon size={16} className="shrink-0" />
                {!collapsed && t(`nav.${key}`)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Toggle + bottom badge */}
      <div className="border-t border-gray-200/80 dark:border-white/[0.06] px-2 py-3 flex flex-col gap-2 shrink-0">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all duration-150"
        >
          {collapsed
            ? <PanelLeftOpen size={16} className="shrink-0" />
            : <PanelLeftClose size={16} className="shrink-0" />
          }
          {!collapsed && (
            <span className="text-[11px] font-medium tracking-wide whitespace-nowrap">Collapse</span>
          )}
        </button>
      </div>
    </aside>
  )
}
