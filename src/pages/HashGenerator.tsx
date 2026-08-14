import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eraser, Fingerprint, Upload } from 'lucide-react'
import {
  ActionButton,
  CopyButton,
  ErrorNote,
  Field,
  Panel,
  SegmentedControl,
  TextArea,
  ToolShell,
} from '../components/tools/ToolUI'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.hashGenerator

/** WebCrypto ships SHA-1 and the SHA-2 family; MD5 is deliberately absent. */
const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
type Algorithm = (typeof ALGORITHMS)[number]

type Source = 'text' | 'file'
type Format = 'hex' | 'base64'

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('')
}

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++ }
  return `${value.toFixed(1)} ${units[unit]}`
}

export function HashGenerator() {
  const { t } = useTranslation()
  const [source, setSource] = useState<Source>('text')
  const [format, setFormat] = useState<Format>('hex')
  const [text, setText] = useState('')
  const [file, setFile] = useState<{ name: string; size: number; bytes: ArrayBuffer } | null>(null)
  const [digests, setDigests] = useState<Record<Algorithm, string>>({} as Record<Algorithm, string>)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const compute = useCallback(async (data: BufferSource) => {
    setBusy(true)
    try {
      const entries = await Promise.all(
        ALGORITHMS.map(async algo => [algo, await crypto.subtle.digest(algo, data)] as const),
      )
      setDigests(Object.fromEntries(entries.map(([a, b]) => [a, toHex(b)])) as Record<Algorithm, string>)
      // Keep the raw buffers so switching hex/base64 does not re-hash a large file.
      setRaw(Object.fromEntries(entries) as Record<Algorithm, ArrayBuffer>)
      setError(null)
    } catch {
      setError(t('hashGenerator.errors.digest'))
      setDigests({} as Record<Algorithm, string>)
    } finally {
      setBusy(false)
    }
  }, [t])

  const [raw, setRaw] = useState<Record<Algorithm, ArrayBuffer>>({} as Record<Algorithm, ArrayBuffer>)

  useEffect(() => {
    if (source !== 'text') return
    if (!text) { setDigests({} as Record<Algorithm, string>); setRaw({} as Record<Algorithm, ArrayBuffer>); return }
    compute(new TextEncoder().encode(text))
  }, [text, source, compute])

  useEffect(() => {
    if (source !== 'file' || !file) return
    compute(file.bytes)
  }, [file, source, compute])

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0]
    if (!chosen) return
    // 256 MB is already well past what fits comfortably in a single ArrayBuffer here.
    if (chosen.size > 256 * 1024 * 1024) {
      setError(t('hashGenerator.errors.tooLarge'))
      return
    }
    try {
      setBusy(true)
      const bytes = await chosen.arrayBuffer()
      setFile({ name: chosen.name, size: chosen.size, bytes })
      setError(null)
    } catch {
      setError(t('hashGenerator.errors.read'))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setText('')
    setFile(null)
    setDigests({} as Record<Algorithm, string>)
    setRaw({} as Record<Algorithm, ArrayBuffer>)
    setError(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const display = (algo: Algorithm): string => {
    const buffer = raw[algo]
    if (!buffer) return ''
    return format === 'hex' ? digests[algo] ?? '' : toBase64(buffer)
  }

  const hasResult = ALGORITHMS.some(a => raw[a])

  return (
    <ToolShell
      icon={<Fingerprint size={20} />}
      color={TOOL.color}
      title={t('tools.hashGenerator.name')}
      subtitle={t('tools.hashGenerator.description')}
      privacyNote={t('hashGenerator.privacyNote')}
    >
      <Panel
        title={t('hashGenerator.inputTitle')}
        actions={
          <ActionButton icon={<Eraser size={13} />} onClick={reset} disabled={!text && !file}>
            {t('toolCommon.clear')}
          </ActionButton>
        }
      >
        <div className="space-y-4">
          <SegmentedControl
            label={t('hashGenerator.sourceLabel')}
            value={source}
            onChange={setSource}
            options={[
              { value: 'text', label: t('hashGenerator.sourceText') },
              { value: 'file', label: t('hashGenerator.sourceFile') },
            ]}
            className="sm:max-w-xs"
          />

          {source === 'text' ? (
            <Field label={t('hashGenerator.textLabel')} hint={t('hashGenerator.textHint')}>
              {props => (
                <TextArea
                  {...props}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={6}
                  placeholder={t('hashGenerator.textPlaceholder')}
                />
              )}
            </Field>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="hash-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border-strong)' }}
              >
                <Upload size={20} className="tool-text" aria-hidden="true" />
                <span className="fs-sm font-medium" style={{ color: 'var(--text)' }}>
                  {file ? file.name : t('hashGenerator.chooseFile')}
                </span>
                <span className="fs-xs" style={{ color: 'var(--text-subtle)' }}>
                  {file ? formatBytes(file.size) : t('hashGenerator.fileHint')}
                </span>
              </label>
              <input
                ref={fileInput}
                id="hash-file"
                type="file"
                className="sr-only"
                onChange={onFileChosen}
              />
            </div>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      </Panel>

      <Panel
        title={t('hashGenerator.resultTitle')}
        actions={
          <SegmentedControl
            label={t('hashGenerator.formatLabel')}
            value={format}
            onChange={setFormat}
            options={[
              { value: 'hex', label: t('hashGenerator.formatHex') },
              { value: 'base64', label: t('hashGenerator.formatBase64') },
            ]}
            className="w-40"
          />
        }
      >
        <div role="status" aria-live="polite" className="space-y-3">
          {busy && (
            <p className="fs-sm" style={{ color: 'var(--text-subtle)' }}>{t('hashGenerator.working')}</p>
          )}
          {!busy && !hasResult && (
            <p className="fs-sm" style={{ color: 'var(--text-subtle)' }}>{t('hashGenerator.empty')}</p>
          )}
          {!busy && hasResult && ALGORITHMS.map(algo => (
            <div key={algo} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="fs-xs font-mono font-semibold tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                  {algo}
                </span>
                <CopyButton value={display(algo)} label={t('hashGenerator.copyAlgo', { algo })} />
              </div>
              <p
                className="break-all rounded-xl border px-3 py-2.5 font-mono fs-xs"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                {display(algo)}
              </p>
            </div>
          ))}
          {!busy && hasResult && (
            <p className="fs-xs prose-measure" style={{ color: 'var(--text-muted)' }}>
              {t('hashGenerator.sha1Note')}
            </p>
          )}
        </div>
      </Panel>
    </ToolShell>
  )
}
