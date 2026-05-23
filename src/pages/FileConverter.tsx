import { useTranslation } from 'react-i18next'
import { FileInput, Upload } from 'lucide-react'

export function FileConverter() {
  const { t } = useTranslation()

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40">
          <FileInput size={22} className="text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('fileConverter.title')}</h1>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 transition-colors group">
        <div className="p-4 rounded-full bg-gray-50 dark:bg-gray-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/40 transition-colors">
          <Upload size={28} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">{t('fileConverter.dropzone')}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 flex flex-col items-center gap-3">
        <span className="text-4xl">🚧</span>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('fileConverter.comingSoon')}</p>
      </div>
    </div>
  )
}
