import { useTranslation } from 'react-i18next'
import { FileInput, FileArchive, Gauge, Zap, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ToolCard } from '../components/ToolCard'
import { todayStats } from '../utils/speedStorage'

function StatPill({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight truncate"
        style={{ color: dim ? 'var(--text-subtle)' : 'var(--text)' }}
      >
        {value}
      </span>
      <span className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>{label}</span>
    </div>
  )
}

export function Dashboard() {
  const { t } = useTranslation()
  const stats = todayStats()

  const dlDisplay = stats.avgDownload !== null ? `${stats.avgDownload.toFixed(1)} Mbps` : '—'
  const ulDisplay = stats.avgUpload !== null ? `${stats.avgUpload.toFixed(1)} Mbps` : '—'
  const hasData = stats.testsRun > 0

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
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

      {/* Hero card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="p-5 sm:p-8 md:p-10">
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Title + CTA */}
            <div className="space-y-3 max-w-lg">
              <div
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold"
                style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-bg)', color: 'var(--accent)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                emilb.no
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
                {t('dashboard.title')}
              </h1>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {t('dashboard.subtitle')}
              </p>
              <Link
                to="/speed-test"
                className="inline-flex items-center gap-2 mt-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5"
                style={{ background: 'var(--accent)' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <Zap size={14} />
                {t('dashboard.runSpeedTest')}
                <ArrowRight size={14} />
              </Link>
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
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-subtle)' }}>
          {t('dashboard.tools')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </div>
    </div>
  )
}
