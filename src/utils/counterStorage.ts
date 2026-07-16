export interface CounterState {
  entered: number
  exited: number
}

const KEY = 'pt-counter-state'

export function loadCounterState(): CounterState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (parsed && typeof parsed.entered === 'number' && typeof parsed.exited === 'number') {
      return parsed
    }
  } catch { /* ignore malformed storage */ }
  return { entered: 0, exited: 0 }
}

export function saveCounterState(state: CounterState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch { /* storage unavailable — ignore */ }
}
