import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, CornerDownLeft, Search, SearchX, X } from 'lucide-react'
import { getSearchableTools, searchTools } from '../tools/search'

export function SpotlightSearch({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const [activeIndex, setActiveIndex] = useState(0)
  const [composing, setComposing] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const id = useId()
  const tools = useMemo(() => getSearchableTools(t), [t])
  const results = useMemo(() => searchTools(query, tools), [query, tools])
  const selectedIndex = Math.min(activeIndex, results.length - 1)
  const selected = results[selectedIndex]
  const listId = `${id}-results`

  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
    inputRef.current?.focus()
    inputRef.current?.select()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, query])

  function close() {
    dialogRef.current?.close()
    onClose()
  }

  function openTool(path: string) {
    close()
    navigate(path)
    // The opener can disappear during navigation; put focus in the new page.
    window.requestAnimationFrame(() => document.getElementById('main-content')?.focus())
  }

  return (
    <dialog id="tool-spotlight" ref={dialogRef} className="spotlight-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={event => { event.preventDefault(); close() }}
      onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div className="spotlight-window">
        <h2 id={`${id}-title`} className="sr-only">{t('dashboard.search.label')}</h2>
        <div className="spotlight-input-row">
          <Search size={25} strokeWidth={1.7} aria-hidden="true" />
          <label htmlFor="spotlight-input" className="sr-only">{t('dashboard.search.label')}</label>
          <input id="spotlight-input" ref={inputRef} type="text" role="combobox" value={query}
            autoComplete="off" autoCapitalize="off" spellCheck={false}
            placeholder={t('dashboard.search.placeholder')}
            aria-autocomplete="list" aria-expanded="true" aria-controls={listId}
            aria-activedescendant={selected ? `${id}-${selected.key}` : undefined}
            aria-describedby={`${id}-hint`}
            onChange={event => { setQuery(event.target.value); setActiveIndex(0) }}
            onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
            onKeyDown={event => {
              if (composing || event.nativeEvent.isComposing) return
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                if (results.length) setActiveIndex((selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length)
              } else if (event.key === 'Enter' && selected) {
                event.preventDefault()
                openTool(selected.to)
              }
            }} />
          {query && <button type="button" className="spotlight-clear" aria-label={t('dashboard.search.clear')}
            onClick={() => { setQuery(''); setActiveIndex(0); inputRef.current?.focus() }}>
            <X size={16} aria-hidden="true" />
          </button>}
          <button type="button" className="spotlight-close" aria-label={t('spotlight.close')} onClick={close}>
            <kbd aria-hidden="true">esc</kbd><X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="spotlight-results-heading">
          <span>{t(query.trim() ? 'spotlight.results' : 'dashboard.filters.all')}</span>
          <span role="status" aria-live="polite" aria-atomic="true">{t('dashboard.toolCount', { count: results.length })}</span>
        </div>
        <ul id={listId} role="listbox" aria-label={t('spotlight.results')} className="spotlight-results">
          {results.map((tool, index) => {
            const Icon = tool.icon
            const active = index === selectedIndex
            return <li key={tool.key} role="presentation">
              <a id={`${id}-${tool.key}`} ref={node => { optionRefs.current[index] = node }}
                href={tool.to} role="option" aria-selected={active} tabIndex={-1}
                className="spotlight-result" onMouseMove={() => setActiveIndex(index)}
                onMouseDown={event => event.preventDefault()}
                onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  event.preventDefault(); openTool(tool.to)
                }}>
                <span className="spotlight-result-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.7} /></span>
                <span className="spotlight-result-copy"><span className="spotlight-result-title">{tool.title}</span>
                  <span className="spotlight-result-description">{tool.description}</span></span>
                <span className="spotlight-result-category">{tool.categoryLabel}</span>
                <CornerDownLeft size={16} className="spotlight-result-enter" aria-hidden="true" />
              </a>
            </li>
          })}
        </ul>
        {!results.length && <div className="spotlight-empty">
          <SearchX size={28} aria-hidden="true" />
          <p>{t('dashboard.search.noResults', { query: query.trim() })}</p>
          <span>{t('spotlight.noResultsHint')}</span>
        </div>}
        <p id={`${id}-hint`} className="sr-only">{t('spotlight.keyboardHint')}</p>
        <div className="spotlight-footer" aria-hidden="true">
          <span><kbd><ArrowUp size={11} /><ArrowDown size={11} /></kbd>{t('spotlight.navigate')}</span>
          <span><kbd><CornerDownLeft size={12} /></kbd>{t('spotlight.open')}</span>
          <span><kbd>esc</kbd>{t('spotlight.dismiss')}</span>
        </div>
      </div>
    </dialog>
  )
}
