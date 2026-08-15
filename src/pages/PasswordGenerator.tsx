import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import {
  ActionButton,
  CopyButton,
  ErrorNote,
  Field,
  Panel,
  SegmentedControl,
  StatTile,
  TextInput,
  ToolShell,
} from '../components/tools/ToolUI'
import {
  CHARSETS,
  WORDLIST,
  buildAlphabet,
  crackTimeSeconds,
  entropyBits,
  generatePassphrase,
  generatePassword,
  strengthFor,
} from '../lib/tools/password'
import type { CharsetKey, StrengthLevel } from '../lib/tools/password'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.passwordGenerator

type Mode = 'password' | 'passphrase'

const CHARSET_KEYS: CharsetKey[] = ['lower', 'upper', 'digits', 'symbols']

const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  weak: '#ef4444',
  fair: '#f59e0b',
  strong: '#22c55e',
  excellent: '#14b8a6',
}

const SEPARATORS = [
  { value: '-', key: 'hyphen' },
  { value: '.', key: 'dot' },
  { value: '_', key: 'underscore' },
  { value: ' ', key: 'space' },
] as const

function formatDuration(seconds: number, t: (key: string, params?: Record<string, unknown>) => string): string {
  if (seconds < 1) return t('passwordGenerator.crack.instant')
  const units: [string, number][] = [
    ['years', 31557600], ['days', 86400], ['hours', 3600], ['minutes', 60], ['seconds', 1],
  ]
  for (const [unit, size] of units) {
    const value = seconds / size
    if (value >= 1) {
      if (unit === 'years' && value > 1e6) {
        return t('passwordGenerator.crack.eons', { value: value.toExponential(1) })
      }
      return t(`passwordGenerator.crack.${unit}`, { value: Math.round(value).toLocaleString() })
    }
  }
  return t('passwordGenerator.crack.instant')
}

