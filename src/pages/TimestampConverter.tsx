import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, RefreshCw } from 'lucide-react'
import {
  ActionButton,
  DataRow,
  ErrorNote,
  Field,
  Panel,
  Select,
  StatTile,
  TextInput,
  ToolShell,
} from '../components/tools/ToolUI'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.timestampConverter

const FALLBACK_ZONES = [
  'UTC', 'Europe/Oslo', 'Europe/London', 'Europe/Berlin', 'America/New_York',
  'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney',
]

function supportedZones(): string[] {
  try {
    const zones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone')
    if (zones?.length) return ['UTC', ...zones.filter(z => z !== 'UTC')]
  } catch {
    /* Intl.supportedValuesOf is not available everywhere — fall through. */
  }
  return FALLBACK_ZONES
}

/**
 * Guesses the unit of a bare number. The thresholds are the magnitudes an epoch
 * value has around the present day, so 1.7e9 reads as seconds and 1.7e12 as
 * milliseconds rather than the year 55000.
 */
function parseInput(raw: string): { date: Date; unit: 'seconds' | 'milliseconds' | 'microseconds' | 'text' } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed)
    const magnitude = Math.abs(n)
    if (magnitude >= 1e14) return { date: new Date(n / 1000), unit: 'microseconds' }
    if (magnitude >= 1e11) return { date: new Date(n), unit: 'milliseconds' }
    return { date: new Date(n * 1000), unit: 'seconds' }
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : { date: parsed, unit: 'text' }
}

/** ISO 8601 week number (ISO 8601-1:2019 §4.2.3). */
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function relativeTo(date: Date, now: number, locale: string): string {
  const diff = date.getTime() - now
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000], ['month', 2592000000], ['day', 86400000],
    ['hour', 3600000], ['minute', 60000], ['second', 1000],
  ]
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms || unit === 'second') return rtf.format(Math.round(diff / ms), unit)
  }
  return rtf.format(0, 'second')
}

export function TimestampConverter() {
  const { t, i18n } = useTranslation()
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)))
  const [zone, setZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [now, setNow] = useState(() => Date.now())

  const zones = useMemo(supportedZones, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const parsed = useMemo(() => parseInput(input), [input])
  const invalid = input.trim().length > 0 && (parsed === null || Number.isNaN(parsed.date.getTime()))
  const date = parsed && !Number.isNaN(parsed.date.getTime()) ? parsed.date : null

  const zoned = useMemo(() => {
    if (!date) return null
    try {
      return {
        full: new Intl.DateTimeFormat(i18n.language, {
          dateStyle: 'full', timeStyle: 'long', timeZone: zone,
        }).format(date),
        short: new Intl.DateTimeFormat(i18n.language, {
          dateStyle: 'short', timeStyle: 'medium', timeZone: zone,
        }).format(date),
      }
    } catch {
      return null
    }
  }, [date, zone, i18n.language])

  const week = date ? isoWeek(date) : null

  return (
    <ToolShell
      icon={<Clock size={20} />}
      color={TOOL.color}
      title={t('tools.timestampConverter.name')}
      subtitle={t('tools.timestampConverter.description')}
      info={{
        input: t('tools.timestampConverter.info.input'),
        process: t('tools.timestampConverter.info.process'),
        output: t('tools.timestampConverter.info.output'),
      }}
    >
      <Panel
        title={t('timestampConverter.inputTitle')}
        actions={
          <ActionButton
            variant="primary"
            icon={<RefreshCw size={13} />}
            onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}
          >
            {t('timestampConverter.useNow')}
          </ActionButton>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('timestampConverter.inputLabel')} hint={t('timestampConverter.inputHint')}>
            {props => (
              <TextInput
                {...props}
                mono
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="1735689600"
                spellCheck={false}
              />
            )}
          </Field>
          <Field label={t('timestampConverter.zoneLabel')} hint={t('timestampConverter.zoneHint')}>
            {props => (
              <Select {...props} value={zone} onChange={e => setZone(e.target.value)}>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </Select>
            )}
          </Field>
        </div>

        {invalid && <div className="mt-3"><ErrorNote>{t('timestampConverter.invalid')}</ErrorNote></div>}

        {parsed && !invalid && (
          <p className="fs-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {t(`timestampConverter.detected.${parsed.unit}`)}
          </p>
        )}
      </Panel>

      <Panel title={t('timestampConverter.liveTitle')}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label={t('timestampConverter.nowSeconds')} value={String(Math.floor(now / 1000))} />
          <StatTile label={t('timestampConverter.nowMillis')} value={String(now)} />
          <StatTile label={t('timestampConverter.nowIso')} value={new Date(now).toISOString().slice(11, 19) + 'Z'} />
          <StatTile label={t('timestampConverter.localZone')} value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        </div>
      </Panel>

      {date && (
        <Panel title={t('timestampConverter.resultTitle')}>
          <dl className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <DataRow label={t('timestampConverter.rows.iso')}>{date.toISOString()}</DataRow>
            <DataRow label={t('timestampConverter.rows.epochSeconds')}>{Math.floor(date.getTime() / 1000)}</DataRow>
            <DataRow label={t('timestampConverter.rows.epochMillis')}>{date.getTime()}</DataRow>
            <DataRow label={t('timestampConverter.rows.utc')}>{date.toUTCString()}</DataRow>
            <DataRow label={t('timestampConverter.rows.local')} mono={false}>
              {date.toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'long' })}
            </DataRow>
            <DataRow label={t('timestampConverter.rows.inZone', { zone })} mono={false}>
              {zoned ? zoned.full : t('timestampConverter.zoneUnsupported')}
            </DataRow>
            <DataRow label={t('timestampConverter.rows.relative')} mono={false}>
              {relativeTo(date, now, i18n.language)}
            </DataRow>
            <DataRow label={t('timestampConverter.rows.weekday')} mono={false}>
              {date.toLocaleDateString(i18n.language, { weekday: 'long' })}
            </DataRow>
            {week && (
              <DataRow label={t('timestampConverter.rows.isoWeek')}>
                {week.year}-W{String(week.week).padStart(2, '0')}
              </DataRow>
            )}
            <DataRow label={t('timestampConverter.rows.dayOfYear')}>
              {Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)}
            </DataRow>
          </dl>
        </Panel>
      )}
    </ToolShell>
  )
}
