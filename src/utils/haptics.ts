export type HapticLevel = 'light' | 'medium' | 'heavy'

const VIBRATE_PATTERNS: Record<HapticLevel, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: [15, 40, 15],
}

// iOS Safari has no Vibration API at all, so `navigator.vibrate` is undefined there.
// The only way to get real Taptic feedback is to toggle a native switch control —
// even a synthetic .click() on it fires the system haptic.
const TOGGLE_COUNTS: Record<HapticLevel, number> = { light: 1, medium: 1, heavy: 2 }

let iosSwitch: HTMLInputElement | null = null

function getIosSwitch(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null
  if (iosSwitch) return iosSwitch

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.setAttribute('aria-hidden', 'true')
  input.tabIndex = -1
  Object.assign(input.style, {
    position: 'fixed',
    top: '-100px',
    left: '-100px',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.appendChild(input)
  iosSwitch = input
  return input
}

function toggleIosSwitch(times: number) {
  const el = getIosSwitch()
  if (!el) return
  let fired = 0
  const fire = () => {
    el.click()
    fired++
    if (fired < times) setTimeout(fire, 90)
  }
  fire()
}

export function haptic(level: HapticLevel = 'light') {
  if (typeof navigator === 'undefined') return
  const supportsVibrate = typeof navigator.vibrate === 'function'
  if (supportsVibrate) {
    navigator.vibrate(VIBRATE_PATTERNS[level])
  } else {
    toggleIosSwitch(TOGGLE_COUNTS[level])
  }
}
