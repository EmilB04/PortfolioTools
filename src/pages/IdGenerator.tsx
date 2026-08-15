import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Tags } from 'lucide-react'
import {
  ActionButton,
  CopyButton,
  Field,
  OutputBlock,
  Panel,
  SegmentedControl,
  TextInput,
  ToolShell,
} from '../components/tools/ToolUI'
import { ID_GENERATORS, timestampFromId } from '../lib/tools/ids'
import type { IdKind } from '../lib/tools/ids'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.idGenerator

const KINDS: IdKind[] = ['uuidv4', 'uuidv7', 'ulid', 'nanoid', 'short']
const MAX_COUNT = 500

export function IdGenerator() {
  const { t, i18n } = useTranslation()
  const [kind, setKind] = useState<IdKind>('uuidv4')
  const [count, setCount] = useState(10)
  const [uppercase, setUppercase] = useState(false)
  const [ids, setIds] = useState<string[]>([])

  const generate = useCallback(() => {
    const generator = ID_GENERATORS[kind]
    setIds(Array.from({ length: count }, () => generator()))
  }, [kind, count])

  useEffect(() => { generate() }, [generate])

  const shown = useMemo(
    () => (uppercase ? ids.map(id => id.toUpperCase()) : ids),
    [ids, uppercase],
  )

  const firstTimestamp = ids[0] ? timestampFromId(kind, ids[0]) : null

  return (
    <ToolShell
      icon={<Tags size={20} />}
      color={TOOL.color}
      title={t('tools.idGenerator.name')}
      subtitle={t('tools.idGenerator.description')}
      info={{
        input: t('tools.idGenerator.info.input'),
        process: t('tools.idGenerator.info.process'),
        output: t('tools.idGenerator.info.output'),
      }}
      privacyNote={t('idGenerator.privacyNote')}
    >
      <Panel
        title={t('idGenerator.settingsTitle')}
        actions={
          <ActionButton variant="primary" icon={<RefreshCw size={13} />} onClick={generate}>
            {t('idGenerator.regenerate')}
          </ActionButton>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
              {t('idGenerator.kindLabel')}
            </span>
            <SegmentedControl
              label={t('idGenerator.kindLabel')}
              value={kind}
              onChange={setKind}
              options={KINDS.map(k => ({ value: k, label: t(`idGenerator.kinds.${k}`) }))}
            />
            <p className="fs-xs prose-measure" style={{ color: 'var(--text-muted)' }}>
              {t(`idGenerator.kindHints.${kind}`)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('idGenerator.countLabel')} hint={t('idGenerator.countHint', { max: MAX_COUNT })}>
              {props => (
                <TextInput
                  {...props}
                  type="number"
                  min={1}
                  max={MAX_COUNT}
                  value={count}
                  onChange={e => {
                    const next = Number(e.target.value)
                    setCount(Number.isFinite(next) ? Math.min(MAX_COUNT, Math.max(1, Math.trunc(next))) : 1)
                  }}
                />
              )}
            </Field>

            <div className="flex items-end">
              <label
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 fs-sm"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={e => setUppercase(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                  style={{ accentColor: TOOL.color }}
                />
                {t('idGenerator.uppercase')}
              </label>
            </div>
          </div>

          {firstTimestamp && !Number.isNaN(firstTimestamp.getTime()) && (
            <p className="fs-xs" style={{ color: 'var(--text-muted)' }}>
              {t('idGenerator.embeddedTime', { date: firstTimestamp.toLocaleString(i18n.language) })}
            </p>
          )}
        </div>
      </Panel>

      <Panel
        title={t('idGenerator.resultTitle')}
        actions={<CopyButton value={shown.join('\n')} label={t('idGenerator.copyAll')} />}
      >
        <div className="space-y-4">
          {shown.length > 0 && (
            <div className="space-y-1.5">
              <span className="block fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                {t('idGenerator.firstLabel')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <code
                  className="flex-1 break-all rounded-xl border px-3 py-2.5 font-mono fs-sm"
                  style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {shown[0]}
                </code>
                <CopyButton value={shown[0]} />
              </div>
            </div>
          )}

          <OutputBlock
            label={t('idGenerator.listLabel', { count: shown.length })}
            value={shown.join('\n')}
            rows={12}
          />
        </div>
      </Panel>
    </ToolShell>
  )
}
