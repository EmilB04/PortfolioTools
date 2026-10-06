# PortfolioTools

A collection of browser-based tools for files, development, dates, networks,
QR codes, accessibility, and everyday tasks.

## Find a tool

The landing page opens a Spotlight-style search window. Results update instantly as you type. Search by a tool name, format, or task (for
example, `format JSON`, `shrink image`, or `UUID`), or browse the six categories.
Tool names and task aliases are ranked ahead of incidental description matches.

- **⌘K / Ctrl+K:** open and focus search from any tool page.
- **↑ / ↓:** select a result.
- **Enter:** open the selected tool.
- **Escape:** close the window and return focus to its opener.
- Search opens over the current page without navigating away. Category filters remain in the URL; existing `?q=…` and `?focus=search` links open the search window.

English and Norwegian both include concise tool summaries and search keywords.
`src/tools/registry.ts` remains the source for dashboard and navigation entries;
add each tool's `name`, `summary`, `description`, `badge`, and `keywords` to both
locale files.

## Design

PortfolioTools shares PortfolioPortal and PortfolioV2's Terreng direction:
peat and ivory surfaces, a fixed amber accent, organic card shapes, subtle
contour lines, Bricolage Grotesque, and Newsreader. Fonts are served locally.
Light, dark, and system appearance modes share this palette; there is no
accent-color setting or stored accent override.

## Development

```sh
npm install
npm run dev
npm run build
npm run lint
```

Most tools process data locally. Speed tests use Cloudflare's network endpoints,
and website accessibility scans use the scanning API.

### SEO and semantics

`npm run build` generates a separate HTML file for every registered tool, with a unique title, description, canonical URL, social metadata, and structured data. Each page includes a visible tool introduction and crawlable toolbox links before JavaScript runs. `src/lib/seo.ts` supplies the same metadata during navigation and language changes; search/filter parameters stay out of canonical URLs.

Run `npm run check:seo` after a build to verify metadata, crawlable links, structured data, and route coverage. Pass a local Cloudflare Pages URL to also check HTTP responses: `npm run check:seo -- http://127.0.0.1:8789`.

The build also generates `robots.txt`, `sitemap.xml`, and a `404.html` fallback. Cloudflare Pages serves the generated HTML at clean URLs and uses the fallback for missing pages. The React wildcard route marks unknown pages `noindex`. Interactive tools need JavaScript; generated introductory content and navigation remain usable without it. Tool pages load on demand so the landing page does not download file conversion, OCR, or chart libraries upfront.

Keyboard users can skip directly to the main content. Controls use associated labels or accessible names, selection buttons expose their state, and enabled buttons have pointer cursors. Disabled buttons retain a disabled cursor.
