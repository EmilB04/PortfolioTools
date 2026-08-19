import { useCallback, useEffect, useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { TOOL_GROUPS, findActiveTool } from '../../tools/registry'
import type { ToolDefinition } from '../../tools/registry'
import { loadCollapsedGroups, saveCollapsedGroups } from './navStorage'

interface SidebarNavProps {
  collapsed: boolean
  isMobileDrawer: boolean
  mobileClose?: () => void
}

/**
 * The tool menu, grouped into collapsible categories.
 *
 * Structure is a single `<nav>` containing one `<section>` per category, each
 * labelled by the heading that toggles it (`aria-expanded` + `aria-controls`), so
 * a screen reader can both announce and skip a whole group. `NavLink` supplies
 * `aria-current="page"` on the active tool.
 *
 * When the rail is collapsed to icons there are no labels to group by, so the
 * categories flatten into icon runs separated by rules and nothing is hidden.
 */
export function SidebarNav({ collapsed, isMobileDrawer, mobileClose }: SidebarNavProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const idPrefix = useId()
  const iconOnly = collapsed && !isMobileDrawer

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsedGroups)

  const activeTool = findActiveTool(pathname)
  const activeCategory = activeTool?.category

  // Navigating into a collapsed category reveals it, so the current tool is never
  // hidden. Collapsing it again afterwards sticks — this only runs on route change.
  useEffect(() => {
    if (!activeCategory) return
    setCollapsedGroups(prev => {
      if (!prev.has(activeCategory)) return prev
      const next = new Set(prev)
      next.delete(activeCategory)
      saveCollapsedGroups(next)
      return next
    })
  }, [activeCategory])

  const toggleGroup = useCallback((category: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      saveCollapsedGroups(next)
      return next
    })
  }, [])

  return (
    <nav aria-label={t('nav.ariaLabel')} className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
      {TOOL_GROUPS.map((group, groupIndex) => {
        const isOverview = group.category === 'overview'
        const listId = `${idPrefix}-${group.category}-list`
        const headingId = `${idPrefix}-${group.category}-heading`
        const isOpen = iconOnly || isOverview || !collapsedGroups.has(group.category)
        const label = t(`nav.categories.${group.category}`)
        const containsActive = activeCategory === group.category

        return (
          <section
            key={group.category}
            aria-labelledby={isOverview ? undefined : headingId}
            aria-label={isOverview ? label : undefined}
            className={groupIndex > 0 ? 'mt-1 pt-1' : ''}
            style={
              groupIndex > 0 && iconOnly
                ? { borderTop: '1px solid var(--border)' }
                : undefined
            }
          >
            {!isOverview && !iconOnly && (
              <h2 className="px-1">
                <button
                  type="button"
                  id={headingId}
                  onClick={() => toggleGroup(group.category)}
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  className="group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <ChevronDown
                    size={12}
                    aria-hidden="true"
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                  />
                  <span className="fs-xs font-mono font-medium uppercase tracking-[0.14em] truncate">
                    {label}
                  </span>
                  {!isOpen && containsActive && (
                    <span
                      aria-hidden="true"
                      className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                </button>
              </h2>
            )}

            <ul id={listId} hidden={!isOpen} className="space-y-0.5 pt-0.5">
              {group.tools.map(tool => (
                <li key={tool.key}>
                  <ToolLink tool={tool} iconOnly={iconOnly} onNavigate={mobileClose} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </nav>
  )
}

function ToolLink({
  tool,
  iconOnly,
  onNavigate,
}: {
  tool: ToolDefinition
  iconOnly: boolean
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const label = t(`nav.${tool.key}`)

  return (
    <NavLink
      to={tool.to}
      end={tool.to === '/'}
      title={iconOnly ? label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 rounded-lg fs-xs font-medium transition-colors duration-150 ${
          iconOnly ? 'justify-center px-0 py-2' : 'px-2.5 py-1.5'
        } ${isActive ? 'active-nav' : 'inactive-nav'}`
      }
      style={({ isActive }) => ({
        background: isActive ? 'var(--accent-bg)' : undefined,
        color: isActive ? 'var(--accent-text)' : 'var(--text-subtle)',
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && !iconOnly && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full"
              style={{ background: 'var(--accent)' }}
            />
          )}
          <Icon size={15} aria-hidden="true" className="shrink-0" />
          {iconOnly ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  )
}
