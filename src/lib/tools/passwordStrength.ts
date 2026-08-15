/**
 * Heuristic password strength analysis. Runs entirely client-side — the
 * password never leaves the tab.
 *
 * Entropy is estimated from the character classes actually present in the
 * string, then penalised for patterns that make a password far easier to
 * guess than its raw entropy suggests: exact matches against a list of
 * widely-known common passwords, repeated-character runs, and sequential
 * runs (alphabetic, numeric, or adjacent keys on a QWERTY row).
 */
import { crackTimeSeconds, entropyBits, strengthFor } from './password'
import type { StrengthLevel } from './password'

/** A sample of the passwords that show up at the top of every leaked-password study. */
const COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', '1234567', '1234567890',
  'qwerty', 'qwerty123', 'abc123', '111111', '123123', '1234', '000000', 'iloveyou',
  'dragon', 'master', '666666', 'letmein', 'football', 'monkey', 'shadow', 'trustno1',
  '654321', 'jordan23', 'harley', 'password1', 'passw0rd', 'starwars', 'hello',
  'freedom', 'whatever', 'qazwsx', 'welcome', 'admin', 'login', 'princess', 'solo',
  'batman', 'superman', 'access', 'flower', 'hunter', 'ranger', 'buster', 'soccer',
  'hockey', 'killer', 'george', 'sexy', 'andrew', 'charlie', 'asshole', 'fuckyou',
  'dallas', 'jessica', 'pepper', '1111', 'austin', 'william', 'daniel', 'golfer',
  'summer', 'heather', 'hammer', 'yankees', 'joshua', 'maggie', 'enter', 'ashley',
  'thunder', 'cowboy', 'silver', 'richard', 'orange', 'michelle', 'corvette', 'bigdog',
  'cheese', 'matthew', '121212', 'patrick', 'martin', 'ginger', 'nicole', 'sparky',
  'yellow', 'secret', 'falcon', 'taylor', 'booboo', 'golden', 'jackson', 'cameron',
  'liverpool', 'princess1', 'sunshine', 'iloveyou1', 'chocolate', 'aa123456',
  'donald', 'baseball', 'basketball', 'zaq1zaq1', 'password123', 'letmein123',
  'trustno1!', '1q2w3e4r', '1q2w3e4r5t', 'qwertyuiop', 'zxcvbnm', 'admin123',
  'root', 'toor', 'changeme', 'default', 'guest', 'test', 'temp', 'user',
])

const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
]

function hasSequentialRun(password: string, minRun = 3): boolean {
  const lower = password.toLowerCase()
  for (const seq of SEQUENCES) {
    for (let i = 0; i <= seq.length - minRun; i++) {
      const fwd = seq.slice(i, i + minRun)
      const rev = [...fwd].reverse().join('')
      if (lower.includes(fwd) || lower.includes(rev)) return true
    }
  }
  return false
}

function hasRepeatedRun(password: string, minRun = 3): boolean {
  return new RegExp(`(.)\\1{${minRun - 1},}`).test(password)
}

function poolSizeFor(password: string): number {
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/[0-9]/.test(password)) pool += 10
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33
  return pool
}

export interface PasswordChecks {
  length: boolean
  lower: boolean
  upper: boolean
  digit: boolean
  symbol: boolean
  noCommon: boolean
  noRepeat: boolean
  noSequential: boolean
}

export interface PasswordAnalysis {
  bits: number
  strength: StrengthLevel
  crackSeconds: number
  poolSize: number
  checks: PasswordChecks
}

/** Bits an exact match against the common-password list is capped at — still
 *  guessable in an eyeblink regardless of how long or varied it looks. */
const COMMON_PASSWORD_BITS_CAP = 8
const PATTERN_PENALTY_BITS = 8

export function analyzePassword(password: string): PasswordAnalysis {
  const lower = /[a-z]/.test(password)
  const upper = /[A-Z]/.test(password)
  const digit = /[0-9]/.test(password)
  const symbol = /[^a-zA-Z0-9]/.test(password)

  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase())
  const repeated = hasRepeatedRun(password)
  const sequential = hasSequentialRun(password)

  let bits = entropyBits(poolSizeFor(password), password.length)
  if (isCommon) bits = Math.min(bits, COMMON_PASSWORD_BITS_CAP)
  if (repeated) bits = Math.max(0, bits - PATTERN_PENALTY_BITS)
  if (sequential) bits = Math.max(0, bits - PATTERN_PENALTY_BITS)

  return {
    bits,
    strength: strengthFor(bits),
    crackSeconds: crackTimeSeconds(bits),
    poolSize: poolSizeFor(password),
    checks: {
      length: password.length >= 12,
      lower,
      upper,
      digit,
      symbol,
      noCommon: !isCommon,
      noRepeat: !repeated,
      noSequential: !sequential,
    },
  }
}
