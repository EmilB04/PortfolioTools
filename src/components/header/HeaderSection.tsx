import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import SettingsMenu from './SettingsMenu'
import { BrandMark } from '../BrandMark'
import { findActiveTool } from '../../tools/registry'

/**
 * Where you are, in the sidebar's own vocabulary. Reads from the same registry lookup
 * the sidebar highlights with, so the two can never disagree. Categories are dropped
 * for `overview`, where "Overview › Dashboard" would only restate itself.
 */
function Breadcrumb() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const tool = findActiveTool(pathname)

  if (!tool) return null

  return (
    <nav aria-label={t('nav.breadcrumb')} className="hidden min-w-0 lg:block">
      <ol className="flex min-w-0 items-center gap-1.5">
        {tool.category !== 'overview' && (
          <>
            <li
              className="fs-xs font-mono uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {t(`nav.categories.${tool.category}`)}
            </li>
            <li aria-hidden="true" className="flex">
              <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
            </li>
          </>
        )}
        <li className="truncate fs-sm font-medium" style={{ color: 'var(--text)' }} aria-current="page">
          {t(`nav.${tool.key}`)}
        </li>
      </ol>
    </nav>
  )
}

/**
 * The header is a context bar: it answers "where am I" on the left and carries the
 * app's only global control on the right. On mobile the breadcrumb gives way to the
 * brand badge, since the drawer trigger already occupies the left edge.
 */
export default function HeaderSection() {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <Breadcrumb />
      <BrandMark iconOnly className="lg:hidden" />
      <SettingsMenu />
    </div>
  )
}
