import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock } from 'lucide-react'
import {
  ActionButton,
  ErrorNote,
  Field,
  Panel,
  StatTile,
  TextInput,
  ToolShell,
} from '../components/tools/ToolUI'
import { CRON_MACROS, CronError, describeCron, nextRuns, parseCron } from '../lib/tools/cron'
import type { CronFieldName } from '../lib/tools/cron'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.cronExplainer

const PRESETS = ['*/5 * * * *', '0 * * * *', '0 3 * * *', '30 2 * * 1-5', '0 0 1 * *', '@weekly']

const FIELD_ORDER: CronFieldName[] = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']

const RUN_COUNT = 8

export function CronExplainer() {
  const { t, i18n } = useTranslation()
  const [expression, setExpression] = useState('30 2 * * 1-5')

  const formatters = useMemo(
    () => ({
      month: (v: number) => new Date(2000, v - 1, 1).toLocaleDateString(i18n.language, { month: 'short' }),
      // 2024-01-07 was a Sunday, so index 0 lands correctly.
      weekday: (v: number) => new Date(2024, 0, 7 + v).toLocaleDateString(i18n.language, { weekday: 'short' }),
    }),
    [i18n.language],
  )

  const result = useMemo(() => {
    if (!expression.trim()) return null
    try {
      const spec = parseCron(expression)
      return {
        ok: true as const,
        spec,
        description: describeCron(spec, formatters),
        runs: nextRuns(spec, new Date(), RUN_COUNT),
      }
    } catch (e) {
      if (e instanceof CronError) return { ok: false as const, code: e.code, field: e.field, token: e.token }
      return { ok: false as const, code: 'syntax' as const, field: undefined, token: undefined }
    }
  }, [expression, formatters])

  const sentence = result?.ok
    ? result.description.map(part => t(`cronExplainer.describe.${part.key}`, part.params)).join(t('cronExplainer.joiner'))
    : ''

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <ToolShell
      icon={<CalendarClock size={20} />}
      color={TOOL.color}
      title={t('tools.cronExplainer.name')}
      subtitle={t('tools.cronExplainer.description')}
      info={{
        input: t('tools.cronExplainer.info.input'),
        process: t('tools.cronExplainer.info.process'),
        output: t('tools.cronExplainer.info.output'),
      }}
    >
      <Panel title={t('cronExplainer.inputTitle')}>
        <div className="space-y-4">
          <Field label={t('cronExplainer.expressionLabel')} hint={t('cronExplainer.expressionHint')}>
            {props => (
              <TextInput
                {...props}
                mono
                value={expression}
                onChange={e => setExpression(e.target.value)}
                placeholder="*/15 9-17 * * 1-5"
                spellCheck={false}
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map(preset => (
              <ActionButton key={preset} onClick={() => setExpression(preset)} className="font-mono">
                {preset}
              </ActionButton>
            ))}
          </div>

          {result && !result.ok && (
            <ErrorNote>
              {t(`cronExplainer.errors.${result.code}`, {
                field: result.field ? t(`cronExplainer.fields.${result.field}`) : '',
                token: result.token ?? '',
              })}
            </ErrorNote>
          )}
        </div>
      </Panel>

      {result?.ok && (
        <>
          <Panel title={t('cronExplainer.meaningTitle')}>
            <p className="fs-lg font-display font-semibold prose-measure" style={{ color: 'var(--text)' }}>
              {sentence}
            </p>
            {result.spec.macro && (
              <p className="fs-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                {t('cronExplainer.macroExpands', { macro: result.spec.macro, expression: CRON_MACROS[result.spec.macro] })}
              </p>
            )}
          </Panel>

          <Panel title={t('cronExplainer.fieldsTitle')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {FIELD_ORDER.map(name => {
                const field = result.spec.fields[name]
                const values = field.isEvery
                  ? t('cronExplainer.allValues')
                  : field.values.length > 6
                    ? `${field.values.slice(0, 6).join(', ')}…`
                    : field.values.join(', ')
                return (
                  <StatTile
                    key={name}
                    label={t(`cronExplainer.fields.${name}`)}
                    value={field.raw}
                    title={values}
                  />
                )
              })}
            </div>
            <dl className="mt-3 grid gap-1.5 fs-xs" style={{ color: 'var(--text-muted)' }}>
              {FIELD_ORDER.map(name => {
                const field = result.spec.fields[name]
                return (
                  <div key={name} className="flex flex-wrap gap-2">
                    <dt className="min-w-[7rem]">{t(`cronExplainer.fields.${name}`)}</dt>
                    <dd className="font-mono" style={{ color: 'var(--text-subtle)' }}>
                      {field.isEvery
                        ? t('cronExplainer.allValues')
                        : field.values.length > 20
                          ? `${field.values.slice(0, 20).join(', ')}…`
                          : field.values.join(', ')}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </Panel>

          <Panel title={t('cronExplainer.nextRunsTitle')}>
            {result.runs.length === 0 ? (
              <p className="fs-sm" style={{ color: 'var(--text-subtle)' }}>{t('cronExplainer.neverRuns')}</p>
            ) : (
              <>
                <ol className="space-y-1.5">
                  {result.runs.map((run, i) => (
                    <li
                      key={run.toISOString()}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border px-3 py-2"
                      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
                    >
                      <span className="font-mono fs-sm" style={{ color: 'var(--text)' }}>
                        {run.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span className="fs-xs" style={{ color: 'var(--text-subtle)' }}>
                        {i === 0 ? t('cronExplainer.next') : t('cronExplainer.thenNth', { n: i + 1 })}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="fs-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  {t('cronExplainer.timezoneNote', { zone: timeZone })}
                </p>
              </>
            )}
          </Panel>
        </>
      )}
    </ToolShell>
  )
}
