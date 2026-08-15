import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Clock, Eraser, KeyRound, XCircle } from 'lucide-react'
import {
  ActionButton,
  DataRow,
  ErrorNote,
  Field,
  OutputBlock,
  Panel,
  TextArea,
  ToolShell,
} from '../components/tools/ToolUI'
import { JwtError, decodeJwt, isTimeClaim, tokenValidity } from '../lib/tools/jwt'
import type { JwtClaims } from '../lib/tools/jwt'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.jwtDecoder

function formatClaim(key: string, value: unknown, locale: string): string {
  if (isTimeClaim(key) && typeof value === 'number') {
    const date = new Date(value * 1000)
    return Number.isNaN(date.getTime()) ? String(value) : `${value} · ${date.toLocaleString(locale)}`
  }
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export function JwtDecoder() {
  const { t, i18n } = useTranslation()
  const [token, setToken] = useState('')

  const result = useMemo(() => {
    if (!token.trim()) return null
    try {
      return { ok: true as const, jwt: decodeJwt(token) }
    } catch (e) {
      return { ok: false as const, code: e instanceof JwtError ? e.code : 'segments' }
    }
  }, [token])

  const jwt = result?.ok ? result.jwt : null
  const validity = useMemo(() => (jwt ? tokenValidity(jwt.payload) : null), [jwt])

  const validityTone =
    validity?.state === 'valid' ? { color: '#22c55e', Icon: CheckCircle2 }
    : validity?.state === 'expired' ? { color: '#ef4444', Icon: XCircle }
    : validity?.state === 'not-yet-valid' ? { color: '#f59e0b', Icon: Clock }
    : { color: 'var(--text-subtle)', Icon: AlertTriangle }

  const validityText =
    validity?.state === 'valid' ? t('jwtDecoder.validity.valid', { date: validity.expiresAt.toLocaleString(i18n.language) })
    : validity?.state === 'expired' ? t('jwtDecoder.validity.expired', { date: validity.expiresAt.toLocaleString(i18n.language) })
    : validity?.state === 'not-yet-valid' ? t('jwtDecoder.validity.notYetValid', { date: validity.notBefore.toLocaleString(i18n.language) })
    : t('jwtDecoder.validity.noExpiry')

  function renderClaims(claims: JwtClaims) {
    const entries = Object.entries(claims)
    if (entries.length === 0) {
      return <p className="fs-sm" style={{ color: 'var(--text-subtle)' }}>{t('jwtDecoder.noClaims')}</p>
    }
    return (
      <dl className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {entries.map(([key, value]) => (
          <DataRow
            key={key}
            label={t(`jwtDecoder.claims.${key}`, { defaultValue: key })}
          >
            <span className="block" style={{ color: 'var(--text)' }}>{formatClaim(key, value, i18n.language)}</span>
            <span className="block fs-xs font-sans" style={{ color: 'var(--text-muted)' }}>{key}</span>
          </DataRow>
        ))}
      </dl>
    )
  }

  return (
    <ToolShell
      icon={<KeyRound size={20} />}
      color={TOOL.color}
      width="wide"
      title={t('tools.jwtDecoder.name')}
      subtitle={t('tools.jwtDecoder.description')}
      info={{
        input: t('tools.jwtDecoder.info.input'),
        process: t('tools.jwtDecoder.info.process'),
        output: t('tools.jwtDecoder.info.output'),
      }}
      privacyNote={t('jwtDecoder.privacyNote')}
    >
      <Panel
        title={t('jwtDecoder.inputTitle')}
        actions={
          <ActionButton icon={<Eraser size={13} />} onClick={() => setToken('')} disabled={!token}>
            {t('toolCommon.clear')}
          </ActionButton>
        }
      >
        <div className="space-y-3">
          <Field label={t('jwtDecoder.inputLabel')} hint={t('jwtDecoder.inputHint')}>
            {props => (
              <TextArea
                {...props}
                value={token}
                onChange={e => setToken(e.target.value)}
                rows={5}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                className="break-all"
              />
            )}
          </Field>

          {result && !result.ok && <ErrorNote>{t(`jwtDecoder.errors.${result.code}`)}</ErrorNote>}
        </div>
      </Panel>

      {jwt && (
        <>
          {/* Decoding proves nothing about authenticity — say so before the claims. */}
          <p
            className="flex items-start gap-2 rounded-xl border px-3 py-2.5 fs-xs"
            style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.4)', color: 'var(--text)' }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} aria-hidden="true" />
            <span>{t('jwtDecoder.signatureWarning')}</span>
          </p>

          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5 fs-sm"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
          >
            <validityTone.Icon size={16} style={{ color: validityTone.color }} aria-hidden="true" />
            <span style={{ color: 'var(--text)' }}>{validityText}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t('jwtDecoder.headerTitle')}>{renderClaims(jwt.header)}</Panel>
            <Panel title={t('jwtDecoder.payloadTitle')}>{renderClaims(jwt.payload)}</Panel>
          </div>

          <Panel title={t('jwtDecoder.rawTitle')}>
            <div className="grid gap-4 lg:grid-cols-2">
              <OutputBlock label={t('jwtDecoder.headerJson')} value={JSON.stringify(jwt.header, null, 2)} rows={8} />
              <OutputBlock label={t('jwtDecoder.payloadJson')} value={JSON.stringify(jwt.payload, null, 2)} rows={8} />
            </div>
            <div className="mt-4">
              <OutputBlock label={t('jwtDecoder.signatureLabel')} value={jwt.signature} rows={2} />
            </div>
          </Panel>
        </>
      )}
    </ToolShell>
  )
}
