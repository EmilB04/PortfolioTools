import en from '../i18n/locales/en.json' with { type: 'json' }
import no from '../i18n/locales/no.json' with { type: 'json' }
import { DASHBOARD_TOOLS, TOOLS } from '../tools/registry.ts'

export const SITE_URL = 'https://tools.emilb.no'
export const SITE_NAME = 'Portfolio Tools'

export function getPageSeo(pathname: string, language = 'en') {
  const locale = language.startsWith('no') || language.startsWith('nb') ? no : en
  const path = pathname.replace(/\/+$/, '') || '/'
  const tool = TOOLS.find(item => item.to === path)
  const copy = tool && tool.key !== 'dashboard'
    ? (locale.tools as Record<string, { name: string; summary: string; description: string; info: { input: string; process: string; output: string } }>)[tool.key]
    : undefined
  const home = path === '/'
  const title = home
    ? `${SITE_NAME} | ${locale.dashboard.search.label.toLowerCase()}`
    : copy ? `${copy.name} | ${SITE_NAME}` : `${locale.notFound.title} | ${SITE_NAME}`
  const description = home ? locale.seo.description : copy?.summary ?? locale.notFound.description
  const canonical = tool ? `${SITE_URL}${path}` : undefined
  const structuredData = tool ? {
    '@context': 'https://schema.org',
    '@type': home ? 'CollectionPage' : 'WebPage',
    name: title,
    description,
    url: canonical,
    inLanguage: locale === no ? 'nb' : 'en',
    ...(home ? {
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: DASHBOARD_TOOLS.map((item, index) => ({
          '@type': 'ListItem', position: index + 1,
          name: (locale.tools as Record<string, { name: string }>)[item.key].name,
          url: `${SITE_URL}${item.to}`,
        })),
      },
    } : {
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: copy!.name, item: canonical },
        ],
      },
    }),
  } : undefined

  return {
    title, description, canonical, structuredData, tool, copy, locale,
    lang: locale === no ? 'nb' : 'en',
    meta: [
      { name: 'description', content: description },
      { name: 'robots', content: tool ? 'index, follow' : 'noindex, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:locale', content: locale === no ? 'nb_NO' : 'en_GB' },
      ...(canonical ? [{ property: 'og:url', content: canonical }] : []),
      { property: 'og:image', content: `${SITE_URL}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: SITE_NAME },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: `${SITE_URL}/og-image.png` },
      { name: 'twitter:image:alt', content: SITE_NAME },
    ],
  }
}
