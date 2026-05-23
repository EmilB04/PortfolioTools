import { useCallback, useEffect, useRef, useState } from 'react'

export type TestPhase = 'idle' | 'warmup' | 'ping' | 'download' | 'upload' | 'complete'

export interface SpeedResult {
  download: number | null
  upload: number | null
  ping: number | null
}

export interface Measurement extends SpeedResult {
  timestamp: number
}

const CF_DOWN = (bytes: number) =>
  `https://speed.cloudflare.com/__down?bytes=${bytes}&_=${Math.random()}`
const CF_UP = 'https://speed.cloudflare.com/__up'

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const id = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

async function measurePing(signal: AbortSignal): Promise<number> {
  const base = 'https://speed.cloudflare.com/__down?bytes=0'
  await fetch(`${base}&_=${Math.random()}`, { cache: 'no-store', signal })
  await fetch(`${base}&_=${Math.random()}`, { cache: 'no-store', signal })

  const samples: number[] = []
  for (let i = 0; i < 5; i++) {
    const url = `${base}&_=${Math.random()}`
    const t0 = performance.now()
    await fetch(url, { cache: 'no-store', signal })
    const wallMs = performance.now() - t0
    const entry = (
      performance.getEntriesByName(url, 'resource') as PerformanceResourceTiming[]
    ).at(-1)
    samples.push(
      entry && entry.requestStart > 0 && entry.responseStart > 0
        ? entry.responseStart - entry.requestStart
        : wallMs
    )
  }
  samples.sort((a, b) => a - b)
  return samples[2]
}

async function measureDownloadStream(
  durationMs: number,
  parallel: number,
  signal: AbortSignal,
  onProgress: (mbps: number) => void
): Promise<number> {
  const BYTES_EACH = 200 * 1024 * 1024

  const timeoutCtrl = new AbortController()
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), durationMs)
  const onUserAbort = () => timeoutCtrl.abort()
  signal.addEventListener('abort', onUserAbort, { once: true })

  const startTime = performance.now()
  const byteCounts = new Array<number>(parallel).fill(0)
  let windowStart = startTime
  let windowBytes = 0
  const mu = { value: 0 }

  const progressId = setInterval(() => {
    const now = performance.now()
    const windowSecs = (now - windowStart) / 1000
    if (windowSecs < 0.05 || mu.value === windowBytes) return
    onProgress((windowBytes * 8) / windowSecs / 1_000_000)
    windowBytes = 0
    windowStart = now
    mu.value = windowBytes
  }, 200)

  try {
    await Promise.allSettled(
      Array.from({ length: parallel }, async (_, idx) => {
        const res = await fetch(CF_DOWN(BYTES_EACH), { cache: 'no-store', signal: timeoutCtrl.signal })
        const reader = res.body!.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          byteCounts[idx] += value.byteLength
          windowBytes += value.byteLength
        }
      })
    )
  } finally {
    clearInterval(progressId)
    clearTimeout(timeoutId)
    signal.removeEventListener('abort', onUserAbort)
  }

  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const total = byteCounts.reduce((a, b) => a + b, 0)
  if (total === 0) throw new Error('No data received')
  const secs = (performance.now() - startTime) / 1000
  return (total * 8) / secs / 1_000_000
}

async function measureUploadStream(
  durationMs: number,
  signal: AbortSignal,
  onProgress: (mbps: number) => void
): Promise<number> {
  const CHUNK = 4 * 1024 * 1024
  const PARALLEL = 4
  const body = new Blob([new Uint8Array(CHUNK)], { type: 'text/plain;charset=UTF-8' })

  const timeoutCtrl = new AbortController()
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), durationMs)
  const onUserAbort = () => timeoutCtrl.abort()
  signal.addEventListener('abort', onUserAbort, { once: true })

  const startTime = performance.now()
  const bytesSent = new Array<number>(PARALLEL).fill(0)

  const progressId = setInterval(() => {
    const total = bytesSent.reduce((a, b) => a + b, 0)
    const secs = (performance.now() - startTime) / 1000
    if (secs > 0.5 && total > 0) onProgress((total * 8) / secs / 1_000_000)
  }, 250)

  try {
    await Promise.allSettled(
      Array.from({ length: PARALLEL }, async (_, idx) => {
        while (!timeoutCtrl.signal.aborted) {
          try {
            await fetch(CF_UP, { method: 'POST', body, signal: timeoutCtrl.signal })
            if (!timeoutCtrl.signal.aborted) bytesSent[idx] += CHUNK
          } catch { break }
        }
      })
    )
  } finally {
    clearInterval(progressId)
    clearTimeout(timeoutId)
    signal.removeEventListener('abort', onUserAbort)
  }

  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const total = bytesSent.reduce((a, b) => a + b, 0)
  if (total === 0) throw new Error('Upload failed')
  const secs = (performance.now() - startTime) / 1000
  return (total * 8) / secs / 1_000_000
}

