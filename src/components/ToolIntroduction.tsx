import { useTranslation } from 'react-i18next'
import { ToolShell, InfoPanel } from './tools/ToolUI'
import { NotFound } from '../pages/NotFound'
import { getPageSeo } from '../lib/seo'

/** Styled initial content for tools whose browser-only controls are still loading. */
export function ToolIntroduction({ pathname }: { pathname: string }) {
  const { i18n, t } = useTranslation()
  const page = getPageSeo(pathname, i18n.resolvedLanguage ?? i18n.language)
  if (!page.tool || !page.copy) return <NotFound />
  const { tool, copy, locale } = page
  const Icon = tool.icon
  const heading = (locale as unknown as Record<string, { title?: string; subtitle?: string }>)[tool.key]
  return (
    <ToolShell icon={<Icon size={20} />} color={tool.color}
      title={heading?.title ?? copy.name} subtitle={heading?.subtitle ?? copy.description} info={copy.info}>
      <span role="status" className="sr-only">{t('toolCommon.loading')}</span>
      <InfoPanel {...copy.info} color={tool.color} />
    </ToolShell>
  )
}
