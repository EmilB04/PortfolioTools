import { DASHBOARD_TOOLS } from './registry.ts'

export function getSearchableTools(t: (key: string) => string) {
  return DASHBOARD_TOOLS.map(tool => ({
    ...tool,
    title: t(`tools.${tool.key}.name`),
    description: t(`tools.${tool.key}.summary`),
    badge: t(`tools.${tool.key}.badge`),
    keywords: t(`tools.${tool.key}.keywords`),
    categoryLabel: t(`nav.categories.${tool.category}`),
    searchText: [t(`tools.${tool.key}.description`), t(`nav.categories.${tool.category}`), tool.category].join(' '),
  }))
}

export function searchTools(query: string, tools: ReturnType<typeof getSearchableTools>) {
  return tools.map(tool => ({ ...tool, score: rankTool(query, tool.title, tool.searchText, tool.badge, tool.keywords) }))
    .filter(tool => tool.score >= 0)
    .sort((a, b) => b.score - a.score)
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Match every query term; prioritize tool names over descriptions and aliases. */
export function rankTool(query: string, title: string, searchText: string, badge = '', keywords = ''): number {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return 0
  const normalizedTitle = normalize(title)
  const normalizedKeywords = normalize(keywords)
  const text = normalize(`${title} ${searchText} ${badge} ${keywords}`)
  const terms = normalizedQuery.split(/\s+/)
  if (!terms.every(term => text.includes(term))) return -1
  if (normalizedTitle === normalizedQuery) return 100
  if (normalizedTitle.startsWith(normalizedQuery)) return 80
  if (normalizedTitle.includes(normalizedQuery)) return 60
  return terms.reduce((score, term) => score + (
    normalizedTitle.includes(term) ? 10 : normalizedKeywords.includes(term) ? 5 : 1
  ), 0)
}
