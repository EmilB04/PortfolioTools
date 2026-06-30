import { X } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import ebBlack from '../../assets/icons/eb_black.png'
import ebWhite from '../../assets/icons/eb_white.png'

interface SidebarLogoProps {
  collapsed: boolean
  isMobileDrawer: boolean
  mobileClose?: () => void
}

export function SidebarLogo({ collapsed, isMobileDrawer, mobileClose }: SidebarLogoProps) {
  const { resolvedTheme } = useTheme()
  const logo = resolvedTheme === 'dark' ? ebWhite : ebBlack

  return (
    <div
      className="h-14 flex items-center justify-between shrink-0 border-b px-4"
      style={{ borderColor: 'var(--border)' }}
    >
      <a
        href="https://emilb.no"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 min-w-0"
      >
        <img src={logo} alt="EB" className="w-7 h-7 shrink-0 object-contain" />
        {(!collapsed || isMobileDrawer) && (
          <span className="text-[15px] font-bold tracking-tight whitespace-nowrap" style={{ color: 'var(--text)' }}>
            Portfolio<span style={{ color: 'var(--accent)' }}>Tools</span>
          </span>
        )}
      </a>
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
  )
}
