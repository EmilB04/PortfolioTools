import { useEffect, useState } from 'react';
import { readPreference, writePreference } from '../lib/cookieConsent';
import { useCookieConsent } from './useCookieConsent';
import { THEME_STORAGE_KEY, ThemeContext } from './theme-context';
import type { ResolvedTheme, Theme } from './theme-context';

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getInitialTheme = (): Theme => {
  const stored = readPreference(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
};

const resolveTheme = (theme: Theme): ResolvedTheme =>
  theme === 'system' ? getSystemTheme() : theme;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useCookieConsent();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getInitialTheme()));

  useEffect(() => {
    if (consent === 'accepted') {
      writePreference(THEME_STORAGE_KEY, theme);
    }
    setResolvedTheme(resolveTheme(theme));

    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(getSystemTheme());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme, consent]);

  useEffect(() => {
    const root = document.documentElement;
    // CSS tokens are dark-first via `html.light`; Tailwind `dark:` variants need `html.dark`.
    root.classList.toggle('light', resolvedTheme === 'light');
    root.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
