import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, FileInput, FileArchive, Gauge, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, to: '/' },
  { key: 'fileConverter', icon: FileInput, to: '/file-converter' },
  { key: 'fileCompress', icon: FileArchive, to: '/file-compress' },
  { key: 'speedTest', icon: Gauge, to: '/speed-test' },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, mobileClose }: SidebarProps) {
  const { t } = useTranslation()
  const isMobileDrawer = !!mobileClose

  return (
    <aside
      className="h-screen flex flex-col border-r backdrop-blur-xl transition-[width] duration-200 ease-in-out overflow-hidden"
      style={{
        width: collapsed && !isMobileDrawer ? 60 : 240,
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center justify-between shrink-0 border-b px-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center shadow-lg"
            style={{ background: 'var(--accent)' }}
          >
            <Gauge size={14} className="text-white" />
          </div>
          {(!collapsed || isMobileDrawer) && (
            <span className="text-[15px] font-bold tracking-tight whitespace-nowrap" style={{ color: 'var(--text)' }}>
              Portfolio<span style={{ color: 'var(--accent)' }}>Tools</span>
            </span>
          )}
        </div>
        {isMobileDrawer && (
          <button
            onClick={mobileClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-subtle)' }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ key, icon: Icon, to }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            title={collapsed && !isMobileDrawer ? t(`nav.${key}`) : undefined}
            onClick={mobileClose}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                collapsed && !isMobileDrawer ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } ${isActive ? 'active-nav' : 'inactive-nav'}`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--accent-bg)' : undefined,
              color: isActive ? 'var(--accent)' : 'var(--text-subtle)',
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
                <Icon size={16} className="shrink-0" />
                {(!collapsed || isMobileDrawer) && t(`nav.${key}`)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      {!isMobileDrawer && (
        <div className="border-t px-2 py-3 shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl transition-all duration-150"
            style={{ color: 'var(--text-subtle)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span className="text-[11px] font-medium tracking-wide">Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  )
}
