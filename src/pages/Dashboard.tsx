import { useTranslation } from 'react-i18next'
import { FileInput, FileArchive, Gauge } from 'lucide-react'
import { ToolCard } from '../components/ToolCard'

export function Dashboard() {
  const { t } = useTranslation()

  const tools = [
    {
      title: t('tools.fileConverter.name'),
      description: t('tools.fileConverter.description'),
      badge: t('tools.fileConverter.badge'),
      href: '/file-converter',
      accentColor: '#f97316',
      accentBg: 'rgba(249,115,22,0.1)',
      icon: <FileInput size={20} color="#f97316" />,
      stats: [
        { label: t('dashboard.stats.formatsSupported'), value: '52' },
        { label: t('dashboard.stats.filesConverted'), value: '1,247' },
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
      stats: [
        { label: t('dashboard.stats.filesCompressed'), value: '839' },
        { label: t('dashboard.stats.avgCompression'), value: '68%' },
      ],
    },
    {
      title: t('tools.speedTest.name'),
      description: t('tools.speedTest.description'),
      badge: t('tools.speedTest.badge'),
      href: '/speed-test',
      accentColor: '#3b82f6',
      accentBg: 'rgba(59,130,246,0.1)',
      icon: <Gauge size={20} color="#3b82f6" />,
      stats: [
        { label: t('dashboard.stats.avgSpeed'), value: '94.2 Mbps' },
        { label: t('dashboard.stats.testsRun'), value: '412' },
      ],
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Hero */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          emilb.no
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </div>
  )
}
