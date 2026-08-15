/** Shared presentation helpers for the password generator and checker. */
import type { StrengthLevel } from './password'

export const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  weak: '#ef4444',
  fair: '#f59e0b',
  strong: '#22c55e',
  excellent: '#14b8a6',
}

export function formatCrackTime(seconds: number, t: (key: string, params?: Record<string, unknown>) => string): string {
  if (seconds < 1) return t('passwordGenerator.crack.instant')
  const units: [string, number][] = [
    ['years', 31557600], ['days', 86400], ['hours', 3600], ['minutes', 60], ['seconds', 1],
  ]
  for (const [unit, size] of units) {
    const value = seconds / size
    if (value >= 1) {
      if (unit === 'years' && value > 1e6) {
        return t('passwordGenerator.crack.eons', { value: value.toExponential(1) })
      }
      return t(`passwordGenerator.crack.${unit}`, { value: Math.round(value).toLocaleString() })
    }
  }
  return t('passwordGenerator.crack.instant')
}
