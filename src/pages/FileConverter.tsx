import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileInput, Upload, ArrowRight, Download, X, Loader2 } from 'lucide-react'
import { InfoButton, InfoPanel } from '../components/tools/ToolUI'

const ACCENT = '#f97316'

// ── Runtime capability detection ───────────────────────────────────────────────

const AVIF_SUPPORTED = (() => {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    return c.toDataURL('image/avif').startsWith('data:image/avif')
  } catch { return false }
})()

// ── Format tables ──────────────────────────────────────────────────────────────

const IMG_OUT = [
  'image/png',
  'image/jpeg',
  'image/webp',
  ...(AVIF_SUPPORTED ? ['image/avif'] : []),
]

const CONVERSIONS: Record<string, string[]> = {
  'image/png':                 IMG_OUT.filter(m => m !== 'image/png'),
  'image/jpeg':                IMG_OUT.filter(m => m !== 'image/jpeg'),
  'image/webp':                IMG_OUT.filter(m => m !== 'image/webp'),
  'image/gif':                 IMG_OUT,
  'image/bmp':                 IMG_OUT,
  'image/svg+xml':             IMG_OUT,
  ...(AVIF_SUPPORTED ? { 'image/avif': IMG_OUT.filter(m => m !== 'image/avif') } : {}),
  'application/json':          ['text/csv', 'text/tab-separated-values'],
  'text/csv':                  ['application/json', 'text/tab-separated-values'],
  'text/tab-separated-values': ['text/csv', 'application/json'],
}

const MIME_LABEL: Record<string, string> = {
  'image/png':                 'PNG',
  'image/jpeg':                'JPEG',
  'image/webp':                'WebP',
  'image/gif':                 'GIF',
  'image/bmp':                 'BMP',
  'image/svg+xml':             'SVG',
  'image/avif':                'AVIF',
  'application/json':          'JSON',
  'text/csv':                  'CSV',
  'text/tab-separated-values': 'TSV',
}

const MIME_EXT: Record<string, string> = {
  'image/png':                 'png',
  'image/jpeg':                'jpg',
  'image/webp':                'webp',
  'image/avif':                'avif',
  'application/json':          'json',
  'text/csv':                  'csv',
  'text/tab-separated-values': 'tsv',
}

// ── Conversion logic ───────────────────────────────────────────────────────────

async function convertImage(file: File, targetMime: string, quality: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image()
      el.onload = () => res(el)
      el.onerror = () => rej(new Error('Failed to load image'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    if (targetMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0)
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas toBlob failed')), targetMime, quality / 100)
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Shared CSV row parser (handles quoted fields)
function parseQuotedRow(line: string): string[] {
  const vals: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' && !inQ) { inQ = true }
    else if (ch === '"' && inQ && line[i + 1] === '"') { cur += '"'; i++ }
    else if (ch === '"' && inQ) { inQ = false }
    else if (ch === ',' && !inQ) { vals.push(cur); cur = '' }
    else cur += ch
  }
  vals.push(cur)
  return vals
}

function normalizeLines(text: string): string[] {
  return text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
}

function jsonToCsv(text: string): string {
  const arr: Record<string, unknown>[] = (() => { const d = JSON.parse(text); return Array.isArray(d) ? d : [d] })()
  if (!arr.length) return ''
  const keys = [...new Set(arr.flatMap(o => Object.keys(o)))]
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...arr.map(o => keys.map(k => esc(o[k])).join(','))].join('\n')
}

function csvToJson(text: string): string {
  const lines = normalizeLines(text)
  if (lines.length < 2) return '[]'
  const headers = parseQuotedRow(lines[0])
  return JSON.stringify(
    lines.slice(1).map(line => Object.fromEntries(
      headers.map((h, i) => [h.trim(), parseQuotedRow(line)[i]?.trim() ?? ''])
    )),
    null, 2
  )
}

function jsonToTsv(text: string): string {
  const arr: Record<string, unknown>[] = (() => { const d = JSON.parse(text); return Array.isArray(d) ? d : [d] })()
  if (!arr.length) return ''
  const keys = [...new Set(arr.flatMap(o => Object.keys(o)))]
  const esc = (v: unknown) => String(v === null || v === undefined ? '' : v).replace(/\t/g, ' ').replace(/\n/g, ' ')
  return [keys.join('\t'), ...arr.map(o => keys.map(k => esc(o[k])).join('\t'))].join('\n')
}

function tsvToJson(text: string): string {
  const lines = normalizeLines(text)
  if (lines.length < 2) return '[]'
  const headers = lines[0].split('\t')
  return JSON.stringify(
    lines.slice(1).map(line => {
      const vals = line.split('\t')
      return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim() ?? '']))
    }),
    null, 2
  )
}

