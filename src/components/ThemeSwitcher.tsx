import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

export function ThemeSwitcher() {
  const { theme, toggle } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      {theme === 'light' ? t('theme.dark') : t('theme.light')}
    </button>
  )
}
