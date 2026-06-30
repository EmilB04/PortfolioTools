import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface SidebarToggleProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
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
  )
}
