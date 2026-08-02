import { X } from 'lucide-react'
import ebBlack from '../../assets/icons/eb_black.png'

interface SidebarLogoProps {
  collapsed: boolean
  isMobileDrawer: boolean
  mobileClose?: () => void
}

export function SidebarLogo({ collapsed, isMobileDrawer, mobileClose }: SidebarLogoProps) {
  return (
    <div
      className="h-14 flex items-center justify-between shrink-0 border-b px-4"
      style={{ borderColor: 'var(--border)' }}
    >
      <a
        href="https://emilb.no"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex min-w-0 shrink-0 items-center gap-2 rounded-full border bg-white text-black transition-colors duration-300 ${
          collapsed && !isMobileDrawer ? 'h-8 w-8 justify-center' : 'h-10 pl-1 pr-1'
        }`}
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <img src={ebBlack} alt="EB" className="h-full w-full object-contain" />
        </span>
        {(!collapsed || isMobileDrawer) && (
          <span className="pr-3 text-[15px] font-bold tracking-tight whitespace-nowrap">
            PortfolioTools
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
