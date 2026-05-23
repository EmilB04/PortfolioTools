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
      gradient: 'bg-gradient-to-r from-orange-400 to-amber-400',
      iconBg: 'bg-orange-50 dark:bg-orange-950/40',
      icon: <FileInput size={22} className="text-orange-500" />,
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
      gradient: 'bg-gradient-to-r from-emerald-400 to-teal-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      icon: <FileArchive size={22} className="text-emerald-500" />,
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
      gradient: 'bg-gradient-to-r from-blue-400 to-indigo-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      icon: <Gauge size={22} className="text-blue-500" />,
      stats: [
        { label: t('dashboard.stats.avgSpeed'), value: '94.2 Mbps' },
        { label: t('dashboard.stats.testsRun'), value: '412' },
      ],
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </div>
  )
}
