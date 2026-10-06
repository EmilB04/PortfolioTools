/* eslint-disable react-refresh/only-export-components -- Server/build entry, not a client Fast Refresh boundary. */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './i18n'
import { Layout } from './components/_layout'
import { ToolIntroduction } from './components/ToolIntroduction'
import { CookieConsentProvider } from './contexts/CookieConsentProvider'
import { ThemeContext } from './contexts/theme-context'
import { Dashboard } from './pages/Dashboard'

const initialTheme = {
  theme: 'system' as const,
  resolvedTheme: 'dark' as const,
  setTheme: () => {},
  toggleTheme: () => {},
}

function NoScriptNote() {
  const { t } = useTranslation()
  return <noscript><p className="page-container mt-6 fs-sm" style={{ color: 'var(--text-subtle)' }}>{t('seo.enableJavaScript')}</p></noscript>
}

/** Reuse the real landing page and layout instead of flashing an unrelated
 * directory while the client downloads. No browser globals are read here. */
export function renderInitialPage(url: string) {
  const pathname = new URL(url, 'https://tools.emilb.no').pathname
  return renderToStaticMarkup(
    <CookieConsentProvider>
      <ThemeContext.Provider value={initialTheme}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<><Dashboard /><NoScriptNote /></>} />
              <Route path="*" element={<><ToolIntroduction pathname={pathname} /><NoScriptNote /></>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </CookieConsentProvider>,
  )
}
