/**
 * A small, dependency-free JSONPath evaluator covering the subset people actually
 * type into a query box:
 *
 *   $.a.b            $['a']['b']        $.a[0]        $.items[*].name
 *   $..name          $.items[1:4]       $.items[-1]   $..book[*].price
 *
 * Filter expressions (`?(...)`) are intentionally unsupported: evaluating them
 * safely means writing an expression parser, and doing it unsafely means `eval`.
 */

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

type Segment =
  | { kind: 'child'; name: string }
  | { kind: 'index'; index: number }
  | { kind: 'slice'; from: number | null; to: number | null }
  | { kind: 'wildcard' }
  | { kind: 'descend' }

export class JsonPathError extends Error {
  constructor(public readonly code: 'root' | 'syntax' | 'filter') {
    super(code)
    this.name = 'JsonPathError'
  }
}

export function parseJsonPath(path: string): Segment[] {
  let i = 0
  const src = path.trim()
  if (!src.startsWith('$')) throw new JsonPathError('root')
  i = 1

  const segments: Segment[] = []

  while (i < src.length) {
    if (src[i] === '.') {
      if (src[i + 1] === '.') {
        segments.push({ kind: 'descend' })
        i += 2
        // `$..[0]` / `$..*` — the bracket or wildcard is handled by the next loop pass.
        if (src[i] === '[' || src[i] === undefined) continue
      } else {
        i += 1
      }
      if (src[i] === '*') { segments.push({ kind: 'wildcard' }); i += 1; continue }
      const start = i
      while (i < src.length && /[^.[\]]/.test(src[i])) i += 1
      if (i === start) throw new JsonPathError('syntax')
      segments.push({ kind: 'child', name: src.slice(start, i) })
      continue
    }

    if (src[i] === '[') {
      const end = src.indexOf(']', i)
      if (end === -1) throw new JsonPathError('syntax')
      const body = src.slice(i + 1, end).trim()
      i = end + 1

      if (body.startsWith('?')) throw new JsonPathError('filter')
      if (body === '*') { segments.push({ kind: 'wildcard' }); continue }

      const quoted = /^'([^']*)'$|^"([^"]*)"$/.exec(body)
      if (quoted) { segments.push({ kind: 'child', name: quoted[1] ?? quoted[2] }); continue }

      if (body.includes(':')) {
        const [rawFrom, rawTo] = body.split(':')
        const from = rawFrom.trim() === '' ? null : Number(rawFrom)
        const to = rawTo.trim() === '' ? null : Number(rawTo)
        if ((from !== null && !Number.isInteger(from)) || (to !== null && !Number.isInteger(to))) {
          throw new JsonPathError('syntax')
        }
        segments.push({ kind: 'slice', from, to })
        continue
      }

      const index = Number(body)
      if (!Number.isInteger(index)) throw new JsonPathError('syntax')
      segments.push({ kind: 'index', index })
      continue
    }

    throw new JsonPathError('syntax')
  }

  return segments
}

function isRecord(value: Json): value is { [key: string]: Json } {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function collectDescendants(value: Json, out: Json[]) {
  out.push(value)
  if (Array.isArray(value)) value.forEach(v => collectDescendants(v, out))
  else if (isRecord(value)) Object.values(value).forEach(v => collectDescendants(v, out))
}

function normaliseIndex(index: number, length: number): number {
  return index < 0 ? length + index : index
}

/** Returns every node matching `path`. An empty array means "no match", not an error. */
export function queryJsonPath(root: Json, path: string): Json[] {
  const segments = parseJsonPath(path)
  let current: Json[] = [root]

  for (const segment of segments) {
    const next: Json[] = []

    for (const node of current) {
      switch (segment.kind) {
        case 'child':
          if (isRecord(node) && segment.name in node) next.push(node[segment.name])
          break
        case 'index':
          if (Array.isArray(node)) {
            const idx = normaliseIndex(segment.index, node.length)
            if (idx >= 0 && idx < node.length) next.push(node[idx])
          }
          break
        case 'slice':
          if (Array.isArray(node)) {
            const from = segment.from === null ? 0 : normaliseIndex(segment.from, node.length)
            const to = segment.to === null ? node.length : normaliseIndex(segment.to, node.length)
            next.push(...node.slice(Math.max(0, from), Math.max(0, to)))
          }
          break
        case 'wildcard':
          if (Array.isArray(node)) next.push(...node)
          else if (isRecord(node)) next.push(...Object.values(node))
          break
        case 'descend':
          collectDescendants(node, next)
          break
      }
    }

    current = next
    if (current.length === 0) break
  }

  return current
}

/** Depth-first count of every value in the document, for the "nodes" statistic. */
export function countNodes(value: Json): number {
  if (Array.isArray(value)) return 1 + value.reduce((sum, v) => sum + countNodes(v), 0)
  if (isRecord(value)) return 1 + Object.values(value).reduce((sum, v) => sum + countNodes(v), 0)
  return 1
}

export function maxDepth(value: Json): number {
  if (Array.isArray(value)) return 1 + value.reduce((d, v) => Math.max(d, maxDepth(v)), 0)
  if (isRecord(value)) return 1 + Object.values(value).reduce((d, v) => Math.max(d, maxDepth(v)), 0)
  return 0
}

/** Sorts object keys recursively — handy for diffing two payloads by eye. */
export function sortKeysDeep(value: Json): Json {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (isRecord(value)) {
    const out: { [key: string]: Json } = {}
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key])
    return out
  }
  return value
}

/**
 * Turns a `JSON.parse` SyntaxError into a 1-based line/column, which browsers
 * only sometimes include in the message.
 */
export function locateJsonError(text: string, message: string): { line: number; column: number } | null {
  const match = /position\s+(\d+)/i.exec(message)
  if (!match) return null
  const position = Math.min(Number(match[1]), text.length)
  const before = text.slice(0, position)
  const line = before.split('\n').length
  const column = position - before.lastIndexOf('\n')
  return { line, column }
}
