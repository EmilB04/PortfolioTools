import { Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './nav/Sidebar'
import { SpotlightSearch } from './SpotlightSearch'
import { ToolIntroduction } from './ToolIntroduction'
import { PageSeo } from './PageSeo'
import { Footer } from './footer/Footer'
import HeaderSection from './header/HeaderSection'

function getInitialCollapsed(): boolean {
  try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
}

export interface LayoutOutletContext {
  openSearch: (query?: string) => void
}

export function Layout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchRequest, setSearchRequest] = useState<{ query: string } | null>(null)

  const openSearch = useCallback((query = '') => {
    setMobileOpen(false)
    setSearchRequest({ query })
  }, [])

  // Preserve existing search links while keeping ordinary typing local to the overlay.
  useEffect(() => {
    if (location.pathname !== '/') return
    const params = new URLSearchParams(location.search)
    if (!params.has('q') && params.get('focus') !== 'search') return
    openSearch(params.get('q') ?? '')
    params.delete('q')
    params.delete('focus')
    navigate({ pathname: '/', search: params.toString() }, { replace: true })
  }, [location.pathname, location.search, navigate, openSearch])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const input = document.getElementById('spotlight-input') as HTMLInputElement | null
        if (input) { input.focus(); input.select() }
        else openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch { /* storage unavailable — non-fatal */ }
      return next
    })
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <PageSeo />
      {searchRequest && <SpotlightSearch initialQuery={searchRequest.query} onClose={() => setSearchRequest(null)} />}
      <a href="#main-content" className="skip-link">{t('nav.skipToContent')}</a>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('nav.closeMenu')}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: in flow, mobile: fixed overlay */}
      <div className="hidden lg:block shrink-0">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>
      <div id="mobile-tool-navigation" inert={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} mobileClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content — scrollable column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="relative z-20 shrink-0 h-[52px] flex items-center justify-between gap-2 border-b px-3 sm:px-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setMobileOpen(true)}
            aria-label={t('nav.openMenu')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-tool-navigation"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />

          <HeaderSection onSearch={openSearch} />
        </header>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <main id="main-content" tabIndex={-1} className="flex-1" style={{ padding: 'var(--gap-page)' }}>
            <Suspense fallback={<ToolIntroduction pathname={location.pathname} />}>
              <Outlet context={{ openSearch } satisfies LayoutOutletContext} />
            </Suspense>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
