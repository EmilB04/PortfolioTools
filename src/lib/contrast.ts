// WCAG relative-luminance helpers, used to pick a readable foreground for text
// that sits on top of the user-selected accent fill.

const srgbToLinear = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/**
 * Foreground for text drawn on top of `background`.
 *
 * The bright accents used by the dark theme (lime, amber, cyan…) cannot carry
 * white text at 4.5:1 — darkening the fill enough to fix that would drain the
 * colour. Flipping to ink instead keeps the fill vivid and clears AA.
 */
export function readableOn(background: string, light = '#ffffff', dark = '#17111f'): string {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light
}
