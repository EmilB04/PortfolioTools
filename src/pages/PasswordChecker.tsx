import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Eye, EyeOff, ShieldQuestion, X } from 'lucide-react'
import { Panel, StatTile, ToolShell } from '../components/tools/ToolUI'
import { analyzePassword } from '../lib/tools/passwordStrength'
import type { PasswordChecks } from '../lib/tools/passwordStrength'
import { STRENGTH_COLOR, formatCrackTime } from '../lib/tools/passwordFormat'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.passwordChecker

const CHECK_ITEMS: { key: keyof PasswordChecks; labelKey: string }[] = [
  { key: 'length', labelKey: 'length' },
  { key: 'lower', labelKey: 'lower' },
  { key: 'upper', labelKey: 'upper' },
  { key: 'digit', labelKey: 'digit' },
  { key: 'symbol', labelKey: 'symbol' },
  { key: 'noCommon', labelKey: 'noCommon' },
  { key: 'noRepeat', labelKey: 'noRepeat' },
  { key: 'noSequential', labelKey: 'noSequential' },
]

export function PasswordChecker() {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)

  const hasPassword = password.length > 0
  const analysis = useMemo(() => analyzePassword(password), [password])
  const { bits, strength, crackSeconds, checks } = analysis

  return (
    <ToolShell
      icon={<ShieldQuestion size={20} />}
      color={TOOL.color}
      width="medium"
      title={t('tools.passwordChecker.name')}
      subtitle={t('tools.passwordChecker.description')}
      privacyNote={t('passwordChecker.privacyNote')}
    >
      <Panel title={t('passwordChecker.inputTitle')}>
        <div className="space-y-4">
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
          >
            <input
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('passwordChecker.placeholder')}
              aria-label={t('passwordChecker.inputTitle')}
              className="w-full bg-transparent outline-none fs-sm font-mono"
              style={{ color: 'var(--text)' }}
            />
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              aria-label={visible ? t('passwordChecker.hide') : t('passwordChecker.show')}
              aria-pressed={visible}
              className="shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-subtle)' }}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {hasPassword && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between fs-xs">
                  <span style={{ color: 'var(--text-subtle)' }}>{t('passwordChecker.strengthLabel')}</span>
                  <span style={{ color: STRENGTH_COLOR[strength] }}>
                    {t(`passwordGenerator.strength.${strength}`)}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full"
                  role="meter"
                  aria-valuenow={Math.round(bits)}
                  aria-valuemin={0}
                  aria-valuemax={128}
                  aria-label={t('passwordChecker.strengthLabel')}
                  style={{ background: 'var(--border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (bits / 128) * 100)}%`, background: STRENGTH_COLOR[strength] }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <StatTile label={t('passwordChecker.stats.entropy')} value={`${Math.round(bits)} bits`} />
                <StatTile label={t('passwordChecker.stats.length')} value={String(password.length)} />
                <StatTile label={t('passwordChecker.stats.crackTime')} value={formatCrackTime(crackSeconds, t)} />
              </div>
              <p className="fs-xs prose-measure" style={{ color: 'var(--text-muted)' }}>
                {t('passwordGenerator.crackAssumption')}
              </p>
            </>
          )}
        </div>
      </Panel>

      {hasPassword && (
        <Panel title={t('passwordChecker.checksTitle')}>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {CHECK_ITEMS.map(({ key, labelKey }) => {
              const passed = checks[key]
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 fs-xs"
                  style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {passed
                    ? <Check size={14} style={{ color: '#22c55e' }} aria-hidden="true" />
                    : <X size={14} style={{ color: '#ef4444' }} aria-hidden="true" />}
                  {t(`passwordChecker.checks.${labelKey}`)}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </ToolShell>
  )
}
