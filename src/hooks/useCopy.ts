import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copy-to-clipboard with a short-lived "copied" acknowledgement.
 *
 * Falls back to a hidden textarea + `document.execCommand` because the async
 * Clipboard API is unavailable on insecure origins and in some embedded webviews.
 */
export function useCopy(resetAfterMs = 1600) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = useCallback(async (value: string) => {
    if (!value) return false
    let ok = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        ok = true
      }
    } catch {
      ok = false
    }

    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = value
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        ok = false
      }
    }

    setCopied(ok)
    setFailed(!ok)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { setCopied(false); setFailed(false) }, resetAfterMs)
    return ok
  }, [resetAfterMs])

  return { copy, copied, failed }
}
