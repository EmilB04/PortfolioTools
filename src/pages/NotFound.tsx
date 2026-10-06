import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="page-container page-container-medium space-y-5 py-12">
      <p className="font-mono text-[var(--accent-text)]">404</p>
      <h1 className="fs-2xl">{t('notFound.title')}</h1>
      <p className="text-[var(--text-subtle)]">{t('notFound.description')}</p>
      <Link to="/?focus=search" className="inline-flex rounded-xl border border-[var(--accent-border)] px-4 py-2 text-[var(--accent-text)]">
        {t('dashboard.search.label')}
      </Link>
    </div>
  )
}
