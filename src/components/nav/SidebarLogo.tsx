import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BrandMark } from '../BrandMark'

interface SidebarLogoProps {
  collapsed: boolean
  isMobileDrawer: boolean
  mobileClose?: () => void
}

export function SidebarLogo({ collapsed, isMobileDrawer, mobileClose }: SidebarLogoProps) {
  const { t } = useTranslation()

  return (
    <div
      className="h-[52px] flex items-center justify-between shrink-0 border-b px-3"
      style={{ borderColor: 'var(--border)' }}
    >
      <BrandMark iconOnly={collapsed && !isMobileDrawer} />
      {isMobileDrawer && (
        <button
          onClick={mobileClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-subtle)' }}
          aria-label={t('nav.closeMenu')}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
