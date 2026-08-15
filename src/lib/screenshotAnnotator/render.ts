// Screenshot Annotator — canvas rendering.
//
// The canvas is always sized to the cropped source resolution, so what gets
// exported is exactly what gets drawn here. Shapes render in insertion order,
// which means a blur placed after an arrow also redacts that arrow — the
// intuitive result when you redact last.

import type { Rect, Shape } from './types'

const HEAD_RATIO = 3.5 // arrow head length, relative to stroke width
const MIN_HEAD = 10

/** Replace a region with a mosaic, sampling whatever is currently on the canvas. */
function pixelate(ctx: CanvasRenderingContext2D, r: Rect, cell: number) {
  const w = Math.round(r.w)
  const h = Math.round(r.h)
  if (w < 1 || h < 1) return

  const cols = Math.max(1, Math.round(w / cell))
  const rows = Math.max(1, Math.round(h / cell))

  const off = document.createElement('canvas')
  off.width = cols
  off.height = rows
  const octx = off.getContext('2d')
  if (!octx) return

  octx.imageSmoothingEnabled = false
  octx.drawImage(ctx.canvas, r.x, r.y, w, h, 0, 0, cols, rows)

  const prev = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(off, 0, 0, cols, rows, r.x, r.y, w, h)
  ctx.imageSmoothingEnabled = prev
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, width: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return

  const head = Math.max(MIN_HEAD, width * HEAD_RATIO)
  const angle = Math.atan2(dy, dx)
  // Stop the shaft short so the head's flat back doesn't poke through it.
  const shaftEnd = Math.max(0, len - head * 0.8)

  ctx.save()
  ctx.translate(x1, y1)
  ctx.rotate(angle)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(shaftEnd, 0)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(len, 0)
  ctx.lineTo(len - head, head * 0.45)
  ctx.lineTo(len - head, -head * 0.45)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** White halo behind foreground text/numbers so they stay legible on any screenshot. */
function haloText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  color: string, size: number,
) {
  ctx.save()
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(2, size * 0.18)
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  switch (s.type) {
    case 'blur':
      pixelate(ctx, s, s.cell)
      break

    case 'box':
      ctx.save()
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.lineJoin = 'round'
      ctx.strokeRect(s.x, s.y, s.w, s.h)
      ctx.restore()
      break

    case 'arrow':
      drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, s.color, s.width)
      break

    case 'text':
      if (s.text) haloText(ctx, s.text, s.x, s.y, s.color, s.size)
      break

    case 'pin': {
      const r = s.size
      ctx.save()
      ctx.beginPath()
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
      ctx.fillStyle = s.color
      ctx.fill()
      ctx.lineWidth = Math.max(2, r * 0.18)
      ctx.strokeStyle = 'rgba(255,255,255,0.92)'
      ctx.stroke()

      const label = String(s.n)
      ctx.font = `700 ${r * 1.15}px ui-sans-serif, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, s.x, s.y + r * 0.05)
      ctx.restore()
      break
    }
  }
}

/**
 * Draw the cropped source plus every committed shape. Sizes the canvas to the
 * crop, so callers get export-ready pixels with no extra scaling step.
 */
export function renderScene(
  canvas: HTMLCanvasElement,
  img: CanvasImageSource,
  crop: Rect,
  shapes: Shape[],
) {
  const w = Math.max(1, Math.round(crop.w))
  const h = Math.max(1, Math.round(crop.h))
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, crop.x, crop.y, w, h, 0, 0, w, h)
  for (const s of shapes) drawShape(ctx, s)
  return ctx
}

/** Dim everything outside the pending crop rect. Preview only — never exported. */
export function drawCropOverlay(ctx: CanvasRenderingContext2D, r: Rect | null) {
  const { width: w, height: h } = ctx.canvas
  ctx.save()
  ctx.fillStyle = 'rgba(15,15,20,0.55)'
  if (!r || r.w < 1 || r.h < 1) {
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillRect(0, 0, w, r.y)
    ctx.fillRect(0, r.y + r.h, w, h - (r.y + r.h))
    ctx.fillRect(0, r.y, r.x, r.h)
    ctx.fillRect(r.x + r.w, r.y, w - (r.x + r.w), r.h)

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = Math.max(1, w / 400)
    ctx.setLineDash([w / 60, w / 90])
    ctx.strokeRect(r.x, r.y, r.w, r.h)
  }
  ctx.restore()
}
