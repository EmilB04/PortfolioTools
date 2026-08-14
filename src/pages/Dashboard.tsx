import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FileInput, FileArchive, Gauge, QrCode, Accessibility, DoorOpen, ImageDown, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ToolCard } from '../components/ToolCard'
import { todayStats } from '../utils/speedStorage'
import { loadCounterState } from '../utils/counterStorage'

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

  const tools = [
    {
      title: t('tools.speedTest.name'),
      description: t('tools.speedTest.description'),
      badge: t('tools.speedTest.badge'),
      href: '/speed-test',
      accentColor: '#f1376e',
      accentBg: 'rgba(241,55,110,0.12)',
      icon: <Gauge size={20} color="#f1376e" />,
      comingSoon: false,
      stats: [
        { label: t('dashboard.stats.testsRun'), value: hasData ? String(stats.testsRun) : '—' },
        { label: t('dashboard.stats.avgSpeed'), value: hasData ? dlDisplay : '—' },
      ],
    },
    {
      title: t('tools.snapdown.name'),
      description: t('tools.snapdown.description'),
      badge: t('tools.snapdown.badge'),
      href: '/snapdown',
      accentColor: '#f59e0b',
      accentBg: 'rgba(245,158,11,0.12)',
      icon: <ImageDown size={20} color="#f59e0b" />,
      comingSoon: false,
      stats: [
        { label: 'Crop · arrow · box · blur', value: '0 uploads' },
        { label: t('dashboard.stats.altFromOcr'), value: 'OCR' },
      ],
    },
    {
      title: t('tools.fileConverter.name'),
      description: t('tools.fileConverter.description'),
      badge: t('tools.fileConverter.badge'),
      href: '/file-converter',
      accentColor: '#f97316',
      accentBg: 'rgba(249,115,22,0.12)',
      icon: <FileInput size={20} color="#f97316" />,
      comingSoon: false,
      stats: [
        { label: t('dashboard.stats.formatsSupported'), value: '10+' },
        { label: 'Images · JSON · CSV · TSV', value: '0 uploads' },
      ],
    },
    {
      title: t('tools.fileCompress.name'),
      description: t('tools.fileCompress.description'),
      badge: t('tools.fileCompress.badge'),
      href: '/file-compress',
      accentColor: '#10b981',
      accentBg: 'rgba(16,185,129,0.12)',
      icon: <FileArchive size={20} color="#10b981" />,
      comingSoon: false,
      stats: [
        { label: 'Images · Any file', value: 'Gzip' },
        { label: 'Max quality loss', value: '0%' },
      ],
    },
    {
      title: t('tools.qrGenerator.name'),
      description: t('tools.qrGenerator.description'),
      badge: t('tools.qrGenerator.badge'),
      href: '/qr-generator',
      accentColor: '#8b5cf6',
      accentBg: 'rgba(139,92,246,0.12)',
      icon: <QrCode size={20} color="#8b5cf6" />,
      comingSoon: false,
      stats: [
        { label: 'PNG · SVG export', value: '0 uploads' },
        { label: 'Custom colors', value: 'L/M/Q/H' },
      ],
    },
    {
      title: t('tools.wcagScanner.name'),
      description: t('tools.wcagScanner.description'),
      badge: t('tools.wcagScanner.badge'),
      href: '/wcag-scanner',
      accentColor: '#14b8a6',
      accentBg: 'rgba(20,184,166,0.12)',
      icon: <Accessibility size={20} color="#14b8a6" />,
      comingSoon: false,
      stats: [
        { label: 'Crawls all pages', value: 'axe-core' },
        { label: 'WCAG 2 · A/AA/AAA', value: 'Live' },
      ],
    },
    {
      title: t('tools.counter.name'),
      description: t('tools.counter.description'),
      badge: t('tools.counter.badge'),
      href: '/counter',
      accentColor: '#3b82f6',
      accentBg: 'rgba(59,130,246,0.12)',
      icon: <DoorOpen size={20} color="#3b82f6" />,
      comingSoon: false,
      stats: [
        { label: t('counter.entered'), value: String(counterState.entered) },
        { label: t('counter.exited'), value: String(counterState.exited) },
      ],
    },
  ]

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
            <div className="space-y-3 max-w-lg min-h-[15rem] sm:min-h-[13rem]">
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
                  <p className="fs-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
              <div className="flex items-center gap-2 pt-1">
                {tools.map((tool, i) => (
                  <button
                    key={tool.href}
                    onClick={() => goTo(i)}
                    aria-label={tool.title}
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
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="w-px h-full absolute" />
                <StatPill label={t('dashboard.stats.avgDownload')} value={dlDisplay} dim={!hasData} />
              </div>
              <StatPill label={t('dashboard.stats.avgUpload')} value={ulDisplay} dim={!hasData} />
            </div>
          </div>
        </div>
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, var(--accent-border), transparent)` }} />
      </div>

      {/* Tool cards */}
      <div>
        <h2 className="fs-xs font-mono font-medium uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-subtle)' }}>
          {t('dashboard.tools')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </div>
    </div>
  )
}
