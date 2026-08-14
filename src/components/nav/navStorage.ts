import { readPreference, writePreference } from '../../lib/cookieConsent'

/**
 * Which sidebar categories the user has collapsed. Stored through the same
 * consent-gated preference helper as the theme and accent settings, so declining
 * cookies keeps the nav stateless rather than writing behind the user's back.
 */
const KEY = 'nav-collapsed-groups'

export function loadCollapsedGroups(): Set<string> {
  const stored = readPreference(KEY)
  if (!stored) return new Set()
  return new Set(stored.split(',').filter(Boolean))
}

export function saveCollapsedGroups(groups: Set<string>) {
  writePreference(KEY, [...groups].join(','))
}
