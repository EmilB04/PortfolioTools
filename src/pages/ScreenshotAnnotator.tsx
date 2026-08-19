import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Crop, MoveUpRight, Square, Droplet, Type, Hash,
  Copy, Check, Download, Undo2, Trash2, ScanText, ImageDown, ClipboardPaste, X,
} from 'lucide-react'
import type { Rect, Shape, ToolId } from '../lib/screenshotAnnotator/types'
import { newId, normalizeRect } from '../lib/screenshotAnnotator/types'
import { drawCropOverlay, drawShape, renderScene } from '../lib/screenshotAnnotator/render'
import { suggestAlt } from '../lib/screenshotAnnotator/ocr'
import { InfoButton, InfoPanel } from '../components/tools/ToolUI'

// ── Constants ────────────────────────────────────────────────────────────────────

const ACCENT = '#f59e0b'
const DANGER = '#ef4444'
const SUCCESS = '#10b981'

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff', '#111827']

const TOOLS: { id: ToolId; icon: typeof Crop; hint: 'drag' | 'click' }[] = [
  { id: 'crop',  icon: Crop,        hint: 'drag'  },
  { id: 'arrow', icon: MoveUpRight, hint: 'drag'  },
  { id: 'box',   icon: Square,      hint: 'drag'  },
  { id: 'blur',  icon: Droplet,     hint: 'drag'  },
  { id: 'text',  icon: Type,        hint: 'click' },
  { id: 'pin',   icon: Hash,        hint: 'click' },
]

/** Redaction coarseness. Higher = larger mosaic blocks = less recoverable. */
const BLUR_STRENGTHS = [
  { key: 'light',  divisor: 90 },
  { key: 'medium', divisor: 50 },
  { key: 'heavy',  divisor: 24 },
] as const

const DATA_URI_WARN_BYTES = 500_000

interface Snapshot { crop: Rect; shapes: Shape[] }
interface Drag { x1: number; y1: number; x2: number; y2: number }

// ── Helpers ──────────────────────────────────────────────────────────────────────

/** Shapes are stored relative to the crop origin, so a re-crop must move them. */
function shiftShapes(shapes: Shape[], dx: number, dy: number): Shape[] {
  return shapes.map(s => {
    switch (s.type) {
      case 'arrow': return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
      case 'box':
      case 'blur': return { ...s, x: s.x + dx, y: s.y + dy }
      default:     return { ...s, x: s.x + dx, y: s.y + dy }
    }
  })
}

/** Keep step markers reading 1..n after a delete or undo. */
function renumberPins(shapes: Shape[]): Shape[] {
  let n = 0
  return shapes.map(s => (s.type === 'pin' ? { ...s, n: ++n } : s))
}

function escapeAlt(alt: string) {
  return alt.replace(/[[\]]/g, '\\$&').replace(/\s+/g, ' ').trim()
}

// ── Component ──────────────────────────────────────────────────────────────────────

