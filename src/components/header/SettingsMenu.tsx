import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiSettings } from 'react-icons/fi'
import { SUPPORTED_LANGUAGES } from '../../lib/i18n.ts'
import { ACCENT_PRESETS, type AccentColor } from '../../contexts/accent-context'
import { useAccent } from '../../contexts/useAccent'
import { useTheme } from '../../contexts/useTheme'
import { useCookieConsent } from '../../contexts/useCookieConsent'
import { writePreference } from '../../lib/cookieConsent'

function MoonIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    )
}

function SystemIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
    )
}

function SunIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                <line
                    key={a}
                    x1={12 + 6.5 * Math.cos(a * Math.PI / 180)}
                    y1={12 + 6.5 * Math.sin(a * Math.PI / 180)}
                    x2={12 + 9.5 * Math.cos(a * Math.PI / 180)}
                    y2={12 + 9.5 * Math.sin(a * Math.PI / 180)}
                />
            ))}
        </svg>
    )
}

const SECTION_HEADING =
    'mb-1.5 px-1 fs-xs font-mono font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]'

/** Offsets for the sliding selection pill, one per segment position. */
const INDICATOR_TRANSLATE: Record<string, string> = {
    dark: 'translateX(3px)',
    system: 'translateX(calc(100% + 3px))',
    light: 'translateX(calc(200% + 3px))',
}

type ThemeValue = 'dark' | 'system' | 'light'

const THEME_OPTIONS: { value: ThemeValue; labelKey: string; Icon: () => React.JSX.Element }[] = [
    { value: 'dark', labelKey: 'theme.dark', Icon: MoonIcon },
    { value: 'system', labelKey: 'theme.system', Icon: SystemIcon },
    { value: 'light', labelKey: 'theme.light', Icon: SunIcon },
]

export default function SettingsMenu() {
    const { i18n, t } = useTranslation()
    const { theme, resolvedTheme, setTheme } = useTheme()
    const { accent, setAccent } = useAccent()
    const { consent, accept, decline, showBanner } = useCookieConsent()
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement | null>(null)

    const currentLanguage =
        SUPPORTED_LANGUAGES.find((language) => language.code === i18n.language)?.code ??
        i18n.resolvedLanguage ??
        'en'

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    async function handleLanguageSelect(code: string) {
        await i18n.changeLanguage(code)
        writePreference('lang', code)
    }

    return (
        <div ref={rootRef} className="relative inline-flex">
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className={`
                    group inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-[var(--surface-card)]
                    px-2 fs-xs font-semibold transition-colors duration-150 sm:px-2.5
                    motion-reduce:transition-none
                    ${open
                        ? 'border-[var(--accent-border)] text-[var(--text)]'
                        : 'border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--accent-border)] hover:text-[var(--text)]'
                    }
                `}
            >
                <FiSettings
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-out ${open ? 'rotate-90' : ''}`}
                />
                <span className="hidden sm:inline">{t('settingsMenu.settings')}</span>
                <span className="sr-only sm:hidden">{t('settingsMenu.settings')}</span>
            </button>

            <div
                role="dialog"
                aria-label={t('settingsMenu.settings')}
                className={`
                    pp-dropdown-panel absolute right-0 top-[calc(100%+0.5rem)] z-[600] w-[17.5rem] max-w-[calc(100vw-2rem)]
                    max-h-[70vh] overflow-y-auto rounded-2xl
                    transition-all duration-200 ease-out origin-top-right motion-reduce:transition-none
                    ${open
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
                    }
                `}
            >
                {/* p-2 against rounded-lg children keeps the panel and its rows concentric. */}
                <div className="flex flex-col gap-3 p-2">
                    <section>
                        <h3 className={SECTION_HEADING}>{t('languageSwitcher.section')}</h3>
                        <div role="listbox" aria-label={t('languageSwitcher.choose')} className="flex flex-col gap-0.5">
                            {SUPPORTED_LANGUAGES.map((language) => {
                                const selected = language.code === currentLanguage
                                return (
                                    <button
                                        key={language.code}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => void handleLanguageSelect(language.code)}
                                        className={`
                                            flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left fs-sm
                                            transition-colors duration-150 motion-reduce:transition-none
                                            ${selected
                                                ? 'bg-[var(--accent-bg)] font-semibold text-[var(--accent-text)]'
                                                : 'font-medium text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                                            }
                                        `}
                                    >
                                        <span>{language.label}</span>
                                        {selected && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section>
                        <h3 className={SECTION_HEADING}>{t('settingsMenu.appearance')}</h3>
                        <div className="relative grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-[3px]">
                            <span
                                className="pointer-events-none absolute inset-y-[3px] rounded-[5px] border border-[var(--accent-border)] bg-[var(--accent-bg)] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
                                style={{
                                    width: 'calc(33.333% - 2px)',
                                    transform: INDICATOR_TRANSLATE[theme],
                                }}
                            />
                            {THEME_OPTIONS.map(({ value, labelKey, Icon }) => {
                                const selected = theme === value
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setTheme(value)}
                                        style={{ color: selected ? 'var(--accent-text)' : 'var(--text-subtle)' }}
                                        className="relative z-10 flex items-center justify-center gap-1.5 rounded-[5px] px-1 py-1.5 fs-xs font-semibold transition-colors duration-150 hover:text-[var(--text)]"
                                    >
                                        <Icon />
                                        {t(labelKey)}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section>
                        <h3 className={SECTION_HEADING}>{t('settingsMenu.accentColor')}</h3>
                        <div role="listbox" aria-label={t('settingsMenu.chooseAccent')} className="grid grid-cols-7 gap-1">
                            {(Object.keys(ACCENT_PRESETS) as AccentColor[]).map((color) => {
                                const preset = ACCENT_PRESETS[color]
                                const selected = color === accent
                                return (
                                    <button
                                        key={color}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        aria-label={preset.label}
                                        title={preset.label}
                                        onClick={() => setAccent(color)}
                                        className={`
                                            flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150
                                            ${selected ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--border-strong)]'}
                                        `}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="h-4 w-4 rounded-full"
                                            style={{
                                                background: resolvedTheme === 'dark' ? preset.dark : preset.light,
                                                boxShadow: 'inset 0 0 0 1px var(--swatch-ring)',
                                            }}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section className="border-t border-[var(--border)] pt-3">
                        <h3 className={SECTION_HEADING}>{t('cookieConsent.section')}</h3>
                        <p className="mb-2 px-1 fs-xs" style={{ color: 'var(--text-muted)' }}>
                            {consent === 'accepted'
                                ? t('cookieConsent.statusAccepted')
                                : consent === 'declined'
                                    ? t('cookieConsent.statusDeclined')
                                    : t('cookieConsent.statusUndecided')}
                        </p>
                        {consent === null ? (
                            <div className="flex gap-1.5 px-1">
                                <button
                                    type="button"
                                    onClick={accept}
                                    className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 fs-xs font-semibold text-[var(--accent-on)] transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none"
                                >
                                    {t('cookieConsent.accept')}
                                </button>
                                <button
                                    type="button"
                                    onClick={decline}
                                    className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 fs-xs font-semibold text-[var(--text-subtle)] transition-colors duration-150 hover:border-[var(--accent-border)] hover:text-[var(--text)]"
                                >
                                    {t('cookieConsent.decline')}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={showBanner}
                                className="w-full rounded-lg px-1 py-1 text-left fs-xs underline text-[var(--text-subtle)] transition-colors duration-150 hover:text-[var(--text)]"
                            >
                                {t('cookieConsent.manage')}
                            </button>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}
