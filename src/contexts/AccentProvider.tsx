import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from './ThemeContext'
import { useCookieConsent } from './useCookieConsent'
import { readPreference, writePreference } from '../lib/cookieConsent'
import { ACCENT_PRESETS, ACCENT_STORAGE_KEY, AccentContext, DEFAULT_ACCENT } from './accent-context'
import type { AccentColor } from './accent-context'
import { readableOn } from '../lib/contrast'

function getInitialAccent(): AccentColor {
    const stored = readPreference(ACCENT_STORAGE_KEY) as AccentColor | null
    if (stored && stored in ACCENT_PRESETS) return stored
    return DEFAULT_ACCENT
}

export function AccentProvider({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useTheme()
    const { consent } = useCookieConsent()
    const [accent, setAccentState] = useState<AccentColor>(getInitialAccent)

    useEffect(() => {
        const preset = ACCENT_PRESETS[accent] ?? ACCENT_PRESETS[DEFAULT_ACCENT]
        const value = resolvedTheme === 'dark' ? preset.dark : preset.light
        const root = document.documentElement
        root.style.setProperty('--accent', value)
        // Foreground for text sitting on an --accent fill. Flips to ink for the
        // bright accents (lime, amber, cyan…) that white text cannot clear AA on.
        root.style.setProperty('--accent-on', readableOn(value))

        if (consent === 'accepted') {
            writePreference(ACCENT_STORAGE_KEY, accent)
        }
    }, [accent, resolvedTheme, consent])

    return (
        <AccentContext.Provider value={{ accent, setAccent: setAccentState }}>
            {children}
        </AccentContext.Provider>
    )
}