function csvToTsv(text: string): string {
  return normalizeLines(text)
    .map(line => parseQuotedRow(line).map(v => v.replace(/\t/g, ' ')).join('\t'))
    .join('\n')
}

function tsvToCsv(text: string): string {
  const escCsv = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
  return normalizeLines(text)
    .map(line => line.split('\t').map(v => escCsv(v.trim())).join(','))
    .join('\n')
}

async function convertFile(file: File, srcMime: string, tgtMime: string, quality: number): Promise<Blob> {
  if (srcMime.startsWith('image/')) return convertImage(file, tgtMime, quality)
  const text = await file.text()
  const key = `${srcMime}→${tgtMime}`
  const fns: Record<string, () => string> = {
    'application/json→text/csv':                  () => jsonToCsv(text),
    'application/json→text/tab-separated-values': () => jsonToTsv(text),
    'text/csv→application/json':                  () => csvToJson(text),
    'text/csv→text/tab-separated-values':         () => csvToTsv(text),
    'text/tab-separated-values→application/json': () => tsvToJson(text),
    'text/tab-separated-values→text/csv':         () => tsvToCsv(text),
  }
  const fn = fns[key]
  if (!fn) throw new Error('Unsupported conversion')
  return new Blob([fn()], { type: tgtMime })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}

function stemOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function detectMime(file: File): string {
  if (file.type && CONVERSIONS[file.type]) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const byExt: Record<string, string> = {
    csv: 'text/csv', json: 'application/json', tsv: 'text/tab-separated-values',
    svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif',
  }
  return (ext && byExt[ext]) ? byExt[ext] : file.type
}

// ── State ──────────────────────────────────────────────────────────────────────

type ConvState =
  | { kind: 'idle' }
  | { kind: 'selected';   file: File; mime: string; targetMime: string; quality: number }
  | { kind: 'converting'; file: File; mime: string; targetMime: string; quality: number }
  | { kind: 'done';       file: File; mime: string; blob: Blob; targetMime: string }
  | { kind: 'error';      file: File; mime: string; message: string }

// ── Component ──────────────────────────────────────────────────────────────────

