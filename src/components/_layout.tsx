import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Footer } from './footer/Footer'
import { ThemeSwitcher } from './header/ThemeSwitcher'
import { LanguageSwitcher } from './header/LanguageSwitcher'
import { ShootingStars } from './ShootingStars'

function getInitialCollapsed(): boolean {
  try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch { }
      return next
    })
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>
      <ShootingStars />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: in flow, mobile: fixed overlay */}
      <div className="relative z-10 hidden lg:block shrink-0">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} mobileClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content — scrollable column */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="shrink-0 h-14 flex items-center justify-between gap-2 px-4 sm:px-6 border-b backdrop-blur-xl"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <main className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