export function useSpeedTest() {
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [current, setCurrent] = useState<SpeedResult>({ download: null, upload: null, ping: null })
  const [dlSamples, setDlSamples] = useState<number[]>([])
  const [ulSamples, setUlSamples] = useState<number[]>([])
  const [history, setHistory] = useState<Measurement[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (durationTimerRef.current) { clearTimeout(durationTimerRef.current); durationTimerRef.current = null }
    abortRef.current?.abort()
    setPhase('idle')
  }, [])

  const runContinuous = useCallback(async (signal: AbortSignal) => {
    // Only reset current readings, NOT history or waveform samples — persist across restarts
    setCurrent({ download: null, upload: null, ping: null })

    while (!signal.aborted) {
      let dlEma = 0
      let ulEma = 0
      const A = 0.35

      const onDl = (mbps: number) => {
        dlEma = dlEma === 0 ? mbps : A * mbps + (1 - A) * dlEma
        setCurrent(c => ({ ...c, download: +dlEma.toFixed(1) }))
        setDlSamples(prev => [...prev.slice(-299), mbps])
      }

      const onUl = (mbps: number) => {
        ulEma = ulEma === 0 ? mbps : A * mbps + (1 - A) * ulEma
        setCurrent(c => ({ ...c, upload: +ulEma.toFixed(1) }))
        setUlSamples(prev => [...prev.slice(-299), mbps])
      }

      try {
        setPhase('ping')
        const ping = await measurePing(signal)
        if (signal.aborted) break
        setCurrent(c => ({ ...c, ping: +ping.toFixed(0) }))

        setPhase('download')
        const download = await measureDownloadStream(5000, 1, signal, onDl)
        if (signal.aborted) break
        setCurrent(c => ({ ...c, download: +download.toFixed(1) }))

        setPhase('upload')
        const upload = await measureUploadStream(5000, signal, onUl)
        if (signal.aborted) break
        setCurrent(c => ({ ...c, upload: +upload.toFixed(1) }))

        setHistory(prev => [...prev.slice(-499), {
          timestamp: Date.now(),
          download: +download.toFixed(1),
          upload: +upload.toFixed(1),
          ping: +ping.toFixed(0),
        }])

        await sleep(3000, signal)
      } catch {
        if (signal.aborted) break
        try { await sleep(3000, signal) } catch { break }
      }
    }
  }, [])

  const runMax = useCallback(async (signal: AbortSignal) => {
    setCurrent({ download: null, upload: null, ping: null })
    setHistory([])
    setDlSamples([])
    setUlSamples([])
    let dlEma = 0; let ulEma = 0
    const A = 0.35

    const onDl = (mbps: number) => {
      dlEma = dlEma === 0 ? mbps : A * mbps + (1 - A) * dlEma
      setCurrent(c => ({ ...c, download: +dlEma.toFixed(1) }))
      setDlSamples(prev => [...prev.slice(-299), mbps])
    }
    const onUl = (mbps: number) => {
      ulEma = ulEma === 0 ? mbps : A * mbps + (1 - A) * ulEma
      setCurrent(c => ({ ...c, upload: +ulEma.toFixed(1) }))
      setUlSamples(prev => [...prev.slice(-299), mbps])
    }

    try {
      setPhase('warmup')
      await measureDownloadStream(2000, 1, signal, () => {})
      if (signal.aborted) return

      setPhase('ping')
      const ping = await measurePing(signal)
      if (signal.aborted) return
      setCurrent(c => ({ ...c, ping: +ping.toFixed(0) }))

      setPhase('download')
      const download = await measureDownloadStream(8000, 4, signal, onDl)
      if (signal.aborted) return
      setCurrent(c => ({ ...c, download: +download.toFixed(1) }))

      setPhase('upload')
      const upload = await measureUploadStream(8000, signal, onUl)
      if (signal.aborted) return
      setCurrent(c => ({ ...c, upload: +upload.toFixed(1) }))

      setHistory([{ timestamp: Date.now(), download: +download.toFixed(1), upload: +upload.toFixed(1), ping: +ping.toFixed(0) }])
      setPhase('complete')
    } catch {
      if (!signal.aborted) setPhase('idle')
    }
  }, [])

  const start = useCallback((mode: 'continuous' | 'max', limitMs?: number) => {
    if (durationTimerRef.current) { clearTimeout(durationTimerRef.current); durationTimerRef.current = null }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (mode === 'continuous') {
      if (limitMs) {
        durationTimerRef.current = setTimeout(() => {
          controller.abort()
          setPhase('complete')
        }, limitMs)
      }
      runContinuous(controller.signal)
    } else {
      runMax(controller.signal)
    }
  }, [runContinuous, runMax])

  useEffect(() => () => {
    abortRef.current?.abort()
    if (durationTimerRef.current) clearTimeout(durationTimerRef.current)
  }, [])

  const isRunning = phase !== 'idle' && phase !== 'complete'

  return { phase, current, dlSamples, ulSamples, history, start, stop, isRunning }
}
