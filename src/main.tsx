import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import { CookieConsentProvider } from './contexts/CookieConsentProvider'
import { ThemeProvider } from './contexts/ThemeContext'
import { AccentProvider } from './contexts/AccentProvider'
import App from './App'
import CookieConsentBanner from './components/CookieConsentBanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CookieConsentProvider>
      <ThemeProvider>
        <AccentProvider>
          <App />
          <CookieConsentBanner />
        </AccentProvider>
      </ThemeProvider>
    </CookieConsentProvider>
  </StrictMode>
)
