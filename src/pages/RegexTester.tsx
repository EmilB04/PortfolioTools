import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eraser, Regex } from 'lucide-react'
import {
  ActionButton,
  ErrorNote,
  Field,
  OutputBlock,
  Panel,
  StatTile,
  TextArea,
  TextInput,
  ToolShell,
} from '../components/tools/ToolUI'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.regexTester

const FLAGS = [
  { flag: 'g', key: 'global' },
  { flag: 'i', key: 'ignoreCase' },
  { flag: 'm', key: 'multiline' },
  { flag: 's', key: 'dotAll' },
  { flag: 'u', key: 'unicode' },
  { flag: 'y', key: 'sticky' },
] as const

/**
 * A pathological pattern can backtrack for minutes and lock up the tab, and a
 * synchronous regex cannot be interrupted. Capping the subject length and the
 * match count keeps the worst case bounded without a worker.
 */
const MAX_SUBJECT = 20_000
const MAX_MATCHES = 500

interface MatchResult {
  index: number
  text: string
  groups: string[]
  named: Record<string, string | undefined>
}

export function RegexTester() {
  const { t } = useTranslation()
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('gm')
  const [subject, setSubject] = useState('')
  const [replacement, setReplacement] = useState('')

  const truncated = subject.length > MAX_SUBJECT
  const workingSubject = truncated ? subject.slice(0, MAX_SUBJECT) : subject

  const compiled = useMemo(() => {
    if (!pattern) return { ok: true as const, regex: null }
    try {
      return { ok: true as const, regex: new RegExp(pattern, flags) }
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) }
    }
  }, [pattern, flags])

  const analysis = useMemo(() => {
    if (!compiled.ok || !compiled.regex || !workingSubject) return null
    const regex = new RegExp(compiled.regex.source, compiled.regex.flags.includes('g') ? compiled.regex.flags : compiled.regex.flags + 'g')
    const matches: MatchResult[] = []
    let lastIndex = -1

    try {
      for (const m of workingSubject.matchAll(regex)) {
        if (m.index === lastIndex && m[0] === '') break // zero-width loop guard
        lastIndex = m.index ?? -1
        matches.push({
          index: m.index ?? 0,
          text: m[0],
          groups: m.slice(1).map(g => g ?? ''),
          named: { ...(m.groups ?? {}) },
        })
        if (matches.length >= MAX_MATCHES) break
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e), matches: [] as MatchResult[] }
    }

    return { error: null, matches }
  }, [compiled, workingSubject])

  const replaced = useMemo(() => {
    if (!compiled.ok || !compiled.regex || !workingSubject) return ''
    try {
      return workingSubject.replace(compiled.regex, replacement)
    } catch {
      return ''
    }
  }, [compiled, workingSubject, replacement])

  /** Splits the subject into highlighted / plain runs for the preview. */
  const highlighted = useMemo(() => {
    if (!analysis || analysis.matches.length === 0) return null
    const pieces: { text: string; hit: boolean }[] = []
    let cursor = 0
    for (const m of analysis.matches) {
      if (m.index > cursor) pieces.push({ text: workingSubject.slice(cursor, m.index), hit: false })
      pieces.push({ text: m.text, hit: true })
      cursor = m.index + m.text.length
    }
    if (cursor < workingSubject.length) pieces.push({ text: workingSubject.slice(cursor), hit: false })
    return pieces
  }, [analysis, workingSubject])

  function toggleFlag(flag: string) {
    setFlags(prev => (prev.includes(flag) ? prev.replace(flag, '') : prev + flag))
  }

  return (
    <ToolShell
      icon={<Regex size={20} />}
      color={TOOL.color}
      width="wide"
      title={t('tools.regexTester.name')}
      subtitle={t('tools.regexTester.description')}
      info={{
        input: t('tools.regexTester.info.input'),
        process: t('tools.regexTester.info.process'),
        output: t('tools.regexTester.info.output'),
      }}
      privacyNote={t('toolCommon.localOnly')}
    >
      <Panel
        title={t('regexTester.patternTitle')}
        actions={
          <ActionButton
            icon={<Eraser size={13} />}
            onClick={() => { setPattern(''); setSubject(''); setReplacement('') }}
            disabled={!pattern && !subject}
          >
            {t('toolCommon.clear')}
          </ActionButton>
        }
      >
        <div className="space-y-4">
          <Field label={t('regexTester.patternLabel')} hint={t('regexTester.patternHint')}>
            {props => (
              <div className="flex items-center gap-2">
                <span className="font-mono fs-sm" style={{ color: 'var(--text-muted)' }}>/</span>
                <TextInput
                  {...props}
                  mono
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                  placeholder="(?<key>[A-Z_]+)=(.*)"
                  spellCheck={false}
                />
                <span className="font-mono fs-sm" style={{ color: 'var(--text-muted)' }}>/{flags}</span>
              </div>
            )}
          </Field>

          <fieldset>
            <legend className="fs-xs font-medium mb-1.5" style={{ color: 'var(--text-subtle)' }}>
              {t('regexTester.flagsLabel')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {FLAGS.map(({ flag, key }) => {
                const on = flags.includes(flag)
                return (
                  <label
                    key={flag}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 fs-xs transition-colors ${on ? 'tool-text' : ''}`}
                    style={{
                      background: 'var(--surface-card)',
                      borderColor: on ? 'var(--border-strong)' : 'var(--border)',
                      color: on ? undefined : 'var(--text-subtle)',
                    }}
                    title={t(`regexTester.flags.${key}`)}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleFlag(flag)}
                      className="h-3.5 w-3.5 cursor-pointer"
                      style={{ accentColor: TOOL.color }}
                    />
                    <span className="font-mono font-semibold">{flag}</span>
                    <span>{t(`regexTester.flags.${key}`)}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {!compiled.ok && <ErrorNote>{t('regexTester.invalidPattern', { message: compiled.message })}</ErrorNote>}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('regexTester.subjectTitle')}>
          <div className="space-y-3">
            <Field label={t('regexTester.subjectLabel')}>
              {props => (
                <TextArea
                  {...props}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  rows={12}
                  placeholder={t('regexTester.subjectPlaceholder')}
                />
              )}
            </Field>
            {truncated && (
              <p className="fs-xs" style={{ color: '#f59e0b' }}>
                {t('regexTester.truncated', { max: MAX_SUBJECT.toLocaleString() })}
              </p>
            )}
            {analysis?.error && <ErrorNote>{analysis.error}</ErrorNote>}
          </div>
        </Panel>

        <Panel title={t('regexTester.matchesTitle')}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <StatTile label={t('regexTester.stats.matches')} value={String(analysis?.matches.length ?? 0)} />
              <StatTile
                label={t('regexTester.stats.groups')}
                value={String(analysis?.matches[0]?.groups.length ?? 0)}
              />
            </div>

            {highlighted && (
              <div
                className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border p-3 font-mono fs-xs"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text-subtle)' }}
                aria-label={t('regexTester.highlightLabel')}
              >
                {highlighted.map((piece, i) =>
                  piece.hit ? (
                    <mark
                      key={i}
                      className="rounded px-0.5"
                      style={{ background: `${TOOL.color}40`, color: 'var(--text)' }}
                    >
                      {piece.text}
                    </mark>
                  ) : (
                    <span key={i}>{piece.text}</span>
                  ),
                )}
              </div>
            )}

            {analysis && analysis.matches.length > 0 && (
              <div className="max-h-72 overflow-auto">
                <table className="w-full fs-xs">
                  <caption className="sr-only">{t('regexTester.matchesTitle')}</caption>
                  <thead>
                    <tr style={{ color: 'var(--text-subtle)' }}>
                      <th scope="col" className="py-1.5 pr-2 text-left font-medium">#</th>
                      <th scope="col" className="py-1.5 pr-2 text-left font-medium">{t('regexTester.table.index')}</th>
                      <th scope="col" className="py-1.5 pr-2 text-left font-medium">{t('regexTester.table.match')}</th>
                      <th scope="col" className="py-1.5 text-left font-medium">{t('regexTester.table.groups')}</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {analysis.matches.map((m, i) => (
                      <tr key={`${m.index}-${i}`} className="border-t align-top" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-1.5 pr-2" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td className="py-1.5 pr-2" style={{ color: 'var(--text-muted)' }}>{m.index}</td>
                        <td className="py-1.5 pr-2 break-all" style={{ color: 'var(--text)' }}>{m.text}</td>
                        <td className="py-1.5 break-all" style={{ color: 'var(--text-subtle)' }}>
                          {Object.keys(m.named).length > 0
                            ? Object.entries(m.named).map(([k, v]) => `${k}=${v ?? ''}`).join(' · ')
                            : m.groups.join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {analysis && analysis.matches.length === 0 && !analysis.error && (
              <p className="fs-sm" style={{ color: 'var(--text-subtle)' }}>{t('regexTester.noMatches')}</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel title={t('regexTester.replaceTitle')}>
        <div className="space-y-3">
          <Field label={t('regexTester.replaceLabel')} hint={t('regexTester.replaceHint')}>
            {props => (
              <TextInput
                {...props}
                mono
                value={replacement}
                onChange={e => setReplacement(e.target.value)}
                placeholder="$1"
                spellCheck={false}
              />
            )}
          </Field>
          <OutputBlock label={t('regexTester.replaceResult')} value={replaced} rows={6} />
        </div>
      </Panel>
    </ToolShell>
  )
}
