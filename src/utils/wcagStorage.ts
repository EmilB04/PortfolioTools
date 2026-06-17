// Local persistence for WCAG scan history. Stored in localStorage so past scans
// survive reloads. Full per-page results are kept so a scan can be re-opened.
export interface ViolationNode { html: string; target: string[]; failureSummary: string }
export interface Violation {
  id: string
  impact: string | null
  help: string
  helpUrl: string
  description: string
  nodes: ViolationNode[]
  nodeCount: number
}
export interface PageResult { url: string; violations: Violation[]; error?: string }

export interface WcagScanEntry {
  id: string
  timestamp: number
  url: string          // start URL of the scan
  maxPages: number
  pages: PageResult[]
  pagesScanned: number
  totalIssues: number
}

const KEY = 'pt-wcag-history'
const MAX = 25

export function loadScans(): WcagScanEntry[] {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function persist(entries: WcagScanEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)))
  } catch {}
}

// Prepends the entry (newest first) and returns the updated list.
export function saveScan(entry: WcagScanEntry): WcagScanEntry[] {
  const next = [entry, ...loadScans()].slice(0, MAX)
  persist(next)
  return next
}

export function deleteScan(id: string): WcagScanEntry[] {
  const next = loadScans().filter(e => e.id !== id)
  persist(next)
  return next
}

export function clearScans(): WcagScanEntry[] {
  persist([])
  return []
}
