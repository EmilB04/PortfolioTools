export interface StoredResult {
  timestamp: number
  download: number
  upload: number
  ping: number
}

const KEY = 'pt-speed-results'
const MAX = 200

export function loadResults(): StoredResult[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveResult(r: StoredResult) {
  try {
    const prev = loadResults()
    const next = [...prev, r].slice(-MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
}

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function todayStats(): { testsRun: number; avgDownload: number | null; avgUpload: number | null } {
  const results = loadResults().filter(r => r.timestamp >= todayStart())
  if (results.length === 0) return { testsRun: 0, avgDownload: null, avgUpload: null }
  const avgDownload = results.reduce((s, r) => s + r.download, 0) / results.length
  const avgUpload = results.reduce((s, r) => s + r.upload, 0) / results.length
  return { testsRun: results.length, avgDownload, avgUpload }
}
