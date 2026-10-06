import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { getPageSeo, SITE_URL } from '../src/lib/seo.ts'
import { TOOLS } from '../src/tools/registry.ts'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

function renderPage(html: string, pathname: string, body: string) {
  const page = getPageSeo(pathname)
  const e = escapeHtml
  const head = [
    `<title>${e(page.title)}</title>`,
    ...page.meta.map(meta => `<meta data-page-seo ${meta.name ? `name="${meta.name}"` : `property="${meta.property}"`} content="${e(meta.content)}" />`),
    ...(page.canonical ? [`<link data-page-seo rel="canonical" href="${e(page.canonical)}" />`] : []),
    ...(page.structuredData ? [`<script data-page-seo type="application/ld+json">${JSON.stringify(page.structuredData).replace(/</g, '\\u003c')}</script>`] : []),
  ].join('\n    ')
  return html.replace(/<!-- SEO:start -->[\s\S]*?<!-- SEO:end -->/, () => `<!-- SEO:start -->\n    ${head}\n    <!-- SEO:end -->`)
    .replace(/<!-- CONTENT:start -->[\s\S]*?<!-- CONTENT:end -->/, () => `<!-- CONTENT:start -->${body}<!-- CONTENT:end -->`)
}

/** Emit clean URL HTML pages for Cloudflare Pages, plus a genuine 404 fallback. */
export function seoPages(): Plugin {
  let outputDirectory = ''
  let isBuild = false
  let projectRoot = ''
  let devServer: ViteDevServer | undefined
  const assets = new Map<string, string>()
  return {
    name: 'tool-seo-pages',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir)
      projectRoot = config.root
      isBuild = config.command === 'build'
    },
    configureServer(server) { devServer = server },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, context) {
        const url = context.originalUrl ?? (context.path === '/index.html' ? '/' : context.path)
        // Builds render once client asset filenames are known in closeBundle.
        if (isBuild) return html
        const renderer = await devServer!.ssrLoadModule('/src/prerender.tsx') as { renderInitialPage: (url: string) => string }
        return renderPage(html, new URL(url, SITE_URL).pathname, renderer.renderInitialPage(url))
      },
    },
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset') continue
        for (const source of asset.originalFileNames) {
          assets.set(`/${source.replace(`${projectRoot}/`, '')}`, `/${asset.fileName}`)
        }
      }
    },
    async closeBundle() {
      // closeBundle also runs when the dev server closes; only builds have output.
      if (!isBuild) return
      const template = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
      const rendererServer = await createServer({
        configFile: false, root: projectRoot, plugins: [react()],
        // Keep build-time rendering away from the running dev server's optimized dependencies.
        cacheDir: resolve(projectRoot, '.vite/prerender'),
        server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error',
      })
      try {
        const renderer = await rendererServer.ssrLoadModule('/src/prerender.tsx') as { renderInitialPage: (url: string) => string }
        const bodyFor = (path: string) => {
          let body = renderer.renderInitialPage(path)
          for (const [source, destination] of assets) body = body.replaceAll(source, destination)
          return body
        }
        for (const tool of TOOLS) {
          const filename = tool.to === '/' ? 'index.html' : `${tool.to.slice(1)}.html`
          await writeFile(resolve(outputDirectory, filename), renderPage(template, tool.to, bodyFor(tool.to)))
        }
        await writeFile(resolve(outputDirectory, '404.html'), renderPage(template, '/not-found', bodyFor('/not-found')))
      } finally {
        await rendererServer.close()
      }
      await writeFile(resolve(outputDirectory, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
      await writeFile(resolve(outputDirectory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${TOOLS.map(tool => `  <url><loc>${SITE_URL}${tool.to}</loc></url>`).join('\n')}\n</urlset>\n`)
    },
  }
}
