import { useTranslation } from 'react-i18next'
import { FileInput, FileArchive, Gauge, Zap, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ToolCard } from '../components/ToolCard'
import { todayStats } from '../utils/speedStorage'

function StatPill({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xl font-bold tabular-nums tracking-tight ${dim ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
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
      accentColor: '#3b82f6',
      accentBg: 'rgba(59,130,246,0.1)',
      icon: <Gauge size={20} color="#3b82f6" />,
      comingSoon: false,
      stats: [
        {
          label: t('dashboard.stats.testsRun'),
          value: hasData ? String(stats.testsRun) : '—',
        },
        {
          label: t('dashboard.stats.avgSpeed'),
          value: hasData ? dlDisplay : '—',
        },
      ],
    },
    {
      title: t('tools.fileConverter.name'),
      description: t('tools.fileConverter.description'),
      badge: t('tools.fileConverter.badge'),
      href: '/file-converter',
      accentColor: '#f97316',
      accentBg: 'rgba(249,115,22,0.1)',
      icon: <FileInput size={20} color="#f97316" />,
      comingSoon: true,
      stats: [
        { label: t('dashboard.stats.formatsSupported'), value: '50+' },
        { label: 'Images, docs, audio', value: '···' },
      ],
    },
    {
      title: t('tools.fileCompress.name'),
      description: t('tools.fileCompress.description'),
      badge: t('tools.fileCompress.badge'),
      href: '/file-compress',
      accentColor: '#10b981',
      accentBg: 'rgba(16,185,129,0.1)',
      icon: <FileArchive size={20} color="#10b981" />,
      comingSoon: true,
      stats: [
        { label: 'Formats', value: 'JPG, PDF, ZIP' },
        { label: 'Quality loss', value: 'None' },
      ],
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Hero */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-3 max-w-lg">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                emilb.no
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                {t('dashboard.title')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                {t('dashboard.subtitle')}
              </p>
              <Link
                to="/speed-test"
                className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors duration-150"
              >
                <Zap size={14} />
                {t('dashboard.runSpeedTest')}
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Speed test today stats */}
            <div className="flex gap-6 shrink-0">
              <StatPill label={t('dashboard.stats.testsRun')} value={hasData ? String(stats.testsRun) : '—'} dim={!hasData} />
              <div className="w-px bg-gray-100 dark:bg-white/[0.06]" />
              <StatPill label={t('dashboard.stats.avgDownload')} value={dlDisplay} dim={!hasData} />
              <div className="w-px bg-gray-100 dark:bg-white/[0.06]" />
              <StatPill label={t('dashboard.stats.avgUpload')} value={ulDisplay} dim={!hasData} />
            </div>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      </div>

      {/* Tool cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">
          {t('dashboard.tools')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </div>
    </div>
  )
}
