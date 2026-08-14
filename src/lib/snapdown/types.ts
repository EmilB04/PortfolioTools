// Snapdown — annotation model.
//
// All geometry is stored in *source image pixel space* (after crop, with the
// crop rect's top-left as origin). The display canvas is scaled with CSS only,
// so exports are always full resolution.

export type ToolId = 'crop' | 'arrow' | 'box' | 'blur' | 'text' | 'pin'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface ShapeBase {
  id: string
  color: string
}

export interface ArrowShape extends ShapeBase {
  type: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
}

export interface BoxShape extends ShapeBase, Rect {
  type: 'box'
  width: number
}

/** Pixelated redaction. `cell` is the mosaic block size in source pixels. */
export interface BlurShape extends ShapeBase, Rect {
  type: 'blur'
  cell: number
}

export interface TextShape extends ShapeBase {
  type: 'text'
  x: number
  y: number
  text: string
  size: number
}

/** Numbered step marker. `n` is assigned on creation and renumbered on delete. */
export interface PinShape extends ShapeBase {
  type: 'pin'
  x: number
  y: number
  n: number
  size: number
}

export type Shape = ArrowShape | BoxShape | BlurShape | TextShape | PinShape

export const isRectShape = (s: Shape): s is BoxShape | BlurShape =>
  s.type === 'box' || s.type === 'blur'

/** Normalize a drag (which can go in any direction) into a positive-size rect. */
export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10)
