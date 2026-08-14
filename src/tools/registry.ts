import {
  Accessibility,
  Binary,
  Braces,
  CalendarClock,
  Clock,
  DoorOpen,
  FileArchive,
  FileInput,
  Fingerprint,
  Gauge,
  ImageDown,
  KeyRound,
  LayoutDashboard,
  Network,
  QrCode,
  Regex,
  ShieldCheck,
  Tags,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The single source of truth for every tool: the sidebar, the dashboard cards and
 * the router all read from here, so adding a tool is one entry plus one route.
 *
 * `nameKey` is implicit — copy lives under `tools.<key>.*` in the locale files,
 * and the category labels under `nav.categories.<category>`.
 */

export type ToolCategory =
  | 'overview'
  | 'developer'
  | 'time'
  | 'network'
  | 'files'
  | 'web'
  | 'utilities'

export interface ToolDefinition {
  key: string
  to: string
  icon: LucideIcon
  category: ToolCategory
  /** Per-tool brand tone. Rendered through `.tool-text` / `.tool-fill`, which
   *  handle the light-theme contrast shift, so vivid values are safe here. */
  color: string
  /** Hidden from the dashboard grid (the dashboard itself). */
  hideOnDashboard?: boolean
}

export const CATEGORY_ORDER: ToolCategory[] = [
  'overview',
  'developer',
  'time',
  'network',
  'files',
  'web',
  'utilities',
]

export const TOOLS: ToolDefinition[] = [
  { key: 'dashboard', to: '/', icon: LayoutDashboard, category: 'overview', color: '#f1376e', hideOnDashboard: true },

  { key: 'jsonTools', to: '/json', icon: Braces, category: 'developer', color: '#38bdf8' },
  { key: 'jwtDecoder', to: '/jwt-decoder', icon: KeyRound, category: 'developer', color: '#f59e0b' },
  { key: 'encoder', to: '/encoder', icon: Binary, category: 'developer', color: '#22d3ee' },
  { key: 'hashGenerator', to: '/hash-generator', icon: Fingerprint, category: 'developer', color: '#a78bfa' },
  { key: 'idGenerator', to: '/id-generator', icon: Tags, category: 'developer', color: '#34d399' },
  { key: 'regexTester', to: '/regex-tester', icon: Regex, category: 'developer', color: '#fb7185' },

  { key: 'cronExplainer', to: '/cron', icon: CalendarClock, category: 'time', color: '#f97316' },
  { key: 'timestampConverter', to: '/timestamp', icon: Clock, category: 'time', color: '#60a5fa' },

  { key: 'subnetCalculator', to: '/subnet', icon: Network, category: 'network', color: '#2dd4bf' },
  { key: 'speedTest', to: '/speed-test', icon: Gauge, category: 'network', color: '#f1376e' },

  { key: 'snapdown', to: '/snapdown', icon: ImageDown, category: 'files', color: '#f59e0b' },
  { key: 'fileConverter', to: '/file-converter', icon: FileInput, category: 'files', color: '#f97316' },
  { key: 'fileCompress', to: '/file-compress', icon: FileArchive, category: 'files', color: '#10b981' },

  { key: 'qrGenerator', to: '/qr-generator', icon: QrCode, category: 'web', color: '#8b5cf6' },
  { key: 'wcagScanner', to: '/wcag-scanner', icon: Accessibility, category: 'web', color: '#14b8a6' },

  { key: 'passwordGenerator', to: '/password-generator', icon: ShieldCheck, category: 'utilities', color: '#c084fc' },
  { key: 'counter', to: '/counter', icon: DoorOpen, category: 'utilities', color: '#3b82f6' },
]

export const TOOLS_BY_KEY: Record<string, ToolDefinition> = Object.fromEntries(
  TOOLS.map(tool => [tool.key, tool]),
)

export interface ToolGroup {
  category: ToolCategory
  tools: ToolDefinition[]
}

export const TOOL_GROUPS: ToolGroup[] = CATEGORY_ORDER.map(category => ({
  category,
  tools: TOOLS.filter(tool => tool.category === category),
})).filter(group => group.tools.length > 0)

/** Cards shown on the dashboard, in registry order. */
export const DASHBOARD_TOOLS = TOOLS.filter(tool => !tool.hideOnDashboard)
