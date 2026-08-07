import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QrCode, Download, Copy, Check, RotateCcw } from 'lucide-react'
import QRCode from 'qrcode'

// ── Constants ────────────────────────────────────────────────────────────────────

type EcLevel = 'L' | 'M' | 'Q' | 'H'

const EC_LEVELS: { value: EcLevel; recovery: string }[] = [
  { value: 'L', recovery: '~7%' },
  { value: 'M', recovery: '~15%' },
  { value: 'Q', recovery: '~25%' },
  { value: 'H', recovery: '~30%' },
]

const SIZE_OPTIONS = [256, 512, 1024]

// White-on-fill needs a slightly deeper violet to clear AA.
const ACCENT_FILL = '#7c4ded'

const DEFAULTS = {
  fg: '#1c1025',
  bg: '#ffffff',
  ecLevel: 'M' as EcLevel,
  size: 512,
  margin: 2,
}

// ── Component ──────────────────────────────────────────────────────────────────────

export function QrGenerator() {
  const { t } = useTranslation()
  const [text, setText]       = useState('')
  const [fg, setFg]           = useState(DEFAULTS.fg)
  const [bg, setBg]           = useState(DEFAULTS.bg)
  const [ecLevel, setEcLevel] = useState<EcLevel>(DEFAULTS.ecLevel)
  const [size, setSize]       = useState<number>(DEFAULTS.size)
  const [margin, setMargin]   = useState(DEFAULTS.margin)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trimmed   = text.trim()
  const hasQr     = trimmed.length > 0

  const options = { errorCorrectionLevel: ecLevel, margin, color: { dark: fg, light: bg } }

  // Render preview to canvas whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!hasQr) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      setError(null)
      return
    }
    QRCode.toCanvas(canvas, trimmed, { ...options, width: 320 })
      .then(() => setError(null))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to render QR'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, fg, bg, ecLevel, margin, hasQr])

  const downloadPng = useCallback(async () => {
    if (!hasQr) return
    const url = await QRCode.toDataURL(trimmed, { ...options, width: size })
    const a = document.createElement('a')
    a.href = url
    a.download = 'qrcode.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, hasQr, fg, bg, ecLevel, margin, size])

  const downloadSvg = useCallback(async () => {
    if (!hasQr) return
    const svg = await QRCode.toString(trimmed, { ...options, type: 'svg', width: size })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qrcode.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, hasQr, fg, bg, ecLevel, margin, size])

  const copyPng = useCallback(async () => {
    if (!hasQr || !navigator.clipboard?.write) return
    try {
      const url = await QRCode.toDataURL(trimmed, { ...options, width: size })
      const blob = await (await fetch(url)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, hasQr, fg, bg, ecLevel, margin, size])

  const reset = useCallback(() => {
    setText(''); setFg(DEFAULTS.fg); setBg(DEFAULTS.bg)
    setEcLevel(DEFAULTS.ecLevel); setSize(DEFAULTS.size); setMargin(DEFAULTS.margin)
  }, [])

  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined'

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border"
          style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.35)' }}>
          <QrCode size={20} style={{ color: '#8b5cf6' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {t('qrGenerator.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
            {t('qrGenerator.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">

        {/* Controls */}
        <div className="space-y-5">
          {/* Text input */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
              {t('qrGenerator.contentLabel')}
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              aria-label={t('qrGenerator.contentLabel')}
              placeholder={t('qrGenerator.placeholder')}
              className="w-full rounded-xl border px-3 py-2.5 text-sm resize-y outline-none transition-colors"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Error correction */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
              {t('qrGenerator.errorCorrection')}
            </label>
            <div className="flex gap-1 p-1 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {EC_LEVELS.map(({ value, recovery }) => (
                <button key={value} onClick={() => setEcLevel(value)}
                  title={`${t('qrGenerator.recovery')} ${recovery}`}
                  className="flex-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: ecLevel === value ? ACCENT_FILL : 'transparent',
                    color: ecLevel === value ? '#ffffff' : 'var(--text-subtle)',
                  }}>
                  {value}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              {t('qrGenerator.ecHint')}
            </p>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: t('qrGenerator.foreground'), value: fg, set: setFg },
              { label: t('qrGenerator.background'), value: bg, set: setBg },
            ] as const).map(({ label, value, set }) => (
              <div key={label} className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>{label}</label>
                <div className="flex items-center gap-2 rounded-xl border px-2 py-1.5"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <input type="color" value={value} onChange={e => set(e.target.value)}
                    aria-label={label}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                  <span className="text-xs font-mono uppercase" style={{ color: 'var(--text-muted)' }}>{value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Size + margin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                {t('qrGenerator.exportSize')}
              </label>
              <div className="flex gap-1 p-1 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {SIZE_OPTIONS.map(s => (
                  <button key={s} onClick={() => setSize(s)}
                    className="flex-1 px-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{
                      background: size === s ? ACCENT_FILL : 'transparent',
                      color: size === s ? '#ffffff' : 'var(--text-subtle)',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium flex items-center justify-between" style={{ color: 'var(--text-subtle)' }}>
                <span>{t('qrGenerator.quietZone')}</span>
                <span className="font-mono" style={{ color: '#8b5cf6' }}>{margin}</span>
              </label>
              <input type="range" min={0} max={8} value={margin}
                onChange={e => setMargin(Number(e.target.value))}
                aria-label={t('qrGenerator.quietZone')}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer mt-2.5"
                style={{ accentColor: '#8b5cf6' }} />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center gap-4 md:w-[280px]">
          <div className="rounded-2xl border p-4 flex items-center justify-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', width: 280, height: 280 }}>
            {hasQr ? (
              <canvas ref={canvasRef} className="max-w-full max-h-full rounded-lg" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center px-4">
                <QrCode size={40} style={{ color: 'var(--text-subtle)', opacity: 0.4 }} />
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  {t('qrGenerator.emptyPreview')}
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-center" style={{ color: '#ef4444' }}>⚠ {error}</p>}

          {/* Actions */}
          <div className="w-full space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={downloadPng} disabled={!hasQr}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#8b5cf6' }}>
                <Download size={14} /> PNG
              </button>
              <button onClick={downloadSvg} disabled={!hasQr}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: '#8b5cf6', color: '#8b5cf6', background: 'transparent' }}>
                <Download size={14} /> SVG
              </button>
            </div>
            {canCopy && (
              <button onClick={copyPng} disabled={!hasQr}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface-card)' }}>
                {copied ? <><Check size={14} style={{ color: '#10b981' }} /> {t('qrGenerator.copied')}</> : <><Copy size={14} /> {t('qrGenerator.copyImage')}</>}
              </button>
            )}
            <button onClick={reset}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-subtle)' }}>
              <RotateCcw size={13} /> {t('qrGenerator.reset')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
