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

// Third-party iOS browsers (Comet, Chrome, Firefox, ...) all render with WebKit but,
// unlike Safari itself, have no bridge to the Taptic Engine — the switch-toggle trick
// above is silent there. Since we can't detect that from script, give those browsers a
// visible pulse on the tapped element so a tap still reads as registered.
function pulseElement(el: HTMLElement) {
  el.classList.remove('haptic-pulse-active')
  void el.offsetWidth // restart the animation if it's already mid-pulse
  el.classList.add('haptic-pulse-active')
  el.addEventListener('animationend', () => el.classList.remove('haptic-pulse-active'), { once: true })
}

export function haptic(level: HapticLevel = 'light', el?: HTMLElement | null) {
  if (typeof navigator === 'undefined') return
  const supportsVibrate = typeof navigator.vibrate === 'function'
  if (supportsVibrate) {
    navigator.vibrate(VIBRATE_PATTERNS[level])
  } else {
    toggleIosSwitch(TOGGLE_COUNTS[level])
    if (el) pulseElement(el)
  }
}
