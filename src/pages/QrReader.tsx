import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, ScanQrCode, Upload, X } from 'lucide-react'
import {
  ActionButton,
  ErrorNote,
  OutputBlock,
  Panel,
  ToolShell,
} from '../components/tools/ToolUI'
import { decodeQrFromFile, looksLikeUrl } from '../lib/tools/qrReader'
import { TOOLS_BY_KEY } from '../tools/registry'

const TOOL = TOOLS_BY_KEY.qrReader

type Status = 'idle' | 'decoding' | 'done' | 'error'

export function QrReader() {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState('')
  const [errorKey, setErrorKey] = useState<'noQr' | 'badFile' | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setErrorKey('badFile')
      setStatus('error')
      return
    }
    setFile(f)
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f) })
    setResult('')
    setErrorKey(null)
    setStatus('decoding')

    decodeQrFromFile(f)
      .then(decoded => { setResult(decoded.text); setStatus('done') })
      .catch(() => { setErrorKey('noQr'); setStatus('error') })
  }, [])

  const clear = useCallback(() => {
    setFile(null)
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setResult('')
    setErrorKey(null)
    setStatus('idle')
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const isUrl = status === 'done' && looksLikeUrl(result)

  return (
    <ToolShell
      icon={<ScanQrCode size={20} />}
      color={TOOL.color}
      width="medium"
      title={t('tools.qrReader.name')}
      subtitle={t('tools.qrReader.description')}
      privacyNote={t('qrReader.privacyNote')}
      info={{
        input: t('tools.qrReader.info.input'),
        process: t('tools.qrReader.info.process'),
        output: t('tools.qrReader.info.output'),
      }}
    >
      <Panel title={t('qrReader.imageTitle')} actions={file && (
        <ActionButton variant="ghost" icon={<X size={13} />} onClick={clear}>
          {t('qrReader.clear')}
        </ActionButton>
      )}>
        {!file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDropActive(true) }}
            onDragLeave={() => setDropActive(false)}
            onDrop={e => {
              e.preventDefault()
              setDropActive(false)
              const f = e.dataTransfer.files[0]
              if (f) loadFile(f)
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-16 px-6 cursor-pointer transition-colors"
            style={{
              background: 'var(--surface-card)',
              borderColor: dropActive ? 'var(--tool)' : 'var(--border)',
            }}
          >
            <Upload size={32} className="tool-text" style={{ opacity: 0.8 }} />
            <p className="fs-sm font-semibold" style={{ color: 'var(--text)' }}>
              {t('qrReader.dropTitle')}
            </p>
            <p className="fs-xs text-center max-w-sm" style={{ color: 'var(--text-subtle)' }}>
              {t('qrReader.dropHint')}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={t('qrReader.previewAlt')}
                className="max-h-64 rounded-xl border object-contain"
                style={{ borderColor: 'var(--border)' }}
              />
            )}
            {status === 'decoding' && (
              <p className="fs-xs" style={{ color: 'var(--text-subtle)' }}>{t('qrReader.decoding')}</p>
            )}
          </div>
        )}
      </Panel>

      {errorKey && <ErrorNote>{t(`qrReader.errors.${errorKey}`)}</ErrorNote>}

      {status === 'done' && (
        <Panel
          title={t('qrReader.resultTitle')}
          actions={isUrl && (
            <ActionButton
              variant="outline"
              icon={<ExternalLink size={13} />}
              onClick={() => window.open(result, '_blank', 'noopener,noreferrer')}
            >
              {t('qrReader.openLink')}
            </ActionButton>
          )}
        >
          <OutputBlock label={t('qrReader.decodedLabel')} value={result} rows={4} />
        </Panel>
      )}
    </ToolShell>
  )
}