export function ScreenshotAnnotator() {
  const { t } = useTranslation()

  const [img, setImg]       = useState<HTMLImageElement | null>(null)
  const [crop, setCrop]     = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const [shapes, setShapes] = useState<Shape[]>([])
  const [history, setHistory] = useState<Snapshot[]>([])

  const [tool, setTool]     = useState<ToolId>('arrow')
  const [color, setColor]   = useState(COLORS[0])
  const [strength, setStrength] = useState(1)
  const [label, setLabel]   = useState('')

  const [drag, setDrag]     = useState<Drag | null>(null)
  const [alt, setAlt]       = useState('')
  const [filename, setFilename] = useState('screenshot.png')
  const [dataUri, setDataUri]   = useState(false)
  const [encoded, setEncoded]   = useState('')

  const [ocrBusy, setOcrBusy]   = useState(false)
  const [ocrPct, setOcrPct]     = useState(0)
  const [copied, setCopied]     = useState<'image' | 'md' | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const infoId = useId()
  const [dropActive, setDropActive] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  // Stroke weights scale with the screenshot so a 4K grab isn't annotated with
  // hairlines, and a small thumbnail isn't drowned in ink.
  const scaleUnit = useMemo(
    () => (crop.w ? Math.max(1, Math.min(crop.w, crop.h) / 120) : 1),
    [crop.w, crop.h],
  )
  const strokeWidth = Math.round(scaleUnit * 2.2)
  const textSize    = Math.round(scaleUnit * 9)
  const pinRadius   = Math.round(scaleUnit * 7)
  const blurCell    = Math.max(4, Math.round(Math.min(crop.w, crop.h) / BLUR_STRENGTHS[strength].divisor))

  const activeTool = TOOLS.find(x => x.id === tool)!

  // ── Loading ──────────────────────────────────────────────────────────────────

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t('screenshotAnnotator.errNotImage'))
      return
    }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      setImg(image)
      setCrop({ x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight })
      setShapes([])
      setHistory([])
      setAlt('')
      setError(null)
      if (file.name) setFilename(file.name.replace(/\.[^.]+$/, '') + '.png')
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      setError(t('screenshotAnnotator.errDecode'))
    }
    image.src = url
  }, [t])

  // Paste is the primary entry point — Print Screen straight into the tool.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) {
        e.preventDefault()
        loadFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  // ── History ──────────────────────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    setHistory(h => [...h.slice(-49), { crop, shapes }])
  }, [crop, shapes])

  const undo = useCallback(() => {
    setHistory(h => {
      const prev = h[h.length - 1]
      if (!prev) return h
      setCrop(prev.crop)
      setShapes(prev.shapes)
      return h.slice(0, -1)
    })
  }, [])

  const clearShapes = useCallback(() => {
    pushHistory()
    setShapes([])
  }, [pushHistory])

  const resetCrop = useCallback(() => {
    if (!img) return
    pushHistory()
    setShapes(s => shiftShapes(s, crop.x, crop.y))
    setCrop({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight })
  }, [img, crop.x, crop.y, pushHistory])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
      if (e.key === 'Escape') setDrag(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  // ── Canvas rendering ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return

    const ctx = renderScene(canvas, img, crop, shapes)
    if (!ctx || !drag) return

    // In-progress geometry is drawn on top and never enters `shapes` until commit.
    if (tool === 'crop') {
      drawCropOverlay(ctx, normalizeRect(drag.x1, drag.y1, drag.x2, drag.y2))
    } else if (tool === 'arrow') {
      drawShape(ctx, { id: 'preview', type: 'arrow', color, width: strokeWidth, ...drag })
    } else if (tool === 'box') {
      drawShape(ctx, { id: 'preview', type: 'box', color, width: strokeWidth, ...normalizeRect(drag.x1, drag.y1, drag.x2, drag.y2) })
    } else if (tool === 'blur') {
      drawShape(ctx, { id: 'preview', type: 'blur', color, cell: blurCell, ...normalizeRect(drag.x1, drag.y1, drag.x2, drag.y2) })
    }
  }, [img, crop, shapes, drag, tool, color, strokeWidth, blurCell])

  // ── Pointer interaction ──────────────────────────────────────────────────────

  const toImageCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const box = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / box.width) * canvas.width,
      y: ((e.clientY - box.top) / box.height) * canvas.height,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return
    const { x, y } = toImageCoords(e)

    if (activeTool.hint === 'click') {
      pushHistory()
      if (tool === 'text') {
        if (!label.trim()) {
          setError(t('screenshotAnnotator.errNoLabel'))
          return
        }
        setShapes(s => [...s, { id: newId(), type: 'text', x, y, text: label.trim(), color, size: textSize }])
      } else {
        setShapes(s => renumberPins([...s, { id: newId(), type: 'pin', x, y, n: 0, color, size: pinRadius }]))
      }
      setError(null)
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ x1: x, y1: y, x2: x, y2: y })
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag) return
    const { x, y } = toImageCoords(e)
    setDrag(d => (d ? { ...d, x2: x, y2: y } : d))
  }

  const onPointerUp = () => {
    if (!drag) return
    const r = normalizeRect(drag.x1, drag.y1, drag.x2, drag.y2)
    const dragged = Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1)
    setDrag(null)
    if (dragged < 4) return // stray click, not a shape

    pushHistory()
    if (tool === 'crop') {
      setCrop(c => ({ x: c.x + r.x, y: c.y + r.y, w: r.w, h: r.h }))
      setShapes(s => shiftShapes(s, -r.x, -r.y))
    } else if (tool === 'arrow') {
      setShapes(s => [...s, { id: newId(), type: 'arrow', color, width: strokeWidth, x1: drag.x1, y1: drag.y1, x2: drag.x2, y2: drag.y2 }])
    } else if (tool === 'box') {
      setShapes(s => [...s, { id: newId(), type: 'box', color, width: strokeWidth, ...r }])
    } else if (tool === 'blur') {
      setShapes(s => [...s, { id: newId(), type: 'blur', color, cell: blurCell, ...r }])
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  const toBlob = useCallback(
    () => new Promise<Blob | null>(resolve => canvasRef.current?.toBlob(resolve, 'image/png')),
    [],
  )

  const copyImage = useCallback(async () => {
    try {
      const blob = await toBlob()
      if (!blob) return
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied('image')
      setTimeout(() => setCopied(null), 1600)
    } catch {
      setError(t('screenshotAnnotator.errClipboard'))
    }
  }, [toBlob, t])

  const downloadPng = useCallback(async () => {
    const blob = await toBlob()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'screenshot.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [toBlob, filename])

  // Base64 is only generated in data-URI mode — it is expensive and usually unwanted.
  useEffect(() => {
    if (!dataUri || !img) {
      setEncoded('')
      return
    }
    const id = setTimeout(() => setEncoded(canvasRef.current?.toDataURL('image/png') ?? ''), 250)
    return () => clearTimeout(id)
  }, [dataUri, img, crop, shapes])

  const markdown = useMemo(() => {
    const target = dataUri ? (encoded || '…') : (filename || 'screenshot.png')
    return `![${escapeAlt(alt) || t('screenshotAnnotator.altFallback')}](${target})`
  }, [alt, filename, dataUri, encoded, t])

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied('md')
      setTimeout(() => setCopied(null), 1600)
    } catch {
      setError(t('screenshotAnnotator.errClipboard'))
    }
  }, [markdown, t])

  const runOcr = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setOcrBusy(true)
    setOcrPct(0)
    try {
      const suggestion = await suggestAlt(canvas, p => setOcrPct(Math.round(p * 100)))
      if (suggestion) setAlt(suggestion)
      else setError(t('screenshotAnnotator.errNoText'))
    } catch {
      setError(t('screenshotAnnotator.errOcr'))
    } finally {
      setOcrBusy(false)
    }
  }, [t])

  /** Discard the screenshot. Asks once first if there is annotation work to lose. */
  const removeImage = useCallback(() => {
    if (shapes.length && !confirmRemove) {
      setConfirmRemove(true)
      return
    }
    setImg(null)
    setShapes([])
    setHistory([])
    setAlt('')
    setDrag(null)
    setConfirmRemove(false)
    setError(null)
  }, [shapes.length, confirmRemove])

  // Drop the armed confirmation as soon as attention moves elsewhere.
  useEffect(() => {
    if (!confirmRemove) return
    const id = setTimeout(() => setConfirmRemove(false), 4000)
    return () => clearTimeout(id)
  }, [confirmRemove, shapes])

  const canCopyImage = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
  const encodedBytes = encoded.length * 0.75

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page-container page-container-wide space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <ImageDown size={20} style={{ color: 'var(--text-subtle)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="fs-xl font-display font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {t('screenshotAnnotator.title')}
          </h1>
          <InfoButton show={showInfo} onToggle={() => setShowInfo(v => !v)} color={ACCENT} controls={infoId} />
          <p className="fs-sm mt-0.5 prose-measure" style={{ color: 'var(--text-subtle)' }}>
            {t('screenshotAnnotator.subtitle')}
          </p>
        </div>
      </div>

      {showInfo && (
        <InfoPanel
          id={infoId}
          input={t('tools.screenshotAnnotator.info.input')}
          process={t('tools.screenshotAnnotator.info.process')}
          output={t('tools.screenshotAnnotator.info.output')}
          color={ACCENT}
        />
      )}

      {!img ? (
        /* Drop zone */
        <div
          onDragOver={e => { e.preventDefault(); setDropActive(true) }}
          onDragLeave={() => setDropActive(false)}
          onDrop={e => {
            e.preventDefault()
            setDropActive(false)
            const file = e.dataTransfer.files[0]
            if (file) loadFile(file)
          }}
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-20 px-6 cursor-pointer transition-colors"
          style={{
            background: 'var(--surface)',
            borderColor: dropActive ? ACCENT : 'var(--border)',
          }}
        >
          <ClipboardPaste size={36} style={{ color: ACCENT, opacity: 0.8 }} />
          <p className="fs-sm font-semibold" style={{ color: 'var(--text)' }}>
            {t('screenshotAnnotator.dropTitle')}
          </p>
          <p className="fs-xs text-center max-w-sm" style={{ color: 'var(--text-subtle)' }}>
            {t('screenshotAnnotator.dropHint')}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* Canvas + toolbar */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 p-1 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {TOOLS.map(({ id, icon: Icon }) => (
                  <button key={id} onClick={() => { setTool(id); setError(null) }}
                    title={t(`screenshotAnnotator.tool.${id}`)}
                    aria-label={t(`screenshotAnnotator.tool.${id}`)}
                    aria-pressed={tool === id}
                    className="px-2.5 py-2 rounded-lg transition-all duration-150"
                    style={{
                      background: tool === id ? ACCENT : 'transparent',
                      color: tool === id ? '#ffffff' : 'var(--text-subtle)',
                    }}>
                    <Icon size={16} />
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 items-center px-2 py-1.5 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    aria-label={c}
                    aria-pressed={color === c}
                    className="w-5 h-5 rounded-full transition-transform"
                    style={{
                      background: c,
                      border: '1px solid var(--border)',
                      outline: color === c ? `2px solid ${ACCENT}` : 'none',
                      outlineOffset: 2,
                      transform: color === c ? 'scale(1.1)' : 'none',
                    }} />
                ))}
              </div>

              <button onClick={undo} disabled={!history.length}
                title={t('screenshotAnnotator.undo')}
                className="px-2.5 py-2 rounded-xl border transition-opacity hover:opacity-70 disabled:opacity-35 disabled:cursor-not-allowed"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <Undo2 size={16} />
              </button>
              <button onClick={clearShapes} disabled={!shapes.length}
                title={t('screenshotAnnotator.clear')}
                className="px-2.5 py-2 rounded-xl border transition-opacity hover:opacity-70 disabled:opacity-35 disabled:cursor-not-allowed"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <Trash2 size={16} />
              </button>
            </div>

            {/* Tool-specific controls. The row keeps a fixed height across every
                tool so switching tools never shifts the canvas under the cursor. */}
            <div className="h-10 flex items-center">
              {tool === 'text' && (
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={t('screenshotAnnotator.labelPlaceholder')}
                  aria-label={t('screenshotAnnotator.labelPlaceholder')}
                  className="w-full rounded-xl border px-3 py-2 fs-sm outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              )}
              {tool === 'blur' && (
                <div className="flex gap-1 p-1 rounded-xl border w-fit"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  {BLUR_STRENGTHS.map((s, i) => (
                    <button key={s.key} onClick={() => setStrength(i)}
                      className="px-3 py-1.5 rounded-lg fs-xs font-medium transition-all duration-150"
                      style={{
                        background: strength === i ? ACCENT : 'transparent',
                        color: strength === i ? '#ffffff' : 'var(--text-subtle)',
                      }}>
                      {t(`screenshotAnnotator.blur.${s.key}`)}
                    </button>
                  ))}
                </div>
              )}
              {tool === 'crop' && (
                <button onClick={resetCrop}
                  className="fs-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-70"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {t('screenshotAnnotator.resetCrop')}
                </button>
              )}
            </div>

            <div className="rounded-2xl border p-3 overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDrag(null)}
                className="max-w-full h-auto rounded-lg touch-none block mx-auto"
                style={{ cursor: activeTool.hint === 'click' ? 'copy' : 'crosshair' }}
              />
            </div>

            <p className="fs-xs" style={{ color: 'var(--text-subtle)' }}>
              {t(`screenshotAnnotator.hint.${tool}`)} · {Math.round(crop.w)}×{Math.round(crop.h)}px
            </p>
          </div>

          {/* Output panel */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="fs-xs font-medium flex items-center justify-between" style={{ color: 'var(--text-subtle)' }}>
                {t('screenshotAnnotator.altLabel')}
                <button onClick={runOcr} disabled={ocrBusy}
                  className="inline-flex items-center gap-1 fs-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
                  style={{ color: ACCENT }}>
                  <ScanText size={12} />
                  {ocrBusy ? `${ocrPct}%` : t('screenshotAnnotator.ocrSuggest')}
                </button>
              </label>
              <input
                value={alt}
                onChange={e => setAlt(e.target.value)}
                placeholder={t('screenshotAnnotator.altPlaceholder')}
                aria-label={t('screenshotAnnotator.altLabel')}
                className="w-full rounded-xl border px-3 py-2 fs-sm outline-none"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <p className="fs-xs leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
                {ocrBusy ? t('screenshotAnnotator.ocrLoading') : t('screenshotAnnotator.ocrPrivacy')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                {t('screenshotAnnotator.filenameLabel')}
              </label>
              <input
                value={filename}
                onChange={e => setFilename(e.target.value)}
                disabled={dataUri}
                aria-label={t('screenshotAnnotator.filenameLabel')}
                className="w-full rounded-xl border px-3 py-2 fs-sm font-mono outline-none disabled:opacity-45"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <label className="flex items-center gap-2 fs-xs cursor-pointer" style={{ color: 'var(--text-subtle)' }}>
                <input type="checkbox" checked={dataUri} onChange={e => setDataUri(e.target.checked)}
                  style={{ accentColor: ACCENT }} />
                {t('screenshotAnnotator.embedLabel')}
              </label>
              {dataUri && encodedBytes > DATA_URI_WARN_BYTES && (
                <p className="fs-xs" style={{ color: '#f59e0b' }}>
                  ⚠ {t('screenshotAnnotator.embedWarn', { kb: Math.round(encodedBytes / 1024) })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                {t('screenshotAnnotator.markdownLabel')}
              </label>
              <pre className="rounded-xl border px-3 py-2 fs-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-28"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {dataUri && encoded
                  ? `![${escapeAlt(alt) || t('screenshotAnnotator.altFallback')}](data:image/png;base64,…)`
                  : markdown}
              </pre>
            </div>

            <div className="space-y-2">
              {canCopyImage && (
                <button onClick={copyImage}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white fs-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: ACCENT }}>
                  {copied === 'image'
                    ? <><Check size={14} /> {t('screenshotAnnotator.copied')}</>
                    : <><Copy size={14} /> {t('screenshotAnnotator.copyImage')}</>}
                </button>
              )}
              <button onClick={copyMarkdown}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl fs-sm font-semibold border transition-opacity hover:opacity-80"
                style={{ borderColor: ACCENT, color: ACCENT, background: 'transparent' }}>
                {copied === 'md'
                  ? <><Check size={14} /> {t('screenshotAnnotator.copied')}</>
                  : <><Copy size={14} /> {t('screenshotAnnotator.copyMarkdown')}</>}
              </button>
              <button onClick={downloadPng}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl fs-sm font-medium border transition-opacity hover:opacity-80"
                style={{
                  borderColor: 'rgba(16,185,129,0.45)',
                  color: SUCCESS,
                  background: 'rgba(16,185,129,0.08)',
                }}>
                <Download size={14} /> {t('screenshotAnnotator.downloadPng')}
              </button>
              {/* Idle reads as destructive; armed escalates to a solid fill. */}
              <button onClick={removeImage}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl fs-sm font-medium border transition-all duration-150 hover:opacity-80"
                style={{
                  borderColor: confirmRemove ? DANGER : 'rgba(239,68,68,0.45)',
                  color: confirmRemove ? '#ffffff' : DANGER,
                  background: confirmRemove ? DANGER : 'rgba(239,68,68,0.08)',
                }}>
                <X size={14} />
                {confirmRemove ? t('screenshotAnnotator.removeConfirm') : t('screenshotAnnotator.removeImage')}
              </button>
            </div>

            <p className="fs-xs leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
              {t('screenshotAnnotator.pasteTip')}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="fs-xs text-center" style={{ color: DANGER }}>⚠ {error}</p>
      )}
    </div>
  )
}
