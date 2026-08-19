import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileArchive, Upload, Download, X, Loader2, Minimize2, Wand2 } from 'lucide-react'
import { InfoButton, InfoPanel } from '../components/tools/ToolUI'

const ACCENT = '#10b981'

// ── Runtime detection ──────────────────────────────────────────────────────────

const AVIF_SUPPORTED = (() => {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    return c.toDataURL('image/avif').startsWith('data:image/avif')
  } catch { return false }
})()

const GZIP_SUPPORTED = typeof CompressionStream !== 'undefined'

// ── Constants ──────────────────────────────────────────────────────────────────

const IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/gif', 'image/bmp', 'image/svg+xml',
  ...(AVIF_SUPPORTED ? ['image/avif'] : []),
])

const MIME_LABEL: Record<string, string> = {
  'image/jpeg':    'JPEG',
  'image/png':     'PNG',
  'image/webp':    'WebP',
  'image/gif':     'GIF',
  'image/bmp':     'BMP',
  'image/svg+xml': 'SVG',
  'image/avif':    'AVIF',
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/png':  'png',
}

// ── Compression ────────────────────────────────────────────────────────────────

async function compressImage(file: File, outputMime: string, quality: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image()
      el.onload = () => res(el)
      el.onerror = () => rej(new Error('Failed to load image'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    if (outputMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0)
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas toBlob failed')), outputMime, quality / 100)
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function gzipFile(file: File): Promise<Blob> {
  const stream = file.stream().pipeThrough(new CompressionStream('gzip'))
  const buf = await new Response(stream).arrayBuffer()
  return new Blob([buf], { type: 'application/gzip' })
}

// ── Auto-compress ──────────────────────────────────────────────────────────────
// Picks the best format (WebP/AVIF) then binary-searches for the highest quality
// that still achieves the target size reduction.

async function autoCompress(
  canvas: HTMLCanvasElement,
  originalSize: number,
  targetRatio = 0.72, // aim for ≤ this fraction of original
): Promise<{ outputMime: string; quality: number; blob: Blob }> {
  const TARGET_RATIO = targetRatio

  // Prefer AVIF over WebP when available (typically 20-50% smaller)
  // Skip JPEG in auto — it doesn't preserve transparency
  const candidateFmts = AVIF_SUPPORTED
    ? ['image/avif', 'image/webp']
    : ['image/webp']

  const toBlob = (mime: string, q: number): Promise<Blob> =>
    new Promise((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob null')), mime, q)
    )

  // Pick best format at reference quality 0.8
  const comparisons = await Promise.all(
    candidateFmts.map(async fmt => ({ fmt, size: (await toBlob(fmt, 0.8)).size }))
  )
  const bestFmt = comparisons.reduce((a, b) => a.size < b.size ? a : b).fmt

  // Binary search: find highest quality Q where blob.size ≤ TARGET_RATIO * original
  // As quality increases, blob.size increases, so binary search is valid.
  let lo = 20, hi = 90, chosenQ = -1, chosenBlob: Blob | null = null
  for (let i = 0; i < 7; i++) {
    const mid = Math.round((lo + hi) / 2)
    const blob = await toBlob(bestFmt, mid / 100)
    if (blob.size <= originalSize * TARGET_RATIO) {
      chosenQ = mid; chosenBlob = blob
      lo = mid + 1 // acceptable — try higher quality
    } else {
      hi = mid - 1 // too large — try lower quality
    }
    if (lo > hi) break
  }

  if (!chosenBlob) {
    // Target unachievable (already tiny or very complex image) — use q75 as best effort
    chosenQ = 75
    chosenBlob = await toBlob(bestFmt, 0.75)
  }

  return { outputMime: bestFmt, quality: chosenQ, blob: chosenBlob }
}

// ── Canvas loader ──────────────────────────────────────────────────────────────

async function loadToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image()
      el.onload = () => res(el)
      el.onerror = () => rej(new Error('Failed to load'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b < 1024)    return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}

function stemOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function detectMime(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
    svg: 'image/svg+xml', avif: 'image/avif',
  }
  return (ext && map[ext]) ? map[ext] : (file.type || 'application/octet-stream')
}

// Compress keeps the original format. Formats the canvas can't re-encode
// (gif/bmp/svg) fall back to WebP since canvas.toBlob can't emit them.
const CANVAS_ENCODABLE = new Set(['image/jpeg', 'image/webp', 'image/avif', 'image/png'])

function compressOutputMime(inputMime: string): string {
  if (inputMime === 'image/avif' && !AVIF_SUPPORTED) return 'image/webp'
  return CANVAS_ENCODABLE.has(inputMime) ? inputMime : 'image/webp'
}

// ── State ──────────────────────────────────────────────────────────────────────

type CompressState =
  | { kind: 'idle' }
  | { kind: 'ready';       file: File; mime: string; outputMime: string; quality: number }
  | { kind: 'compressing'; file: File; mime: string; outputMime: string; quality: number }
  | { kind: 'done';        file: File; mime: string; blob: Blob; outputMime: string }
  | { kind: 'error';       file: File; mime: string; message: string }

// ── SizeBar ────────────────────────────────────────────────────────────────────

function SizeBar({ original, result }: { original: number; result: number }) {
  const { t } = useTranslation()
  const ratio     = result / original
  const isSmaller = result < original
  const savedPct  = isSmaller ? Math.round((1 - ratio) * 100) : 0
  const grewPct   = ratio > 1  ? Math.round((ratio - 1) * 100) : 0

  return (
    <div className="rounded-xl border p-4 space-y-2.5"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
      {([
        { kind: 'original', label: t('fileCompress.original'), size: original, widthPct: 100,                        accent: false },
        { kind: 'output',   label: t('fileCompress.output'),   size: result,   widthPct: Math.min(100, ratio * 100), accent: isSmaller },
      ] as const).map(({ kind, label, size, widthPct, accent }) => (
        <div key={kind} className="flex items-center gap-3">
          <span className="text-xs w-14 text-right shrink-0" style={{ color: 'var(--text-subtle)' }}>
            {label}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${widthPct}%`,
                background: accent ? '#10b981' : ratio > 1 && kind === 'output' ? '#f59e0b' : 'var(--text-subtle)',
              }}
            />
          </div>
          <span className="text-xs w-16 tabular-nums text-right shrink-0 font-medium"
            style={{ color: accent ? '#10b981' : 'var(--text-muted)' }}>
            {fmtBytes(size)}
          </span>
        </div>
      ))}
      <div className="text-center pt-0.5">
        {isSmaller ? (
          <span className="text-sm font-semibold" style={{ color: '#10b981' }}>
            {t('fileCompress.saved', { size: fmtBytes(original - result), pct: savedPct })}
          </span>
        ) : grewPct > 0 ? (
          <span className="text-sm" style={{ color: '#f59e0b' }}>
            {t('fileCompress.grewPct', { pct: grewPct })}
          </span>
        ) : (
          <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>{t('fileCompress.noSizeChange')}</span>
        )}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function FileCompress() {
  const { t } = useTranslation()
  const [showInfo, setShowInfo] = useState(false)
  const infoId = useId()
  const [state, setState]             = useState<CompressState>({ kind: 'idle' })
  const [dragging, setDragging]       = useState(false)
  const [hovering, setHovering]       = useState(false)
  const [autoRunning, setAutoRunning] = useState(false)
  const [targetPct, setTargetPct]     = useState(60) // Auto target: % of original size
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [estSize, setEstSize]         = useState<number | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const canvasCache = useRef<{ file: File; canvas: HTMLCanvasElement } | null>(null)
  const estTimer    = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Derived
  const mime       = state.kind !== 'idle' ? state.mime : ''
  const file       = state.kind !== 'idle' ? state.file : null
  const isImage    = IMAGE_MIMES.has(mime)
  const outputMime = (state.kind === 'ready' || state.kind === 'compressing' || state.kind === 'done')
    ? state.outputMime : ''
  const quality    = (state.kind === 'ready' || state.kind === 'compressing') ? state.quality : 80
  const needsQuality = isImage && (outputMime === 'image/jpeg' || outputMime === 'image/webp' || outputMime === 'image/avif')
  const isPngOut   = outputMime === 'image/png'

  // Refs for effects
  const isReady       = state.kind === 'ready'
  const selFile       = isReady ? state.file : null
  const selOutputMime = isReady ? state.outputMime : ''
  const selQuality    = isReady ? state.quality : 80

  // Cleanup
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl) }, [downloadUrl])
  useEffect(() => () => clearTimeout(estTimer.current), [])

  const triggerEstimate = useCallback((canvas: HTMLCanvasElement, outMime: string, q: number) => {
    clearTimeout(estTimer.current)
    estTimer.current = setTimeout(() => {
      const qualParam = (outMime === 'image/jpeg' || outMime === 'image/webp' || outMime === 'image/avif')
        ? q / 100 : undefined
      canvas.toBlob(b => { if (b) setEstSize(b.size) }, outMime, qualParam)
    }, 200)
  }, [])

  // Load image to canvas when file changes
  useEffect(() => {
    if (!isReady || !selFile || !IMAGE_MIMES.has(selFile.type || '')) {
      setEstSize(null); return
    }
    if (canvasCache.current?.file === selFile) {
      triggerEstimate(canvasCache.current.canvas, selOutputMime, selQuality); return
    }
    let cancelled = false
    loadToCanvas(selFile).then(canvas => {
      if (cancelled) return
      canvasCache.current = { file: selFile, canvas }
      triggerEstimate(canvas, selOutputMime, selQuality)
    }).catch(() => {})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selFile])

  // Re-estimate when quality or output format changes
  useEffect(() => {
    if (!isReady || !selFile || canvasCache.current?.file !== selFile) return
    triggerEstimate(canvasCache.current!.canvas, selOutputMime, selQuality)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selQuality, selOutputMime])

  const handleFile = useCallback((f: File) => {
    const m = detectMime(f)
    const isImg = IMAGE_MIMES.has(m)
    setEstSize(null)
    setState({
      kind: 'ready', file: f, mime: m,
      outputMime: isImg ? compressOutputMime(m) : 'application/gzip',
      quality: 80,
    })
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); setHovering(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }, [handleFile])

  const handleCompress = useCallback(async () => {
    if (state.kind !== 'ready') return
    const { file: f, mime: m, outputMime: om, quality: q } = state
    setState({ kind: 'compressing', file: f, mime: m, outputMime: om, quality: q })
    try {
      const blob = IMAGE_MIMES.has(m) ? await compressImage(f, om, q) : await gzipFile(f)
      const url = URL.createObjectURL(blob)
      setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      setState({ kind: 'done', file: f, mime: m, blob, outputMime: om })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compression failed'
      setState(s => ({
        kind: 'error',
        file: s.kind !== 'idle' ? s.file : f,
        mime: s.kind !== 'idle' ? s.mime : m,
        message,
      }))
    }
  }, [state])

  const handleAuto = useCallback(async () => {
    if (state.kind !== 'ready' || !isImage) return
    setAutoRunning(true)
    try {
      // Ensure canvas is loaded
      let canvas: HTMLCanvasElement
      if (canvasCache.current?.file === state.file) {
        canvas = canvasCache.current.canvas
      } else {
        canvas = await loadToCanvas(state.file)
        canvasCache.current = { file: state.file, canvas }
      }
      const { outputMime: om, blob } = await autoCompress(canvas, state.file.size, targetPct / 100)
      const url = URL.createObjectURL(blob)
      setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      setEstSize(blob.size)
      setState({ kind: 'done', file: state.file, mime: state.mime, blob, outputMime: om })
    } catch {
      // Fail silently — user can still compress manually
    } finally {
      setAutoRunning(false)
    }
  }, [state, isImage, targetPct])

  const handleDownload = useCallback(() => {
    if (state.kind !== 'done' || !downloadUrl) return
    const { file: f, outputMime: om } = state
    const name = IMAGE_MIMES.has(om)
      ? `${stemOf(f.name)}.${MIME_EXT[om] ?? 'bin'}`
      : `${f.name}.gz`
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [state, downloadUrl])

  const reset = useCallback(() => {
    canvasCache.current = null
    setEstSize(null)
    setState({ kind: 'idle' })
    setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [])

  const active = dragging || hovering

  return (
    <div className="page-container page-container-medium space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <FileArchive size={20} style={{ color: 'var(--text-subtle)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {t('fileCompress.title')}
          </h1>
          <InfoButton show={showInfo} onToggle={() => setShowInfo(v => !v)} color={ACCENT} controls={infoId} />
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
            Images · Any file via Gzip · browser-only, no uploads
          </p>
        </div>
      </div>

      {showInfo && (
        <InfoPanel
          id={infoId}
          input={t('tools.fileCompress.info.input')}
          process={t('tools.fileCompress.info.process')}
          output={t('tools.fileCompress.info.output')}
          color={ACCENT}
        />
      )}

      {/* Drop zone */}
      {state.kind === 'idle' && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed p-14 flex flex-col items-center gap-4 cursor-pointer select-none"
          style={{
            borderColor: dragging ? '#10b981' : active ? 'rgba(16,185,129,0.55)' : 'var(--border)',
            background:  dragging ? 'rgba(16,185,129,0.06)' : active ? 'rgba(16,185,129,0.03)' : 'var(--surface)',
            transition: 'border-color 0.18s ease, background 0.18s ease',
          }}
        >
          <div className="p-4 rounded-full"
            style={{
              background: dragging ? 'rgba(16,185,129,0.18)' : active ? 'rgba(16,185,129,0.10)' : 'var(--surface-card)',
              transition: 'background 0.18s ease, transform 0.18s ease',
              transform: active ? 'scale(1.08)' : 'scale(1)',
            }}>
            <Upload size={28}
              style={{
                color: dragging ? '#10b981' : active ? 'rgba(16,185,129,0.75)' : 'var(--text-subtle)',
                transition: 'color 0.18s ease',
              }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium"
              style={{
                color: active ? 'var(--text)' : 'var(--text-muted)',
                transition: 'color 0.18s ease',
              }}>
              {t('fileCompress.dropzone')}
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-subtle)' }}>
              {t('fileCompress.dropzoneFormats')}
            </p>
          </div>
        </div>
      )}

      {/* File card */}
      {file && state.kind !== 'idle' && (
        <div className="rounded-2xl border p-5 space-y-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

          {/* File info */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <FileArchive size={16} style={{ color: '#10b981' }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                  {fmtBytes(file.size)} · {MIME_LABEL[mime] ?? mime}
                </p>
              </div>
            </div>
            <button onClick={reset}
              className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-subtle)' }}>
              <X size={14} />
            </button>
          </div>

          {/* Image controls */}
          {isImage && (state.kind === 'ready' || state.kind === 'done') && (
            <div className="space-y-4">
              {/* Quality slider */}
              {state.kind === 'ready' && needsQuality && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                      {t('fileCompress.quality')}
                    </span>
                    <div className="flex items-center gap-3">
                      {estSize !== null && (
                        <span className="text-xs tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                          ~{fmtBytes(estSize)}
                        </span>
                      )}
                      <span className="text-xs font-mono font-semibold w-9 text-right" style={{ color: '#10b981' }}>
                        {quality}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range" min={10} max={100} value={quality}
                    onChange={e => setState(s => s.kind === 'ready' ? { ...s, quality: Number(e.target.value) } : s)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: '#10b981' }}
                  />
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-subtle)' }}>
                    <span>{t('fileCompress.smallest')}</span>
                    <span>{t('fileCompress.bestQuality')}</span>
                  </div>
                </div>
              )}

              {/* PNG note */}
              {state.kind === 'ready' && isPngOut && (
                <p className="text-xs px-1" style={{ color: 'var(--text-subtle)' }}>
                  {t('fileCompress.pngNote')}
                </p>
              )}

              {/* Auto target slider */}
              {state.kind === 'ready' && (
                <div className="space-y-2 rounded-xl border p-3"
                  style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-subtle)' }}>
                      <Wand2 size={12} style={{ color: '#10b981' }} />
                      {t('fileCompress.autoTarget')}
                    </span>
                    <div className="flex items-center gap-3">
                      {file && (
                        <span className="text-xs tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                          ≤ {fmtBytes(Math.round(file.size * targetPct / 100))}
                        </span>
                      )}
                      <span className="text-xs font-mono font-semibold w-9 text-right" style={{ color: '#10b981' }}>
                        {targetPct}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range" min={20} max={95} value={targetPct}
                    onChange={e => setTargetPct(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: '#10b981' }}
                  />
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-subtle)' }}>
                    <span>{t('fileCompress.smaller')}</span>
                    <span>{t('fileCompress.largerBetter')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gzip badge (non-image) */}
          {!isImage && (state.kind === 'ready' || state.kind === 'done') && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }}>
              <span className="text-xs font-medium" style={{ color: '#10b981' }}>
                {GZIP_SUPPORTED ? t('fileCompress.gzipLabel') : t('fileCompress.gzipUnsupported')}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Manual compress + Auto (when ready and not auto-running) */}
            {state.kind === 'ready' && !autoRunning && (
              <>
                <button
                  onClick={handleCompress}
                  disabled={!isImage && !GZIP_SUPPORTED}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#10b981' }}>
                  <Minimize2 size={14} />
                  {t('fileCompress.compress')}
                </button>

                {isImage && (
                  <button
                    onClick={handleAuto}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-opacity hover:opacity-80"
                    style={{ borderColor: '#10b981', color: '#10b981', background: 'transparent' }}>
                    <Wand2 size={14} />
                    {t('fileCompress.auto')}
                  </button>
                )}
              </>
            )}

            {/* Manual compressing spinner */}
            {state.kind === 'compressing' && (
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#10b981', opacity: 0.85 }}>
                <Loader2 size={14} className="animate-spin" />
                {t('fileCompress.compressing')}
              </div>
            )}

            {/* Auto optimizing spinner */}
            {autoRunning && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: '#10b981', color: '#10b981', background: 'transparent' }}>
                <Loader2 size={14} className="animate-spin" />
                {t('fileCompress.autoRunning')}
              </div>
            )}

            {/* Download */}
            {state.kind === 'done' && (
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#10b981' }}>
                <Download size={14} />
                {t('fileCompress.download')}
              </button>
            )}

            {/* Error */}
            {state.kind === 'error' && (
              <p className="text-sm" style={{ color: '#ef4444' }}>⚠ {state.message}</p>
            )}
          </div>

          {/* Size comparison */}
          {state.kind === 'done' && (
            <SizeBar original={file.size} result={state.blob.size} />
          )}
        </div>
      )}

      {/* Compress another nudge */}
      {(state.kind === 'done' || state.kind === 'error') && (
        <button onClick={reset}
          className="w-full py-3 rounded-xl border text-sm font-medium transition-opacity hover:opacity-70"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-subtle)',
            background: 'var(--surface)',
          }}>
          + {t('fileCompress.clear')}
        </button>
      )}

      <input ref={inputRef} type="file" accept="*" className="hidden" onChange={onInputChange} />
    </div>
  )
}