export function FileConverter() {
  const { t } = useTranslation()
  const [showInfo, setShowInfo] = useState(false)
  const infoId = useId()
  const [conv, setConv] = useState<ConvState>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [estSize, setEstSize] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasCache = useRef<{ file: File; canvas: HTMLCanvasElement } | null>(null)
  const estTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Derived values for effects
  const isSelected = conv.kind === 'selected'
  const selFile    = isSelected ? conv.file : null
  const selMime    = isSelected ? conv.mime : ''
  const selTarget  = (conv.kind === 'selected' || conv.kind === 'converting' || conv.kind === 'done') ? conv.targetMime : ''
  const selQuality = (conv.kind === 'selected' || conv.kind === 'converting') ? conv.quality : 92
  const isImgSelected = isSelected && selMime.startsWith('image/')

  const needsQuality = selTarget === 'image/jpeg' || selTarget === 'image/webp' || selTarget === 'image/avif'
  const isImgTarget  = selTarget.startsWith('image/')

  // Cleanup download URL on unmount
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl) }, [downloadUrl])
  // Cleanup estimate timer on unmount
  useEffect(() => () => clearTimeout(estTimer.current), [])

  // Schedule canvas.toBlob estimate (debounced)
  const triggerEstimate = useCallback((canvas: HTMLCanvasElement, mime: string, quality: number) => {
    clearTimeout(estTimer.current)
    estTimer.current = setTimeout(() => {
      const q = (mime === 'image/jpeg' || mime === 'image/webp' || mime === 'image/avif') ? quality / 100 : undefined
      canvas.toBlob(b => { if (b) setEstSize(b.size) }, mime, q)
    }, 200)
  }, [])

  // Load image to canvas when file changes
  useEffect(() => {
    if (!isImgSelected || !selFile) { setEstSize(null); return }
    if (canvasCache.current?.file === selFile) {
      triggerEstimate(canvasCache.current.canvas, selTarget, selQuality)
      return
    }
    let cancelled = false
    const url = URL.createObjectURL(selFile)
    const img = new Image()
    img.onload = () => {
      if (cancelled) { URL.revokeObjectURL(url); return }
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvasCache.current = { file: selFile, canvas }
      if (!cancelled) triggerEstimate(canvas, selTarget, selQuality)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selFile, isImgSelected])

  // Re-estimate when quality or target format changes
  useEffect(() => {
    if (!isImgSelected || !selFile) return
    if (canvasCache.current?.file !== selFile) return
    triggerEstimate(canvasCache.current.canvas, selTarget, selQuality)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selQuality, selTarget])

  const handleFile = useCallback((file: File) => {
    const mime = detectMime(file)
    const targets = CONVERSIONS[mime]
    if (!targets) {
      setConv({ kind: 'error', file, mime, message: t('fileConverter.unsupported') })
      return
    }
    setEstSize(null)
    setConv({ kind: 'selected', file, mime, targetMime: targets[0], quality: 92 })
  }, [t])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); setHovering(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handleConvert = useCallback(async () => {
    if (conv.kind !== 'selected') return
    const { file, mime, targetMime, quality } = conv
    setConv({ kind: 'converting', file, mime, targetMime, quality })
    try {
      const blob = await convertFile(file, mime, targetMime, quality)
      const url = URL.createObjectURL(blob)
      setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      setConv({ kind: 'done', file, mime, blob, targetMime })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Conversion failed'
      setConv(s => ({ kind: 'error', file: s.kind !== 'idle' ? s.file : file, mime: s.kind !== 'idle' ? s.mime : mime, message }))
    }
  }, [conv])

  const handleDownload = useCallback(() => {
    if (conv.kind !== 'done' || !downloadUrl) return
    const ext = MIME_EXT[conv.targetMime] ?? 'bin'
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${stemOf(conv.file.name)}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [conv, downloadUrl])

  const reset = useCallback(() => {
    canvasCache.current = null
    setEstSize(null)
    setConv({ kind: 'idle' })
    setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [])

  const file      = conv.kind !== 'idle' ? conv.file : null
  const mime      = conv.kind !== 'idle' ? conv.mime : ''
  const targets   = CONVERSIONS[mime] ?? []
  const targetMime = (conv.kind === 'selected' || conv.kind === 'converting' || conv.kind === 'done') ? conv.targetMime : ''
  const quality   = (conv.kind === 'selected' || conv.kind === 'converting') ? conv.quality : 92

  return (
    <div className="page-container page-container-medium space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <FileInput size={20} style={{ color: 'var(--text-subtle)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="fs-xl font-display font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {t('fileConverter.title')}
          </h1>
          <InfoButton show={showInfo} onToggle={() => setShowInfo(v => !v)} color={ACCENT} controls={infoId} />
          <p className="fs-sm mt-0.5 prose-measure" style={{ color: 'var(--text-subtle)' }}>
            Images · JSON · CSV · TSV{AVIF_SUPPORTED ? ' · AVIF' : ''} · browser-only, no uploads
          </p>
        </div>
      </div>

      {showInfo && (
        <InfoPanel
          id={infoId}
          input={t('tools.fileConverter.info.input')}
          process={t('tools.fileConverter.info.process')}
          output={t('tools.fileConverter.info.output')}
          color={ACCENT}
        />
      )}

      {/* Drop zone */}
      {conv.kind === 'idle' && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed p-14 flex flex-col items-center gap-4 cursor-pointer select-none"
          style={{
            borderColor: dragging ? '#f97316' : hovering ? 'rgba(249,115,22,0.55)' : 'var(--border)',
            background:  dragging ? 'rgba(249,115,22,0.06)' : hovering ? 'rgba(249,115,22,0.03)' : 'var(--surface)',
            transition: 'border-color 0.18s ease, background 0.18s ease',
          }}
        >
          <div className="p-4 rounded-full"
            style={{
              background: dragging ? 'rgba(249,115,22,0.18)' : hovering ? 'rgba(249,115,22,0.10)' : 'var(--surface-card)',
              transition: 'background 0.18s ease, transform 0.18s ease',
              transform: (dragging || hovering) ? 'scale(1.08)' : 'scale(1)',
            }}>
            <Upload size={28}
              style={{
                color: dragging ? '#f97316' : hovering ? 'rgba(249,115,22,0.75)' : 'var(--text-subtle)',
                transition: 'color 0.18s ease',
              }} />
          </div>
          <div className="text-center">
            <p className="fs-sm font-medium"
              style={{
                color: (dragging || hovering) ? 'var(--text)' : 'var(--text-muted)',
                transition: 'color 0.18s ease',
              }}>
              {t('fileConverter.dropzone')}
            </p>
            <p className="fs-xs mt-1.5" style={{ color: 'var(--text-subtle)' }}>
              {t('fileConverter.dropzoneFormats')}
              {AVIF_SUPPORTED ? ' · AVIF' : ''}
            </p>
          </div>
        </div>
      )}

      {/* File card */}
      {file && conv.kind !== 'idle' && (
        <div className="rounded-2xl border p-5 space-y-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

          {/* File info */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(249,115,22,0.12)' }}>
                <FileInput size={16} style={{ color: '#f97316' }} />
              </div>
              <div className="min-w-0">
                <p className="fs-sm font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</p>
                <p className="fs-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
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

          {/* Format selector */}
          {(conv.kind === 'selected' || conv.kind === 'done') && targets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Source badge */}
                <div className="px-3 py-1.5 rounded-lg fs-sm font-semibold"
                  style={{
                    background: 'var(--surface-card)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}>
                  {MIME_LABEL[mime]}
                </div>

                <ArrowRight size={14} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />

                {/* Target tabs */}
                <div className="flex gap-1 p-1 rounded-xl border"
                  style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                  {targets.map(tm => (
                    <button key={tm}
                      disabled={conv.kind === 'done'}
                      onClick={() => setConv(s => s.kind === 'selected' ? { ...s, targetMime: tm } : s)}
                      className="px-3 py-1 rounded-lg fs-sm font-medium transition-all duration-150 disabled:cursor-default"
                      style={{
                        background: targetMime === tm ? '#f97316' : 'transparent',
                        color:      targetMime === tm ? '#ffffff' : 'var(--text-subtle)',
                      }}>
                      {MIME_LABEL[tm]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated size for image-to-image (no quality slider) */}
              {conv.kind === 'selected' && isImgTarget && !needsQuality && estSize !== null && (
                <p className="fs-xs tabular-nums pl-1" style={{ color: 'var(--text-subtle)' }}>
                  Estimated output: ~{fmtBytes(estSize)}
                </p>
              )}
            </div>
          )}

          {/* Quality slider */}
          {conv.kind === 'selected' && needsQuality && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                  {t('fileConverter.quality')}
                </span>
                <div className="flex items-center gap-3">
                  {estSize !== null && (
                    <span className="fs-xs tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                      ~{fmtBytes(estSize)}
                    </span>
                  )}
                  <span className="fs-xs font-mono font-semibold w-9 text-right" style={{ color: '#f97316' }}>
                    {quality}%
                  </span>
                </div>
              </div>
              <input
                type="range" min={10} max={100} value={quality}
                onChange={e => setConv(s => s.kind === 'selected' ? { ...s, quality: Number(e.target.value) } : s)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#f97316' }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {conv.kind === 'selected' && (
              <button onClick={handleConvert}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white fs-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#f97316' }}>
                <ArrowRight size={14} />
                {t('fileConverter.convert')}
              </button>
            )}

            {conv.kind === 'converting' && (
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white fs-sm font-semibold"
                style={{ background: '#f97316', opacity: 0.85 }}>
                <Loader2 size={14} className="animate-spin" />
                {t('fileConverter.converting')}
              </div>
            )}

            {conv.kind === 'done' && (
              <>
                <button onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white fs-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: '#22c55e' }}>
                  <Download size={14} />
                  {t('fileConverter.download')}
                </button>
                <div className="fs-xs tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                  {fmtBytes(conv.blob.size)}
                  {conv.blob.size < file.size && (
                    <span className="ml-2 font-semibold" style={{ color: '#22c55e' }}>
                      −{Math.round((1 - conv.blob.size / file.size) * 100)}%
                    </span>
                  )}
                  {conv.blob.size > file.size && (
                    <span className="ml-2 font-semibold" style={{ color: 'var(--text-subtle)' }}>
                      +{Math.round((conv.blob.size / file.size - 1) * 100)}%
                    </span>
                  )}
                </div>
              </>
            )}

            {conv.kind === 'error' && (
              <p className="fs-sm" style={{ color: '#ef4444' }}>⚠ {conv.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Convert another nudge */}
      {(conv.kind === 'done' || conv.kind === 'error') && (
        <button onClick={reset}
          className="w-full py-3 rounded-xl border fs-sm font-medium transition-opacity hover:opacity-70"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-subtle)',
            background: 'var(--surface)',
          }}>
          + {t('fileConverter.clear')}
        </button>
      )}

      <input ref={inputRef} type="file"
        accept="image/*,.json,.csv,.tsv,application/json,text/csv,text/tab-separated-values"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
