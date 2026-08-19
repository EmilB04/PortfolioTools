import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Pause, Play, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ToolCard } from '../components/ToolCard'
import { todayStats } from '../utils/speedStorage'
import { loadCounterState } from '../utils/counterStorage'
import { CATEGORY_ORDER, DASHBOARD_TOOLS } from '../tools/registry'
import type { ToolCategory } from '../tools/registry'

const ROTATE_MS = 6000

type CategoryFilter = ToolCategory | 'all'

function matchesQuery(tool: { title: string; description: string; badge: string }, query: string): boolean {
  if (!query) return true
  const q = query.trim().toLowerCase()
  return (
    tool.title.toLowerCase().includes(q) ||
    tool.description.toLowerCase().includes(q) ||
    tool.badge.toLowerCase().includes(q)
  )
}

function StatPill({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="fs-xl font-mono font-semibold tabular-nums tracking-tight truncate"
        style={{ color: dim ? 'var(--text-subtle)' : 'var(--text)' }}
      >
        {value}
      </span>
      <span className="fs-xs truncate" style={{ color: 'var(--text-subtle)' }}>{label}</span>
    </div>
  )
}

export function Dashboard() {
  const { t } = useTranslation()
  const stats = todayStats()
  const counterState = loadCounterState()

  const dlDisplay = stats.avgDownload !== null ? `${stats.avgDownload.toFixed(1)} Mbps` : '—'
  const ulDisplay = stats.avgUpload !== null ? `${stats.avgUpload.toFixed(1)} Mbps` : '—'
  const hasData = stats.testsRun > 0

  const [featured, setFeatured] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  /**
   * Cards come straight from the tool registry, so a new tool shows up here and in
   * the sidebar from one entry. Only the handful of tools with live device data
   * override their stat values.
   */
  const liveStats: Record<string, [string, string]> = useMemo(
    () => ({
      speedTest: [hasData ? String(stats.testsRun) : '—', hasData ? dlDisplay : '—'],
      counter: [String(counterState.entered), String(counterState.exited)],
    }),
    [hasData, stats.testsRun, dlDisplay, counterState.entered, counterState.exited],
  )

  const tools = useMemo(
    () =>
      DASHBOARD_TOOLS.map(tool => {
        const overrides = liveStats[tool.key]
        return {
          key: tool.key,
          category: tool.category,
          title: t(`tools.${tool.key}.name`),
          description: t(`tools.${tool.key}.description`),
          badge: t(`tools.${tool.key}.badge`),
          href: tool.to,
          icon: <tool.icon size={20} color="var(--text-subtle)" />,
          stats: [
            { label: t(`tools.${tool.key}.stats.aLabel`), value: overrides?.[0] ?? t(`tools.${tool.key}.stats.aValue`) },
            { label: t(`tools.${tool.key}.stats.bLabel`), value: overrides?.[1] ?? t(`tools.${tool.key}.stats.bValue`) },
          ],
        }
      }),
    [t, liveStats],
  )

  const autoRotating = !hovering && !userPaused && !reducedMotion

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!autoRotating) return
    timerRef.current = setInterval(() => setFeatured(i => (i + 1) % tools.length), ROTATE_MS)
  }, [tools.length, autoRotating])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  const goTo = useCallback((i: number) => { setFeatured(i); startTimer() }, [startTimer])

  const hero = tools[featured]

  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter(category => tools.some(tool => tool.category === category)),
    [tools],
  )

  const filteredTools = useMemo(
    () =>
      tools.filter(
        tool => (categoryFilter === 'all' || tool.category === categoryFilter) && matchesQuery(tool, query),
      ),
    [tools, categoryFilter, query],
  )

  const isFiltering = query.trim().length > 0 || categoryFilter !== 'all'

  const grouped = CATEGORY_ORDER
    .map(category => ({ category, items: filteredTools.filter(tool => tool.category === category) }))
    .filter(group => group.items.length > 0)

  return (
    <div className="page-container page-container-wide space-y-6 sm:space-y-8">

      {/* Page header */}
      <div className="space-y-1">
        <span
          className="fs-xs font-mono font-medium uppercase tracking-[0.2em]"
          style={{ color: 'var(--text-subtle)' }}
        >
          {t('dashboard.tools')}
        </span>
        <h1 className="fs-2xl font-display font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
          {t('dashboard.title')}
        </h1>
        <p className="fs-sm prose-measure" style={{ color: 'var(--text-muted)' }}>
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Hero card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
      >
        <div className="p-5 sm:p-8 md:p-10">
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Rotating featured tool */}
            <div className="space-y-3 max-w-2xl min-h-[15rem] sm:min-h-[13rem]">
              <div
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors duration-500"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-card)', color: 'var(--text-subtle)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                {hero.badge}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={hero.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl border shrink-0" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                      {hero.icon}
                    </span>
                    <h2 className="fs-3xl font-display font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                      {hero.title}
                    </h2>
                  </div>
                  <p className="fs-base leading-relaxed prose-measure" style={{ color: 'var(--text-muted)' }}>
                    {hero.description}
                  </p>
                  <Link
                    to={hero.href}
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
                    style={{ background: 'var(--accent)' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {t('dashboard.openNamed', { tool: hero.title })}
                    <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </AnimatePresence>

              {/* Rotation dots + pause toggle */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {tools.map((tool, i) => (
                  <button
                    key={tool.href}
                    onClick={() => goTo(i)}
                    aria-label={tool.title}
                    aria-current={i === featured ? 'true' : undefined}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === featured ? 20 : 6,
                      background: i === featured ? 'var(--accent)' : 'var(--border)',
                    }}
                  />
                ))}
                {!reducedMotion && (
                  <button
                    type="button"
                    onClick={() => setUserPaused(p => !p)}
                    aria-label={t(userPaused ? 'dashboard.resume' : 'dashboard.pause')}
                    aria-pressed={userPaused}
                    className="ml-1 p-1 rounded-md transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {userPaused ? <Play size={12} /> : <Pause size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* Stats row — 3-col grid on all sizes */}
            <div
              className="grid grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
            >
              <StatPill label={t('dashboard.stats.testsRun')} value={hasData ? String(stats.testsRun) : '—'} dim={!hasData} />
              <StatPill label={t('dashboard.stats.avgDownload')} value={dlDisplay} dim={!hasData} />
              <StatPill label={t('dashboard.stats.avgUpload')} value={ulDisplay} dim={!hasData} />
            </div>
          </div>
        </div>
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, var(--accent-border), transparent)` }} />
      </div>

      {/* Search + category filter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-subtle)' }}
            />
            <label htmlFor="tool-search" className="sr-only">{t('dashboard.search.placeholder')}</label>
            <input
              id="tool-search"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('dashboard.search.placeholder')}
              className="w-full rounded-xl border border-[var(--border)] pl-9 pr-9 py-2 fs-sm transition-colors hover:border-[var(--accent-border)] focus:border-[var(--accent-border)]"
              style={{ background: 'var(--surface-card)', color: 'var(--text)' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('dashboard.search.clear')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md"
                style={{ color: 'var(--text-subtle)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label={t('nav.ariaLabel')}>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              aria-pressed={categoryFilter === 'all'}
              className="tool-text fs-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
              style={{
                borderColor: categoryFilter === 'all' ? 'var(--accent-border)' : 'var(--border)',
                background: categoryFilter === 'all' ? 'var(--accent-bg)' : 'transparent',
                color: categoryFilter === 'all' ? 'var(--accent-text)' : 'var(--text-subtle)',
              }}
              onMouseEnter={e => { if (categoryFilter !== 'all') e.currentTarget.style.borderColor = 'var(--accent-border)' }}
              onMouseLeave={e => { if (categoryFilter !== 'all') e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              {t('dashboard.filters.all')}
            </button>
            {presentCategories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                aria-pressed={categoryFilter === category}
                className="fs-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  borderColor: categoryFilter === category ? 'var(--accent-border)' : 'var(--border)',
                  background: categoryFilter === category ? 'var(--accent-bg)' : 'transparent',
                  color: categoryFilter === category ? 'var(--accent-text)' : 'var(--text-subtle)',
                }}
                onMouseEnter={e => { if (categoryFilter !== category) e.currentTarget.style.borderColor = 'var(--accent-border)' }}
                onMouseLeave={e => { if (categoryFilter !== category) e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {t(`nav.categories.${category}`)}
              </button>
            ))}
          </div>
        </div>

        <p className="fs-xs" aria-live="polite" style={{ color: 'var(--text-subtle)' }}>
          {isFiltering
            ? t('dashboard.search.resultsCount', { count: filteredTools.length })
            : null}
        </p>
      </div>

      {/* Tool cards, grouped the same way the sidebar is */}
      {grouped.length === 0 ? (
        <p className="fs-sm text-center py-12" style={{ color: 'var(--text-subtle)' }}>
          {t('dashboard.search.noResults', { query })}
        </p>
      ) : (
        grouped.map(group => (
          <section key={group.category} aria-labelledby={`dash-${group.category}`}>
            <h2
              id={`dash-${group.category}`}
              className="fs-xs font-mono font-medium uppercase tracking-[0.2em] mb-4"
              style={{ color: 'var(--text-subtle)' }}
            >
              {t(`nav.categories.${group.category as ToolCategory}`)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {group.items.map(tool => (
                <ToolCard
                  key={tool.key}
                  title={tool.title}
                  description={tool.description}
                  badge={tool.badge}
                  href={tool.href}
                  icon={tool.icon}
                  stats={tool.stats}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
