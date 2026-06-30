import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { navItems } from './navItems'

interface SidebarNavProps {
  collapsed: boolean
  isMobileDrawer: boolean
  mobileClose?: () => void
}

export function SidebarNav({ collapsed, isMobileDrawer, mobileClose }: SidebarNavProps) {
  const { t } = useTranslation()

  return (
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
  )
}
