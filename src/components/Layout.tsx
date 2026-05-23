import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { ThemeSwitcher } from './ThemeSwitcher'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0a0f1e]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-14 flex items-center justify-end gap-2 px-6 border-b border-gray-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#0a0f1e]/80 backdrop-blur-xl">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </header>
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
