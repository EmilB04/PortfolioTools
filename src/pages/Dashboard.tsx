import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ToolCard } from '../components/ToolCard'
import { todayStats } from '../utils/speedStorage'
import { loadCounterState } from '../utils/counterStorage'
import { CATEGORY_ORDER, DASHBOARD_TOOLS } from '../tools/registry'
import type { ToolCategory } from '../tools/registry'

const ROTATE_MS = 6000

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
          accentColor: tool.color,
          accentBg: `${tool.color}1f`,
          icon: <tool.icon size={20} color={tool.color} />,
          stats: [
            { label: t(`tools.${tool.key}.stats.aLabel`), value: overrides?.[0] ?? t(`tools.${tool.key}.stats.aValue`) },
            { label: t(`tools.${tool.key}.stats.bLabel`), value: overrides?.[1] ?? t(`tools.${tool.key}.stats.bValue`) },
          ],
        }
      }),
    [t, liveStats],
  )

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setFeatured(i => (i + 1) % tools.length), ROTATE_MS)
  }, [tools.length])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  const goTo = useCallback((i: number) => { setFeatured(i); startTimer() }, [startTimer])

  const hero = tools[featured]

  const grouped = CATEGORY_ORDER
    .map(category => ({ category, items: tools.filter(tool => tool.category === category) }))
    .filter(group => group.items.length > 0)

  return (
    <div className="page-container page-container-wide space-y-6 sm:space-y-8">

      {/* Hero card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="p-5 sm:p-8 md:p-10">
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Rotating featured tool */}
            <div className="space-y-3 max-w-2xl min-h-[15rem] sm:min-h-[13rem]">
              <div
                className="tool-text inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors duration-500"
                style={{ borderColor: hero.accentColor, background: hero.accentBg, '--tool': hero.accentColor } as React.CSSProperties}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: hero.accentColor }} />
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
                    <span className="p-2 rounded-xl shrink-0" style={{ background: hero.accentBg }}>
                      {hero.icon}
                    </span>
                    <h1 className="fs-3xl font-display font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                      {hero.title}
                    </h1>
                  </div>
                  <p className="fs-base leading-relaxed prose-measure" style={{ color: 'var(--text-muted)' }}>
                    {hero.description}
                  </p>
                  <Link
                    to={hero.href}
                    className="tool-fill inline-flex items-center gap-2 mt-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5"
                    style={{ '--tool': hero.accentColor } as React.CSSProperties}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {t('dashboard.openNamed', { tool: hero.title })}
                    <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </AnimatePresence>

              {/* Rotation dots */}
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
                      background: i === featured ? hero.accentColor : 'var(--border)',
                    }}
                  />
                ))}
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

      {/* Tool cards, grouped the same way the sidebar is */}
      {grouped.map(group => (
        <section key={group.category} aria-labelledby={`dash-${group.category}`}>
          <h2
            id={`dash-${group.category}`}
            className="fs-xs font-mono font-medium uppercase tracking-[0.2em] mb-4"
            style={{ color: 'var(--text-subtle)' }}
          >
            {t(`nav.categories.${group.category as ToolCategory}`)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {group.items.map(tool => (
              <ToolCard
                key={tool.key}
                title={tool.title}
                description={tool.description}
                badge={tool.badge}
                href={tool.href}
                icon={tool.icon}
                stats={tool.stats}
                accentColor={tool.accentColor}
                accentBg={tool.accentBg}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
