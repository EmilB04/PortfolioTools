import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Search, X } from 'lucide-react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { ToolCard } from '../components/ToolCard'
import { CATEGORY_ORDER, DASHBOARD_TOOLS } from '../tools/registry'
import { getSearchableTools } from '../tools/search'
import type { LayoutOutletContext } from '../components/_layout'

const SUGGESTIONS = ['jsonTools', 'fileCompress', 'qrGenerator', 'passwordGenerator']
const CATEGORIES = CATEGORY_ORDER.filter(category => DASHBOARD_TOOLS.some(tool => tool.category === category))

export function Dashboard() {
  const { t } = useTranslation()
  const { openSearch } = useOutletContext<LayoutOutletContext>()
  const [params, setParams] = useSearchParams()
  const requestedCategory = params.get('category')
  const category = CATEGORIES.find(value => value === requestedCategory) ?? 'all'
  const isFiltering = category !== 'all'
  const tools = useMemo(() => getSearchableTools(t), [t])
  const filteredTools = tools.filter(tool => category === 'all' || tool.category === category)

  function updateCategory(nextCategory: string) {
    const next = new URLSearchParams(params)
    if (nextCategory === 'all') next.delete('category')
    else next.set('category', nextCategory)
    setParams(next, { replace: true })
  }

  const groups = CATEGORIES.map(value => ({
    category: value,
    items: filteredTools.filter(tool => tool.category === value),
  })).filter(group => group.items.length > 0)

  function renderCard(tool: typeof tools[number]) {
    return <ToolCard key={tool.key} title={tool.title} description={tool.description} badge={tool.badge}
      href={tool.to} headingLevel={isFiltering ? 3 : 4} icon={<tool.icon size={22} strokeWidth={1.7} />} />
  }

  return (
    <div className="page-container tool-directory">
      <section className="discovery-hero" aria-labelledby="discovery-title">
        <svg className="discovery-landscape" viewBox="0 0 1200 420" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1">
            <path d="M-80 290C80 110 120 400 310 270S540 420 640 390" />
            <path d="M-80 307C80 127 120 417 310 287S540 437 640 407" />
            <path d="M-80 324C80 144 120 434 310 304S540 454 640 424" />
            <path d="M-80 341C80 161 120 451 310 321S540 471 640 441" />
            <path d="M-80 358C80 178 120 468 310 338S540 488 640 458" />
            <path d="M850-60C960 80 1030-10 1130 120S1200 150 1300 120" />
            <path d="M850-43C960 97 1030 7 1130 137S1200 167 1300 137" />
            <path d="M850-26C960 114 1030 24 1130 154S1200 184 1300 154" />
            <path d="M850-9C960 131 1030 41 1130 171S1200 201 1300 171" />
            <path d="M850 8C960 148 1030 58 1130 188S1200 218 1300 188" />
          </g>
        </svg>
        <div className="discovery-eyebrow">
          <span className="discovery-dot" aria-hidden="true" />
          {t('dashboard.collection', { count: tools.length, categories: CATEGORIES.length })}
        </div>
        <h1 id="discovery-title">{t('dashboard.title')}<span>{t('dashboard.titleAccent')}</span></h1>
        <p className="discovery-intro">{t('dashboard.subtitle')}</p>

        <button type="button" className="discovery-search discovery-search-launcher" onClick={() => openSearch()}
          aria-haspopup="dialog" aria-label={t('dashboard.search.label')}>
          <Search size={24} strokeWidth={1.8} aria-hidden="true" />
          <span className="discovery-search-placeholder">{t('dashboard.search.placeholder')}</span>
          <kbd className="search-shortcut">{t('dashboard.search.shortcut')}</kbd>
          <span className="search-submit" aria-hidden="true"><ArrowRight size={22} /></span>
        </button>
        <div className="discovery-under-search">
          <div className="search-suggestions">
            <span>{t('dashboard.search.try')}</span>
            {SUGGESTIONS.map(key => <button type="button" key={key} onClick={() => openSearch(t(`tools.${key}.name`))}>
              {t(`dashboard.suggestions.${key}`)}<ArrowRight size={12} aria-hidden="true" />
            </button>)}
          </div>
        </div>
      </section>

      <section className="directory-browser" aria-labelledby="browse-title">
        <div className="directory-heading">
          <div>
            <h2 id="browse-title">{t(category === 'all' ? 'dashboard.browseTitle' : `nav.categories.${category}`)}</h2>
            <p>{t(category === 'all' ? 'dashboard.browseDescription' : `dashboard.categoryDescriptions.${category}`)}</p>
          </div>
          <span className="directory-total" role="status" aria-live="polite" aria-atomic="true">
            {t('dashboard.toolCount', { count: filteredTools.length })}
          </span>
        </div>
        <div className="directory-filters" role="group" aria-label={t('dashboard.filters.label')}>
          {['all', ...CATEGORIES].map(value => <button key={value} type="button"
            aria-pressed={category === value} onClick={() => updateCategory(value)}>
            {t(value === 'all' ? 'dashboard.filters.all' : `nav.categories.${value}`)}
            <span>{value === 'all' ? tools.length : tools.filter(tool => tool.category === value).length}</span>
          </button>)}
        </div>
        {isFiltering && <div className="directory-active-filters">
          <p>{t('dashboard.search.browsingCategory', { category: t(`nav.categories.${category}`) })}</p>
          <button type="button" onClick={() => updateCategory('all')}>{t('dashboard.search.reset')}<X size={14} aria-hidden="true" /></button>
        </div>}

        {isFiltering ? <div className="directory-grid">{filteredTools.map(renderCard)}</div>
          : groups.map(group => <section className="directory-category" key={group.category} aria-labelledby={`category-${group.category}`}>
            <div className="directory-category-heading">
              <h3 id={`category-${group.category}`}>{t(`nav.categories.${group.category}`)}</h3>
              <p>{t(`dashboard.categoryDescriptions.${group.category}`)}</p>
            </div>
            <div className="directory-grid">{group.items.map(renderCard)}</div>
          </section>)}
      </section>
      <div className="directory-note"><span className="discovery-dot" aria-hidden="true" />{t('dashboard.note')}</div>
    </div>
  )
}
