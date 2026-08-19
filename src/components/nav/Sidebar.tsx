import { SidebarLogo } from './SidebarLogo'
import { SidebarNav } from './SidebarNav'
import { SidebarToggle } from './SidebarToggle'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, mobileClose }: SidebarProps) {
  const isMobileDrawer = !!mobileClose

  return (
    <aside
      className="h-screen flex flex-col border-r transition-[width] duration-200 ease-in-out overflow-hidden"
      style={{
        width: collapsed && !isMobileDrawer ? 60 : 240,
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <SidebarLogo collapsed={collapsed} isMobileDrawer={isMobileDrawer} mobileClose={mobileClose} />
      <SidebarNav collapsed={collapsed} isMobileDrawer={isMobileDrawer} mobileClose={mobileClose} />
      {!isMobileDrawer && <SidebarToggle collapsed={collapsed} onToggle={onToggle} />}
    </aside>
  )
}
