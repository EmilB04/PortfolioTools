import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge, Activity, Zap } from 'lucide-react'

type Mode = 'continuous' | 'max'

export function SpeedTest() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('continuous')

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40">
          <Gauge size={22} className="text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('speedTest.title')}</h1>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setMode('continuous')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'continuous'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Activity size={15} />
          {t('speedTest.modeContinuous')}
        </button>
        <button
          onClick={() => setMode('max')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'max'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Zap size={15} />
          {t('speedTest.modeMax')}
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('speedTest.download'), value: '--', unit: t('speedTest.mbps'), color: 'text-blue-500' },
          { label: t('speedTest.upload'), value: '--', unit: t('speedTest.mbps'), color: 'text-indigo-500' },
          { label: t('speedTest.ping'), value: '--', unit: t('speedTest.ms'), color: 'text-violet-500' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col items-center gap-1">
            <p className={`text-4xl font-bold tabular-nums ${metric.color}`}>{metric.value}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{metric.unit}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 h-48 flex flex-col items-center justify-center gap-3">
        <span className="text-4xl">🚧</span>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('speedTest.comingSoon')}</p>
      </div>

      <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
        <Zap size={17} />
        {t('speedTest.start')}
      </button>
    </div>
  )
}
