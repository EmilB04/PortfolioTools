/**
 * Identifier generators. Every one of these draws from `crypto.getRandomValues`
 * — never `Math.random`, which is not seeded for unpredictability and would make
 * the output guessable if anyone used it for a token.
 */

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export function uuidV4(): string {
  // randomUUID is unavailable on insecure origins, so keep a manual path.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = randomBytes(16)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = hex(b)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** RFC 9562 UUIDv7: 48-bit big-endian millisecond timestamp, then 74 random bits. */
export function uuidV7(now = Date.now()): string {
  const b = randomBytes(16)
  b[0] = (now / 2 ** 40) & 0xff
  b[1] = (now / 2 ** 32) & 0xff
  b[2] = (now / 2 ** 24) & 0xff
  b[3] = (now / 2 ** 16) & 0xff
  b[4] = (now / 2 ** 8) & 0xff
  b[5] = now & 0xff
  b[6] = (b[6] & 0x0f) | 0x70
  b[8] = (b[8] & 0x3f) | 0x80
  const h = hex(b)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** ULID: 48-bit timestamp + 80 bits of randomness, Crockford base32, sortable. */
export function ulid(now = Date.now()): string {
  let time = ''
  let remaining = now
  for (let i = 9; i >= 0; i--) {
    time = CROCKFORD[remaining % 32] + time
    remaining = Math.floor(remaining / 32)
  }

  const bytes = randomBytes(16)
  let random = ''
  for (let i = 0; i < 16; i++) random += CROCKFORD[bytes[i] % 32]

  return time + random
}

const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict'

export function nanoId(size = 21): string {
  const bytes = randomBytes(size)
  let out = ''
  for (let i = 0; i < size; i++) out += NANOID_ALPHABET[bytes[i] & 63]
  return out
}

/** Short, unambiguous, case-insensitive code — for support tickets and the like. */
export function shortCode(size = 8): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = randomBytes(size)
  let out = ''
  for (let i = 0; i < size; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

export type IdKind = 'uuidv4' | 'uuidv7' | 'ulid' | 'nanoid' | 'short'

export const ID_GENERATORS: Record<IdKind, () => string> = {
  uuidv4: uuidV4,
  uuidv7: () => uuidV7(),
  ulid: () => ulid(),
  nanoid: () => nanoId(),
  short: () => shortCode(),
}

/** Pulls the embedded timestamp back out of a v7 UUID or a ULID, if present. */
export function timestampFromId(kind: IdKind, id: string): Date | null {
  try {
    if (kind === 'uuidv7') {
      const h = id.replace(/-/g, '').slice(0, 12)
      return new Date(parseInt(h, 16))
    }
    if (kind === 'ulid') {
      let ms = 0
      for (const ch of id.slice(0, 10)) {
        const index = CROCKFORD.indexOf(ch)
        if (index === -1) return null
        ms = ms * 32 + index
      }
      return new Date(ms)
    }
  } catch {
    return null
  }
  return null
}
