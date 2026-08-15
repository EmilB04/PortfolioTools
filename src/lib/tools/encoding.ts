/**
 * UTF-8-safe text encoding helpers. `btoa`/`atob` operate on latin-1, so anything
 * outside U+00FF throws — everything here round-trips through TextEncoder instead.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

function bytesToBinary(bytes: Uint8Array): string {
  // Chunked so a large input cannot blow the argument limit of String.fromCharCode.
  let out = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return out
}

export function toBase64(text: string): string {
  return btoa(bytesToBinary(encoder.encode(text)))
}

export function fromBase64(b64: string): string {
  const normalised = b64.trim().replace(/\s+/g, '')
  const binary = atob(normalised)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return decoder.decode(bytes)
}

export function toBase64Url(text: string): string {
  return toBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(b64url: string): string {
  return fromBase64(base64UrlToBase64(b64url))
}

/** Restores standard base64 alphabet and padding — shared with the JWT decoder. */
export function base64UrlToBase64(input: string): string {
  const padded = input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const remainder = padded.length % 4
  return remainder === 0 ? padded : padded + '='.repeat(4 - remainder)
}

export function toUrlEncoded(text: string): string {
  return encodeURIComponent(text)
}

export function fromUrlEncoded(text: string): string {
  return decodeURIComponent(text)
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function toHtmlEntities(text: string): string {
  return text.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch])
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
}

/**
 * Decodes numeric and the common named entities. Deliberately does *not* use
 * innerHTML for this: feeding untrusted markup to the parser to "decode" it is a
 * classic XSS foot-gun, even when only textContent is read back.
 */
export function fromHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X'
      const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10)
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match
      try {
        return String.fromCodePoint(code)
      } catch {
        return match
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()]
    return named ?? match
  })
}

export function toHex(text: string): string {
  return Array.from(encoder.encode(text), b => b.toString(16).padStart(2, '0')).join(' ')
}

export function fromHex(hex: string): string {
  const clean = hex.replace(/(0x)|[\s,:-]/gi, '')
  if (clean.length === 0) return ''
  if (clean.length % 2 !== 0) throw new Error('odd-length')
  if (!/^[0-9a-f]+$/i.test(clean)) throw new Error('not-hex')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  return decoder.decode(bytes)
}

export type EncodingMode = 'base64' | 'base64url' | 'url' | 'html' | 'hex'

export const ENCODERS: Record<EncodingMode, { encode: (s: string) => string; decode: (s: string) => string }> = {
  base64: { encode: toBase64, decode: fromBase64 },
  base64url: { encode: toBase64Url, decode: fromBase64Url },
  url: { encode: toUrlEncoded, decode: fromUrlEncoded },
  html: { encode: toHtmlEntities, decode: fromHtmlEntities },
  hex: { encode: toHex, decode: fromHex },
}
