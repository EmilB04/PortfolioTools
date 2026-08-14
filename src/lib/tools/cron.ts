/**
 * Five-field cron parsing, plain-language summaries and next-run preview.
 *
 * Follows Vixie/crontab semantics, including the day-of-month vs day-of-week rule:
 * when *both* are restricted the job fires if *either* matches, not both.
 * Everything is evaluated in the browser's local time zone.
 */

export type CronFieldName = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'

export interface CronField {
  name: CronFieldName
  /** Every value the field matches, ascending. */
  values: number[]
  /** True when the field was written as `*` (or a full range). */
  isEvery: boolean
  /** Set when the field is a single `*/n` or `a-b/n` step. */
  step: number | null
  raw: string
}

export interface CronSpec {
  fields: Record<CronFieldName, CronField>
  /** The macro the user typed, if any (`@daily`, …). */
  macro: string | null
  normalised: string
}

export class CronError extends Error {
  constructor(
    public readonly code: 'empty' | 'fieldCount' | 'range' | 'syntax',
    public readonly field?: CronFieldName,
    public readonly token?: string,
  ) {
    super(code)
    this.name = 'CronError'
  }
}

const BOUNDS: Record<CronFieldName, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 6],
}

const FIELD_ORDER: CronFieldName[] = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const CRON_MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

function parseValue(token: string, field: CronFieldName): number {
  const lower = token.toLowerCase()
  if (field === 'month') {
    const idx = MONTH_NAMES.indexOf(lower)
    if (idx !== -1) return idx + 1
  }
  if (field === 'dayOfWeek') {
    const idx = DAY_NAMES.indexOf(lower)
    if (idx !== -1) return idx
  }
  if (!/^\d+$/.test(token)) throw new CronError('syntax', field, token)
  const value = Number(token)
  // Cron accepts 7 as Sunday alongside 0.
  if (field === 'dayOfWeek' && value === 7) return 0
  const [min, max] = BOUNDS[field]
  if (value < min || value > max) throw new CronError('range', field, token)
  return value
}

function parseField(raw: string, field: CronFieldName): CronField {
  const [min, max] = BOUNDS[field]
  const values = new Set<number>()
  let isEvery = false
  let step: number | null = null

  const parts = raw.split(',')
  for (const part of parts) {
    if (part.length === 0) throw new CronError('syntax', field, raw)

    const [rangePart, stepPart] = part.split('/')
    if (part.split('/').length > 2) throw new CronError('syntax', field, part)

    let stepValue = 1
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart) || Number(stepPart) === 0) throw new CronError('syntax', field, part)
      stepValue = Number(stepPart)
    }

    let from: number
    let to: number
    if (rangePart === '*') {
      from = min
      to = max
      if (parts.length === 1) {
        isEvery = stepValue === 1
        step = stepValue === 1 ? null : stepValue
      }
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-')
      if (b === undefined || rangePart.split('-').length > 2) throw new CronError('syntax', field, part)
      from = parseValue(a, field)
      to = parseValue(b, field)
      if (from > to) throw new CronError('range', field, part)
      if (parts.length === 1 && stepValue > 1) step = stepValue
    } else {
      from = to = parseValue(rangePart, field)
      if (stepPart !== undefined) to = max
    }

    for (let v = from; v <= to; v += stepValue) values.add(v)
  }

  if (values.size === 0) throw new CronError('syntax', field, raw)
  if (values.size === max - min + 1 && step === null) isEvery = true

  return { name: field, values: [...values].sort((a, b) => a - b), isEvery, step, raw }
}

export function parseCron(expression: string): CronSpec {
  const trimmed = expression.trim().replace(/\s+/g, ' ')
  if (!trimmed) throw new CronError('empty')

  const macro = trimmed.toLowerCase().startsWith('@') ? trimmed.toLowerCase() : null
  const source = macro ? CRON_MACROS[macro] : trimmed
  if (macro && !source) throw new CronError('syntax', undefined, macro)

  const tokens = source.split(' ')
  if (tokens.length !== 5) throw new CronError('fieldCount', undefined, String(tokens.length))

  const fields = {} as Record<CronFieldName, CronField>
  FIELD_ORDER.forEach((name, i) => { fields[name] = parseField(tokens[i], name) })

  return { fields, macro, normalised: source }
}

/** Matching is the union of DOM/DOW when both are restricted (Vixie cron rule). */
function matchesDate(spec: CronSpec, date: Date): boolean {
  const { dayOfMonth, month, dayOfWeek } = spec.fields
  if (!month.values.includes(date.getMonth() + 1)) return false

  const domMatch = dayOfMonth.values.includes(date.getDate())
  const dowMatch = dayOfWeek.values.includes(date.getDay())

  if (dayOfMonth.isEvery && dayOfWeek.isEvery) return true
  if (dayOfMonth.isEvery) return dowMatch
  if (dayOfWeek.isEvery) return domMatch
  return domMatch || dowMatch
}

/** Next `count` fire times at or after `from`, in local time. */
export function nextRuns(spec: CronSpec, from: Date, count: number): Date[] {
  const cursor = new Date(from)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  // A schedule such as `0 0 30 2 *` never fires; bail out rather than spin.
  const horizon = new Date(from)
  horizon.setFullYear(horizon.getFullYear() + 5)

  const runs: Date[] = []
  while (runs.length < count && cursor <= horizon) {
    if (!matchesDate(spec, cursor)) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(0, 0, 0, 0)
      continue
    }
    if (!spec.fields.hour.values.includes(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
      continue
    }
    if (!spec.fields.minute.values.includes(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
      continue
    }
    runs.push(new Date(cursor))
    cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
  }
  return runs
}

/**
 * A translatable description: each part names an i18n key plus its interpolation
 * values, so the summary reads naturally in every locale instead of being
 * assembled from pre-translated fragments.
 */
export interface CronDescriptionPart {
  key: string
  params?: Record<string, string | number>
}

function listValues(field: CronField, format: (v: number) => string): string {
  const shown = field.values.slice(0, 12).map(format)
  return field.values.length > 12 ? `${shown.join(', ')}…` : shown.join(', ')
}

export function describeCron(
  spec: CronSpec,
  format: { month: (v: number) => string; weekday: (v: number) => string },
): CronDescriptionPart[] {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = spec.fields
  const parts: CronDescriptionPart[] = []

  // Time of day
  if (minute.isEvery && hour.isEvery) parts.push({ key: 'everyMinute' })
  else if (minute.step && hour.isEvery) parts.push({ key: 'everyNMinutes', params: { n: minute.step } })
  else if (minute.isEvery) parts.push({ key: 'everyMinuteOfHours', params: { hours: listValues(hour, h => String(h)) } })
  else if (hour.isEvery && minute.values.length === 1) parts.push({ key: 'hourlyAtMinute', params: { minute: minute.values[0] } })
  else if (hour.isEvery) parts.push({ key: 'hourlyAtMinutes', params: { minutes: listValues(minute, m => String(m)) } })
  else if (hour.step && minute.values.length === 1) {
    parts.push({ key: 'everyNHoursAtMinute', params: { n: hour.step, minute: minute.values[0] } })
  } else {
    const times = hour.values
      .flatMap(h => minute.values.map(m => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`))
      .sort()
    parts.push({ key: 'atTimes', params: { times: times.slice(0, 12).join(', ') + (times.length > 12 ? '…' : '') } })
  }

  // Day of month
  if (!dayOfMonth.isEvery) {
    parts.push(
      dayOfMonth.step
        ? { key: 'everyNDaysOfMonth', params: { n: dayOfMonth.step } }
        : { key: 'onDaysOfMonth', params: { days: listValues(dayOfMonth, d => String(d)) } },
    )
  }

  // Day of week
  if (!dayOfWeek.isEvery) {
    parts.push({ key: 'onWeekdays', params: { days: listValues(dayOfWeek, format.weekday) } })
  }

  // Month
  if (!month.isEvery) {
    parts.push({ key: 'inMonths', params: { months: listValues(month, format.month) } })
  }

  if (!dayOfMonth.isEvery && !dayOfWeek.isEvery) parts.push({ key: 'dayUnionNote' })

  return parts
}
