/**
 * IPv4 CIDR maths. All arithmetic is done on unsigned 32-bit values via `>>> 0`,
 * because JavaScript's bitwise operators produce signed results and every address
 * above 127.255.255.255 would otherwise come back negative.
 */

export class SubnetError extends Error {
  constructor(public readonly code: 'empty' | 'address' | 'prefix' | 'format') {
    super(code)
    this.name = 'SubnetError'
  }
}

export function ipToInt(ip: string): number {
  const octets = ip.trim().split('.')
  if (octets.length !== 4) throw new SubnetError('address')
  let value = 0
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) throw new SubnetError('address')
    const n = Number(octet)
    if (n > 255) throw new SubnetError('address')
    value = (value << 8) | n
  }
  return value >>> 0
}

export function intToIp(value: number): string {
  const v = value >>> 0
  return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.')
}

export function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

/** Number of set bits, so a dotted mask can be turned back into a prefix length. */
export function maskToPrefix(mask: number): number | null {
  const m = mask >>> 0
  // A valid mask is a run of 1s followed by a run of 0s; ~m + 1 must be a power of two.
  const inverted = (~m >>> 0) + 1
  if (m !== 0 && (inverted & (inverted - 1)) !== 0) return null
  let bits = 0
  for (let i = 31; i >= 0; i--) {
    if ((m >>> i) & 1) bits++
    else break
  }
  return bits
}

export interface SubnetInfo {
  address: string
  prefix: number
  netmask: string
  wildcard: string
  network: string
  broadcast: string
  firstHost: string | null
  lastHost: string | null
  totalAddresses: number
  usableHosts: number
  isPrivate: boolean
  cidr: string
  binaryMask: string
  addressClass: string
}

function classify(networkInt: number): string {
  const first = (networkInt >>> 24) & 255
  if (first < 128) return 'A'
  if (first < 192) return 'B'
  if (first < 224) return 'C'
  if (first < 240) return 'D'
  return 'E'
}

/** RFC 1918 plus the loopback and link-local ranges people actually care about. */
function isPrivateNetwork(networkInt: number): boolean {
  const ranges: [string, number][] = [
    ['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16],
    ['127.0.0.0', 8], ['169.254.0.0', 16],
  ]
  return ranges.some(([base, prefix]) => (networkInt & prefixToMask(prefix)) >>> 0 === ipToInt(base))
}

/** Accepts `10.0.0.0/24`, `10.0.0.0 255.255.255.0` or a bare address (defaults to /32). */
export function parseCidr(input: string): { addressInt: number; prefix: number } {
  const trimmed = input.trim()
  if (!trimmed) throw new SubnetError('empty')

  const [addressPart, maskPart] = trimmed.split(/[/\s]+/)
  const addressInt = ipToInt(addressPart)

  if (maskPart === undefined) return { addressInt, prefix: 32 }

  if (maskPart.includes('.')) {
    const prefix = maskToPrefix(ipToInt(maskPart))
    if (prefix === null) throw new SubnetError('prefix')
    return { addressInt, prefix }
  }

  if (!/^\d{1,2}$/.test(maskPart)) throw new SubnetError('prefix')
  const prefix = Number(maskPart)
  if (prefix > 32) throw new SubnetError('prefix')
  return { addressInt, prefix }
}

export function describeSubnet(input: string): SubnetInfo {
  const { addressInt, prefix } = parseCidr(input)
  const mask = prefixToMask(prefix)
  const network = (addressInt & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = 2 ** (32 - prefix)

  // /31 is a point-to-point link (RFC 3021) and /32 is a single host: neither has
  // a network/broadcast pair to exclude.
  let firstHost: string | null = null
  let lastHost: string | null = null
  let usable = 0
  if (prefix <= 30) {
    firstHost = intToIp(network + 1)
    lastHost = intToIp(broadcast - 1)
    usable = total - 2
  } else {
    firstHost = intToIp(network)
    lastHost = intToIp(broadcast)
    usable = total
  }

  return {
    address: intToIp(addressInt),
    prefix,
    netmask: intToIp(mask),
    wildcard: intToIp(~mask >>> 0),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost,
    lastHost,
    totalAddresses: total,
    usableHosts: usable,
    isPrivate: isPrivateNetwork(network),
    cidr: `${intToIp(network)}/${prefix}`,
    binaryMask: [24, 16, 8, 0].map(shift => ((mask >>> shift) & 255).toString(2).padStart(8, '0')).join('.'),
    addressClass: classify(network),
  }
}

/** Splits a block into equal child subnets of `newPrefix`, capped at `limit` rows. */
export function splitSubnet(info: SubnetInfo, newPrefix: number, limit = 256): { cidr: string; range: string }[] {
  if (newPrefix <= info.prefix || newPrefix > 32) return []
  const network = ipToInt(info.network)
  const size = 2 ** (32 - newPrefix)
  const count = Math.min(2 ** (newPrefix - info.prefix), limit)

  return Array.from({ length: count }, (_, i) => {
    const start = (network + i * size) >>> 0
    const end = (start + size - 1) >>> 0
    return { cidr: `${intToIp(start)}/${newPrefix}`, range: `${intToIp(start)} – ${intToIp(end)}` }
  })
}

/** True when `ip` falls inside the block — the "is this host in my subnet?" check. */
export function containsAddress(info: SubnetInfo, ip: string): boolean {
  const mask = prefixToMask(info.prefix)
  return ((ipToInt(ip) & mask) >>> 0) === ipToInt(info.network)
}