export function PasswordGenerator() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('password')
  const [length, setLength] = useState(20)
  const [sets, setSets] = useState<CharsetKey[]>(['lower', 'upper', 'digits', 'symbols'])
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [words, setWords] = useState(5)
  const [separator, setSeparator] = useState<string>('-')
  const [capitalise, setCapitalise] = useState(true)
  const [appendNumber, setAppendNumber] = useState(true)
  const [value, setValue] = useState('')

  const alphabet = useMemo(() => buildAlphabet(sets, excludeAmbiguous), [sets, excludeAmbiguous])
  const noSets = mode === 'password' && alphabet.length === 0

  const generate = useCallback(() => {
    if (mode === 'password') {
      setValue(generatePassword(length, alphabet))
    } else {
      setValue(generatePassphrase({ words, separator, capitalise, appendNumber }))
    }
  }, [mode, length, alphabet, words, separator, capitalise, appendNumber])

  useEffect(() => { generate() }, [generate])

  const bits = mode === 'password'
    ? entropyBits(alphabet.length, length)
    // The appended two-digit group adds log2(100) bits on top of the word choices.
    : entropyBits(WORDLIST.length, words) + (appendNumber ? Math.log2(100) : 0)

  const strength = strengthFor(bits)

  function toggleSet(key: CharsetKey) {
    setSets(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }

  return (
    <ToolShell
      icon={<ShieldCheck size={20} />}
      color={TOOL.color}
      width="medium"
      title={t('tools.passwordGenerator.name')}
      subtitle={t('tools.passwordGenerator.description')}
      privacyNote={t('passwordGenerator.privacyNote')}
    >
      <Panel
        title={t('passwordGenerator.resultTitle')}
        actions={
          <>
            <ActionButton variant="primary" icon={<RefreshCw size={13} />} onClick={generate}>
              {t('passwordGenerator.regenerate')}
            </ActionButton>
            <CopyButton value={value} />
          </>
        }
      >
        <div className="space-y-3">
          <output
            className="block break-all rounded-xl border px-4 py-4 text-center font-mono fs-lg"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {value || '—'}
          </output>

          {noSets && <ErrorNote>{t('passwordGenerator.errors.noCharsets')}</ErrorNote>}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between fs-xs">
              <span style={{ color: 'var(--text-subtle)' }}>{t('passwordGenerator.strengthLabel')}</span>
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
              aria-label={t('passwordGenerator.strengthLabel')}
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (bits / 128) * 100)}%`, background: STRENGTH_COLOR[strength] }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label={t('passwordGenerator.stats.entropy')} value={`${Math.round(bits)} bits`} />
            <StatTile
              label={t('passwordGenerator.stats.pool')}
              value={mode === 'password' ? String(alphabet.length) : String(WORDLIST.length)}
            />
            <StatTile
              label={t('passwordGenerator.stats.crackTime')}
              value={formatDuration(crackTimeSeconds(bits), t)}
            />
          </div>
          <p className="fs-xs prose-measure" style={{ color: 'var(--text-muted)' }}>
            {t('passwordGenerator.crackAssumption')}
          </p>
        </div>
      </Panel>

      <Panel title={t('passwordGenerator.settingsTitle')}>
        <div className="space-y-4">
          <SegmentedControl
            label={t('passwordGenerator.modeLabel')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'password', label: t('passwordGenerator.modePassword') },
              { value: 'passphrase', label: t('passwordGenerator.modePassphrase') },
            ]}
            className="sm:max-w-sm"
          />

          {mode === 'password' ? (
            <>
              <Field label={t('passwordGenerator.lengthLabel', { length })}>
                {props => (
                  <input
                    {...props}
                    type="range"
                    min={8}
                    max={64}
                    value={length}
                    onChange={e => setLength(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                    style={{ accentColor: TOOL.color }}
                  />
                )}
              </Field>

              <fieldset>
                <legend className="fs-xs font-medium mb-1.5" style={{ color: 'var(--text-subtle)' }}>
                  {t('passwordGenerator.charsetsLabel')}
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CHARSET_KEYS.map(key => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 fs-xs"
                      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      title={CHARSETS[key].slice(0, 12) + '…'}
                    >
                      <input
                        type="checkbox"
                        checked={sets.includes(key)}
                        onChange={() => toggleSet(key)}
                        className="h-4 w-4 cursor-pointer"
                        style={{ accentColor: TOOL.color }}
                      />
                      {t(`passwordGenerator.charsets.${key}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 fs-sm"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={e => setExcludeAmbiguous(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                  style={{ accentColor: TOOL.color }}
                />
                {t('passwordGenerator.excludeAmbiguous')}
              </label>
            </>
          ) : (
            <>
              <Field label={t('passwordGenerator.wordsLabel')} hint={t('passwordGenerator.wordsHint', { size: WORDLIST.length })}>
                {props => (
                  <TextInput
                    {...props}
                    type="number"
                    min={3}
                    max={12}
                    value={words}
                    onChange={e => {
                      const next = Number(e.target.value)
                      setWords(Number.isFinite(next) ? Math.min(12, Math.max(3, Math.trunc(next))) : 5)
                    }}
                  />
                )}
              </Field>

              <div className="space-y-1.5">
                <span className="block fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                  {t('passwordGenerator.separatorLabel')}
                </span>
                <SegmentedControl
                  label={t('passwordGenerator.separatorLabel')}
                  value={separator}
                  onChange={setSeparator}
                  options={SEPARATORS.map(s => ({ value: s.value, label: t(`passwordGenerator.separators.${s.key}`) }))}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  { checked: capitalise, set: setCapitalise, label: t('passwordGenerator.capitalise') },
                  { checked: appendNumber, set: setAppendNumber, label: t('passwordGenerator.appendNumber') },
                ] as const).map(option => (
                  <label
                    key={option.label}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 fs-sm"
                    style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <input
                      type="checkbox"
                      checked={option.checked}
                      onChange={e => option.set(e.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                      style={{ accentColor: TOOL.color }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </Panel>
    </ToolShell>
  )
}
