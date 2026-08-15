import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Network } from 'lucide-react'
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
import { SubnetError, containsAddress, describeSubnet, splitSubnet } from '../lib/tools/subnet'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.subnetCalculator

const PRESETS = ['10.0.0.0/8', '172.16.0.0/12', '192.168.1.0/24', '10.20.30.0/26', '203.0.113.5/31']

const SPLIT_LIMIT = 128

export function SubnetCalculator() {
  const { t } = useTranslation()
  const [input, setInput] = useState('192.168.1.0/24')
  const [splitPrefix, setSplitPrefix] = useState<number | ''>('')
  const [probe, setProbe] = useState('')

  const result = useMemo(() => {
    if (!input.trim()) return null
    try {
      return { ok: true as const, info: describeSubnet(input) }
    } catch (e) {
      return { ok: false as const, code: e instanceof SubnetError ? e.code : 'format' }
    }
  }, [input])

  const info = result?.ok ? result.info : null

  const splits = useMemo(() => {
    if (!info || splitPrefix === '') return []
    return splitSubnet(info, splitPrefix, SPLIT_LIMIT)
  }, [info, splitPrefix])

  const probeResult = useMemo(() => {
    if (!info || !probe.trim()) return null
    try {
      return containsAddress(info, probe)
    } catch {
      return 'invalid' as const
    }
  }, [info, probe])

  const splitOptions = info
    ? Array.from({ length: Math.min(8, 32 - info.prefix) }, (_, i) => info.prefix + i + 1)
    : []

  return (
    <ToolShell
      icon={<Network size={20} />}
      color={TOOL.color}
      width="wide"
      title={t('tools.subnetCalculator.name')}
      subtitle={t('tools.subnetCalculator.description')}
      info={{
        input: t('tools.subnetCalculator.info.input'),
        process: t('tools.subnetCalculator.info.process'),
        output: t('tools.subnetCalculator.info.output'),
      }}
    >
      <Panel title={t('subnetCalculator.inputTitle')}>
        <div className="space-y-4">
          <Field label={t('subnetCalculator.inputLabel')} hint={t('subnetCalculator.inputHint')}>
            {props => (
              <TextInput
                {...props}
                mono
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="10.20.30.0/24"
                spellCheck={false}
                autoComplete="off"
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map(preset => (
              <ActionButton key={preset} onClick={() => setInput(preset)} className="font-mono">
                {preset}
              </ActionButton>
            ))}
          </div>

          {result && !result.ok && <ErrorNote>{t(`subnetCalculator.errors.${result.code}`)}</ErrorNote>}
        </div>
      </Panel>

      {info && (
        <>
          <Panel title={t('subnetCalculator.summaryTitle')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label={t('subnetCalculator.stats.network')} value={info.cidr} />
              <StatTile label={t('subnetCalculator.stats.netmask')} value={info.netmask} />
              <StatTile label={t('subnetCalculator.stats.usable')} value={info.usableHosts.toLocaleString()} />
              <StatTile label={t('subnetCalculator.stats.total')} value={info.totalAddresses.toLocaleString()} />
            </div>

            <dl className="mt-4 divide-y" style={{ borderColor: 'var(--border)' }}>
              <DataRow label={t('subnetCalculator.rows.address')}>{info.address}</DataRow>
              <DataRow label={t('subnetCalculator.rows.prefix')}>/{info.prefix}</DataRow>
              <DataRow label={t('subnetCalculator.rows.netmask')}>{info.netmask}</DataRow>
              <DataRow label={t('subnetCalculator.rows.wildcard')}>{info.wildcard}</DataRow>
              <DataRow label={t('subnetCalculator.rows.binaryMask')}>{info.binaryMask}</DataRow>
              <DataRow label={t('subnetCalculator.rows.network')}>{info.network}</DataRow>
              <DataRow label={t('subnetCalculator.rows.broadcast')}>{info.broadcast}</DataRow>
              <DataRow label={t('subnetCalculator.rows.hostRange')}>
                {info.firstHost} – {info.lastHost}
              </DataRow>
              <DataRow label={t('subnetCalculator.rows.class')} mono={false}>
                {t('subnetCalculator.classValue', { letter: info.addressClass })}
              </DataRow>
              <DataRow label={t('subnetCalculator.rows.scope')} mono={false}>
                {info.isPrivate ? t('subnetCalculator.private') : t('subnetCalculator.public')}
              </DataRow>
            </dl>

            {info.prefix >= 31 && (
              <p className="fs-xs mt-3 prose-measure" style={{ color: 'var(--text-muted)' }}>
                {t('subnetCalculator.pointToPointNote')}
              </p>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t('subnetCalculator.containsTitle')}>
              <div className="space-y-3">
                <Field label={t('subnetCalculator.containsLabel')} hint={t('subnetCalculator.containsHint')}>
                  {props => (
                    <TextInput
                      {...props}
                      mono
                      value={probe}
                      onChange={e => setProbe(e.target.value)}
                      placeholder="192.168.1.42"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  )}
                </Field>
                {probeResult !== null && (
                  <p
                    role="status"
                    className="rounded-xl border px-3 py-2.5 fs-sm"
                    style={{
                      background: 'var(--surface-card)',
                      borderColor: 'var(--border)',
                      color: probeResult === true ? '#22c55e' : probeResult === false ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {probeResult === 'invalid'
                      ? t('subnetCalculator.errors.address')
                      : probeResult
                        ? t('subnetCalculator.inRange', { cidr: info.cidr })
                        : t('subnetCalculator.outOfRange', { cidr: info.cidr })}
                  </p>
                )}
              </div>
            </Panel>

            <Panel title={t('subnetCalculator.splitTitle')}>
              <div className="space-y-3">
                <Field label={t('subnetCalculator.splitLabel')} hint={t('subnetCalculator.splitHint', { limit: SPLIT_LIMIT })}>
                  {props => (
                    <Select
                      {...props}
                      value={splitPrefix}
                      onChange={e => setSplitPrefix(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <option value="">{t('subnetCalculator.splitNone')}</option>
                      {splitOptions.map(p => (
                        <option key={p} value={p}>
                          /{p} — {t('subnetCalculator.splitCount', { count: 2 ** (p - info.prefix) })}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                {splits.length > 0 && (
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full fs-xs">
                      <caption className="sr-only">{t('subnetCalculator.splitTitle')}</caption>
                      <thead>
                        <tr style={{ color: 'var(--text-subtle)' }}>
                          <th scope="col" className="py-1.5 pr-2 text-left font-medium">{t('subnetCalculator.table.subnet')}</th>
                          <th scope="col" className="py-1.5 text-left font-medium">{t('subnetCalculator.table.range')}</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {splits.map(row => (
                          <tr key={row.cidr} className="border-t" style={{ borderColor: 'var(--border)' }}>
                            <td className="py-1.5 pr-2" style={{ color: 'var(--text)' }}>{row.cidr}</td>
                            <td className="py-1.5" style={{ color: 'var(--text-subtle)' }}>{row.range}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </ToolShell>
  )
}
