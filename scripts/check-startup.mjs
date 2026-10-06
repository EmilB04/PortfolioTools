import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const root = resolve(import.meta.dirname, '..')
const read = path => readFile(resolve(root, path), 'utf8')
const pages = (await readdir(resolve(root, 'dist'))).filter(name => name.endsWith('.html'))
assert.equal(pages.length, 21)
for (const filename of pages) {
  const html = await read(`dist/${filename}`)
  const head = html.slice(0, html.indexOf('</head>'))
  const styles = [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
  assert.equal(styles.length, 1, `${filename}: one render-blocking stylesheet in the head`)
  assert.ok(!/media=|disabled|onload=/.test(styles[0][0]), `${filename}: styles must not wait for JavaScript`)
  assert.ok(head.indexOf('id="initial-theme"') < styles[0].index, `${filename}: theme before CSS and paint`)
  assert.ok(head.includes('id="initial-theme-style"'), `${filename}: initial canvas colors`)
  for (const landmark of ['aside', 'header', 'main', 'footer']) assert.ok(html.includes(`<${landmark}`), `${filename}: styled initial ${landmark}`)
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) await access(resolve(root, `dist${asset}`))
  assert.ok(!html.includes('src="/src/'), `${filename}: no unbuilt image assets`)
}
assert.ok((await read('dist/index.html')).includes('class="directory-card group"'), 'The initial dashboard uses real cards, not a plain directory')

const source = await read('index.html')
const themeScript = source.match(/<script id="initial-theme">([\s\S]*?)<\/script>/)[1]
let cases = 0
for (const consent of [null, 'accepted', 'declined']) {
  for (const preference of [null, 'light', 'dark', 'system', 'invalid']) {
    for (const systemLight of [true, false]) {
      const classes = new Map()
      runInNewContext(themeScript, {
        localStorage: { getItem: key => key === 'cookie-consent' ? consent : preference },
        window: { matchMedia: () => ({ matches: systemLight }) },
        document: { documentElement: { classList: { toggle: (key, value) => classes.set(key, value) } } },
      })
      const light = consent === 'accepted' && ['light', 'dark'].includes(preference) ? preference === 'light' : systemLight
      assert.equal(classes.get('light'), light)
      assert.equal(classes.get('dark'), !light)
      cases++
    }
  }
}
for (const systemLight of [true, false]) {
  const classes = new Map()
  runInNewContext(themeScript, {
    localStorage: { getItem: () => { throw new Error('Storage unavailable') } },
    window: { matchMedia: () => ({ matches: systemLight }) },
    document: { documentElement: { classList: { toggle: (key, value) => classes.set(key, value) } } },
  })
  assert.equal(classes.get('light'), systemLight)
  cases++
}
if (process.argv[2]) {
  const base = new URL(process.argv[2])
  const response = await fetch(base, { headers: { Accept: 'text/html' } })
  assert.equal(response.status, 200)
  const html = await response.text()
  const stylesheet = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/)[1]
  const cssResponse = await fetch(new URL(stylesheet, base), { headers: { Accept: 'text/css,*/*;q=0.1' } })
  assert.equal(cssResponse.status, 200)
  assert.ok(cssResponse.headers.get('content-type').startsWith('text/css'))
  assert.ok((await cssResponse.text()).includes('.directory-card'), 'Dashboard CSS is available without the app module')
  assert.ok(html.includes('class="directory-card group"'))
}
console.log(`Startup checks passed for ${pages.length} HTML pages and ${cases} theme cases${process.argv[2] ? ', including HTML/CSS HTTP responses' : ''}.`)
