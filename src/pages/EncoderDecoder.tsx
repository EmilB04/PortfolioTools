import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, Binary, Eraser } from 'lucide-react'
import {
  ActionButton,
  ErrorNote,
  Field,
  OutputBlock,
  Panel,
  SegmentedControl,
  StatTile,
  TextArea,
  ToolShell,
} from '../components/tools/ToolUI'
import { ENCODERS } from '../lib/tools/encoding'
import type { EncodingMode } from '../lib/tools/encoding'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.encoder

type Direction = 'encode' | 'decode'

const MODES: EncodingMode[] = ['base64', 'base64url', 'url', 'html', 'hex']

export function EncoderDecoder() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<EncodingMode>('base64')
  const [direction, setDirection] = useState<Direction>('encode')
  const [input, setInput] = useState('')

  const result = useMemo(() => {
    if (!input) return { ok: true as const, value: '' }
    try {
      const fn = direction === 'encode' ? ENCODERS[mode].encode : ENCODERS[mode].decode
      return { ok: true as const, value: fn(input) }
    } catch {
      return { ok: false as const }
    }
  }, [input, mode, direction])

  const swap = () => {
    if (result.ok && result.value) setInput(result.value)
    setDirection(d => (d === 'encode' ? 'decode' : 'encode'))
  }

  const bytes = new TextEncoder().encode(input).length
  const outBytes = result.ok ? new TextEncoder().encode(result.value).length : 0

  return (
    <ToolShell
      icon={<Binary size={20} />}
      color={TOOL.color}
      title={t('tools.encoder.name')}
      subtitle={t('tools.encoder.description')}
      info={{
        input: t('tools.encoder.info.input'),
        process: t('tools.encoder.info.process'),
        output: t('tools.encoder.info.output'),
      }}
      privacyNote={t('toolCommon.localOnly')}
    >
      <Panel title={t('encoder.settingsTitle')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
              {t('encoder.schemeLabel')}
            </span>
            <SegmentedControl
              label={t('encoder.schemeLabel')}
              value={mode}
              onChange={setMode}
              options={MODES.map(m => ({ value: m, label: t(`encoder.schemes.${m}`) }))}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block fs-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
              {t('encoder.directionLabel')}
            </span>
            <SegmentedControl
              label={t('encoder.directionLabel')}
              value={direction}
              onChange={setDirection}
              options={[
                { value: 'encode', label: t('encoder.encode') },
                { value: 'decode', label: t('encoder.decode') },
              ]}
            />
          </div>
        </div>
        <p className="fs-xs mt-3 prose-measure" style={{ color: 'var(--text-muted)' }}>
          {t(`encoder.schemeHints.${mode}`)}
        </p>
      </Panel>

      <Panel
        title={t('encoder.inputTitle')}
        actions={
          <>
            <ActionButton icon={<ArrowLeftRight size={13} />} onClick={swap} disabled={!result.ok || !result.value}>
              {t('encoder.swap')}
            </ActionButton>
            <ActionButton icon={<Eraser size={13} />} onClick={() => setInput('')} disabled={!input}>
              {t('toolCommon.clear')}
            </ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={direction === 'encode' ? t('encoder.plainLabel') : t('encoder.encodedLabel')}>
            {props => (
              <TextArea
                {...props}
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={8}
                placeholder={t('encoder.inputPlaceholder')}
              />
            )}
          </Field>

          {!result.ok && <ErrorNote>{t(`encoder.errors.${direction}`, { scheme: t(`encoder.schemes.${mode}`) })}</ErrorNote>}

          <OutputBlock
            label={direction === 'encode' ? t('encoder.encodedLabel') : t('encoder.plainLabel')}
            value={result.ok ? result.value : ''}
            rows={8}
            placeholder={t('encoder.outputPlaceholder')}
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label={t('encoder.stats.inputChars')} value={input.length.toLocaleString()} />
            <StatTile label={t('encoder.stats.inputBytes')} value={bytes.toLocaleString()} />
            <StatTile label={t('encoder.stats.outputChars')} value={(result.ok ? result.value.length : 0).toLocaleString()} />
            <StatTile label={t('encoder.stats.outputBytes')} value={outBytes.toLocaleString()} />
          </div>
        </div>
      </Panel>
    </ToolShell>
  )
}
