import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = path => readFile(resolve(root, path), 'utf8')
const registry = await read('src/tools/registry.ts')
const tools = [...registry.matchAll(/key: '([^']+)', to: '([^']+)'/g)].map(([, key, path]) => ({ key, path }))
const locale = JSON.parse(await read('src/i18n/locales/en.json'))
const site = 'https://tools.emilb.no'
const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[entity])
const titles = new Set()
const descriptions = new Set()
assert.equal(tools.length, 20, 'Review SEO coverage when adding tools')

function check(html, tool) {
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '')
  const description = decode(html.match(/name="description" content="([^"]*)"/)?.[1] ?? '')
  assert.ok(title && description, `${tool.path}: title and description`)
  assert.equal((html.match(/<title>/g) ?? []).length, 1)
  assert.equal((html.match(/name="description"/g) ?? []).length, 1)
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1)
  assert.ok(html.includes(`rel="canonical" href="${site}${tool.path}"`), `${tool.path}: canonical`)
  assert.ok(html.includes(`property="og:url" content="${site}${tool.path}"`), `${tool.path}: social URL`)
  assert.ok(html.includes('name="robots" content="index, follow"'))
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${tool.path}: one visible main heading`)
  if (tool.key !== 'dashboard') {
    assert.equal(title, `${locale.tools[tool.key].name} | Portfolio Tools`)
    assert.equal(description, locale.tools[tool.key].summary)
    assert.ok(decode(html).includes(locale.tools[tool.key].info.process))
  }
  const schema = JSON.parse(html.match(/type="application\/ld\+json">(.*?)<\/script>/s)?.[1] ?? '{}')
  assert.equal(schema.url, `${site}${tool.path}`)
  assert.equal(schema.description, description)
  assert.equal(schema.inLanguage, 'en')
  assert.equal(schema['@type'], tool.path === '/' ? 'CollectionPage' : 'WebPage')
  assert.ok(html.includes('<noscript>'))
  for (const destination of tools) assert.ok(html.includes(`href="${destination.path}"`), `${tool.path}: crawlable ${destination.path}`)
  assert.ok(/<script type="module"[^>]*src="\/assets\//.test(html), `${tool.path}: client application`)
  return { title, description }
}

for (const tool of tools) {
  const html = await read(`dist/${tool.path === '/' ? 'index' : tool.path.slice(1)}.html`)
  const result = check(html, tool)
  assert.ok(!titles.has(result.title), `${tool.path}: unique title`)
  assert.ok(!descriptions.has(result.description), `${tool.path}: unique description`)
  titles.add(result.title)
  descriptions.add(result.description)
}
const sitemap = await read('dist/sitemap.xml')
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url), tools.map(tool => `${site}${tool.path}`))
assert.ok((await read('dist/robots.txt')).includes(`Sitemap: ${site}/sitemap.xml`))
const missing = await read('dist/404.html')
assert.ok(missing.includes('name="robots" content="noindex, follow"'))
assert.ok(!missing.includes('rel="canonical"'))
assert.equal((missing.match(/<h1[ >]/g) ?? []).length, 1)

// Optional integration check against `wrangler pages dev dist`, which mirrors
// Cloudflare Pages clean URL matching and 404 behavior.
if (process.argv[2]) {
  const base = new URL(process.argv[2])
  for (const tool of tools) {
    const response = await fetch(new URL(`${tool.path}?q=example&category=web`, base))
    assert.equal(response.status, 200, tool.path)
    check(await response.text(), tool)
  }
  const response = await fetch(new URL('/nonexistent-tool', base))
  assert.equal(response.status, 404)
  assert.ok((await response.text()).includes('name="robots" content="noindex, follow"'))
}
console.log(`SEO checks passed for ${tools.length} pages, sitemap, robots.txt, and 404${process.argv[2] ? ' (including HTTP responses)' : ''}.`)
