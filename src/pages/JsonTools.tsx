import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Braces, Eraser, Minimize2, Wand2, ArrowDownAZ } from 'lucide-react'
import {
  ActionButton,
  ErrorNote,
  Field,
  OutputBlock,
  Panel,
  SegmentedControl,
  StatTile,
  TextArea,
  TextInput,
  ToolShell,
} from '../components/tools/ToolUI'
import { JsonPathError, countNodes, locateJsonError, maxDepth, queryJsonPath, sortKeysDeep } from '../lib/tools/jsonPath'
import type { Json } from '../lib/tools/jsonPath'
import { TOOLS_BY_KEY } from '../tools/registry'

type Shape = 'pretty' | 'minified' | 'sorted'
type IndentWidth = '2' | '4' | 'tab'

const TOOL = TOOLS_BY_KEY.jsonTools

const SAMPLE = `{
  "service": "billing-api",
  "replicas": 3,
  "env": [
    { "name": "LOG_LEVEL", "value": "info" },
    { "name": "REGION", "value": "eu-north-1" }
  ]
}`

export function JsonTools() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [shape, setShape] = useState<Shape>('pretty')
  const [indent, setIndent] = useState<IndentWidth>('2')
  const [path, setPath] = useState('')

  const parsed = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return { ok: true as const, value: null as Json | null }
    try {
      return { ok: true as const, value: JSON.parse(trimmed) as Json }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return { ok: false as const, message, at: locateJsonError(trimmed, message) }
    }
  }, [input])

  const indentValue = indent === 'tab' ? '\t' : Number(indent)

  const output = useMemo(() => {
    if (!parsed.ok || parsed.value === null) return ''
    const value = shape === 'sorted' ? sortKeysDeep(parsed.value) : parsed.value
    return shape === 'minified' ? JSON.stringify(value) : JSON.stringify(value, null, indentValue)
  }, [parsed, shape, indentValue])

  const query = useMemo(() => {
    if (!parsed.ok || parsed.value === null || !path.trim()) return null
    try {
      const matches = queryJsonPath(parsed.value, path)
      return { ok: true as const, matches, text: JSON.stringify(matches, null, indentValue) }
    } catch (e) {
      const code = e instanceof JsonPathError ? e.code : 'syntax'
      return { ok: false as const, code }
    }
  }, [parsed, path, indentValue])

  const stats = useMemo(() => {
    if (!parsed.ok || parsed.value === null) return null
    return {
      nodes: countNodes(parsed.value),
      depth: maxDepth(parsed.value),
      bytes: new TextEncoder().encode(input).length,
      minifiedBytes: new TextEncoder().encode(JSON.stringify(parsed.value)).length,
    }
  }, [parsed, input])

  return (
    <ToolShell
      icon={<Braces size={20} />}
      color={TOOL.color}
      width="wide"
      title={t('tools.jsonTools.name')}
      subtitle={t('tools.jsonTools.description')}
      privacyNote={t('toolCommon.localOnly')}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t('jsonTools.inputTitle')}
          actions={
            <>
              <ActionButton icon={<Wand2 size={13} />} onClick={() => setInput(SAMPLE)}>
                {t('toolCommon.sample')}
              </ActionButton>
              <ActionButton icon={<Eraser size={13} />} onClick={() => setInput('')} disabled={!input}>
                {t('toolCommon.clear')}
              </ActionButton>
            </>
          }
        >
          <div className="space-y-3">
            <Field label={t('jsonTools.inputLabel')}>
              {props => (
                <TextArea
                  {...props}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  rows={16}
                  placeholder={t('jsonTools.inputPlaceholder')}
                />
              )}
            </Field>

            {!parsed.ok && (
              <ErrorNote>
                {parsed.at
                  ? t('jsonTools.parseErrorAt', { line: parsed.at.line, column: parsed.at.column, message: parsed.message })
                  : t('jsonTools.parseError', { message: parsed.message })}
              </ErrorNote>
            )}

            {stats && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label={t('jsonTools.stats.nodes')} value={stats.nodes.toLocaleString()} />
                <StatTile label={t('jsonTools.stats.depth')} value={String(stats.depth)} />
                <StatTile label={t('jsonTools.stats.size')} value={`${stats.bytes.toLocaleString()} B`} />
                <StatTile label={t('jsonTools.stats.minified')} value={`${stats.minifiedBytes.toLocaleString()} B`} />
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={t('jsonTools.outputTitle')}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <SegmentedControl
                  label={t('jsonTools.shapeLabel')}
                  value={shape}
                  onChange={setShape}
                  options={[
                    { value: 'pretty', label: t('jsonTools.shapePretty') },
                    { value: 'minified', label: t('jsonTools.shapeMinified') },
                    { value: 'sorted', label: t('jsonTools.shapeSorted') },
                  ]}
                />
                <SegmentedControl
                  label={t('jsonTools.indentLabel')}
                  value={indent}
                  onChange={setIndent}
                  options={[
                    { value: '2', label: t('jsonTools.indentSpaces', { count: 2 }) },
                    { value: '4', label: t('jsonTools.indentSpaces', { count: 4 }) },
                    { value: 'tab', label: t('jsonTools.indentTab') },
                  ]}
                />
              </div>

              <OutputBlock
                label={t('jsonTools.outputLabel')}
                value={output}
                rows={14}
                placeholder={t('jsonTools.outputPlaceholder')}
                extraActions={
                  <ActionButton
                    icon={shape === 'sorted' ? <ArrowDownAZ size={13} /> : <Minimize2 size={13} />}
                    onClick={() => setShape(shape === 'minified' ? 'pretty' : 'minified')}
                    disabled={!output}
                  >
                    {shape === 'minified' ? t('jsonTools.shapePretty') : t('jsonTools.shapeMinified')}
                  </ActionButton>
                }
              />
            </div>
          </Panel>

          <Panel title={t('jsonTools.queryTitle')}>
            <div className="space-y-3">
              <Field label={t('jsonTools.queryLabel')} hint={t('jsonTools.queryHint')}>
                {props => (
                  <TextInput
                    {...props}
                    mono
                    value={path}
                    onChange={e => setPath(e.target.value)}
                    placeholder="$.env[*].name"
                    spellCheck={false}
                  />
                )}
              </Field>

              {query && !query.ok && <ErrorNote>{t(`jsonTools.queryError.${query.code}`)}</ErrorNote>}

              {query?.ok && (
                <>
                  <p className="fs-xs" style={{ color: 'var(--text-subtle)' }}>
                    {t('jsonTools.matchCount', { count: query.matches.length })}
                  </p>
                  <OutputBlock label={t('jsonTools.queryResult')} value={query.text} rows={8} />
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </ToolShell>
  )
}
