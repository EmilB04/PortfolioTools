import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPageSeo } from '../lib/seo'

/** Keep metadata aligned with client navigation and the selected language.
 * The build also writes this metadata into each route's initial HTML. */
export function PageSeo() {
  const { pathname } = useLocation()
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language

  useEffect(() => {
    const page = getPageSeo(pathname, language)
    document.title = page.title
    document.documentElement.lang = page.lang
    document.head.querySelectorAll('[data-page-seo]').forEach(node => node.remove())
    for (const meta of page.meta) {
      const element = document.createElement('meta')
      if (meta.name) element.name = meta.name
      else element.setAttribute('property', meta.property!)
      element.content = meta.content
      element.dataset.pageSeo = ''
      document.head.appendChild(element)
    }
    if (page.canonical) {
      const canonical = document.createElement('link')
      canonical.rel = 'canonical'
      canonical.href = page.canonical
      canonical.dataset.pageSeo = ''
      document.head.appendChild(canonical)
    }
    if (page.structuredData) {
      const schema = document.createElement('script')
      schema.type = 'application/ld+json'
      schema.dataset.pageSeo = ''
      schema.textContent = JSON.stringify(page.structuredData)
      document.head.appendChild(schema)
    }
  }, [pathname, language])

  return null
}
