import { base64UrlToBase64 } from './encoding'

/**
 * Local-only JWT inspection.
 *
 * This decodes; it never verifies. Verification needs the issuer's key, and the
 * whole point of the tool is that the token never leaves the browser — so the UI
 * has to state plainly that a decoded token is not a trusted one.
 */

export interface JwtClaims {
  [key: string]: unknown
}

export interface DecodedJwt {
  header: JwtClaims
  payload: JwtClaims
  /** Raw base64url signature segment, shown but never checked. */
  signature: string
  raw: { header: string; payload: string }
}

export class JwtError extends Error {
  constructor(public readonly code: 'empty' | 'segments' | 'header' | 'payload') {
    super(code)
    this.name = 'JwtError'
  }
}

function decodeSegment(segment: string): unknown {
  const binary = atob(base64UrlToBase64(segment))
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

function asObject(value: unknown): JwtClaims {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('not-an-object')
  return value as JwtClaims
}

export function decodeJwt(token: string): DecodedJwt {
  const trimmed = token.trim().replace(/^Bearer\s+/i, '')
  if (!trimmed) throw new JwtError('empty')

  const parts = trimmed.split('.')
  if (parts.length !== 3 || parts.some((p, i) => i < 2 && p.length === 0)) throw new JwtError('segments')

  let header: JwtClaims
  let payload: JwtClaims
  try {
    header = asObject(decodeSegment(parts[0]))
  } catch {
    throw new JwtError('header')
  }
  try {
    payload = asObject(decodeSegment(parts[1]))
  } catch {
    throw new JwtError('payload')
  }

  return { header, payload, signature: parts[2], raw: { header: parts[0], payload: parts[1] } }
}

/** Registered claim names from RFC 7519 §4.1 plus the widely used OIDC ones. */
export const CLAIM_DESCRIPTION_KEYS: Record<string, string> = {
  iss: 'iss', sub: 'sub', aud: 'aud', exp: 'exp', nbf: 'nbf', iat: 'iat', jti: 'jti',
  azp: 'azp', scope: 'scope', typ: 'typ', alg: 'alg', kid: 'kid', nonce: 'nonce',
  email: 'email', name: 'name', roles: 'roles',
}

export const TIME_CLAIMS = ['exp', 'nbf', 'iat', 'auth_time', 'updated_at'] as const

export function isTimeClaim(key: string): boolean {
  return (TIME_CLAIMS as readonly string[]).includes(key)
}

export type TokenValidity =
  | { state: 'valid'; expiresAt: Date }
  | { state: 'expired'; expiresAt: Date }
  | { state: 'not-yet-valid'; notBefore: Date }
  | { state: 'no-expiry' }

export function tokenValidity(payload: JwtClaims, now = Date.now()): TokenValidity {
  const nbf = typeof payload.nbf === 'number' ? payload.nbf * 1000 : null
  if (nbf !== null && now < nbf) return { state: 'not-yet-valid', notBefore: new Date(nbf) }

  const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : null
  if (exp === null) return { state: 'no-expiry' }
  return { state: now > exp ? 'expired' : 'valid', expiresAt: new Date(exp) }
}
