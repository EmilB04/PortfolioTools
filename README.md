<h1 align="center">PortfolioTools</h1>

<p align="center"><strong>A toolbox in your browser.</strong><br />
Handy tools for files, development, dates, networks, QR codes, accessibility and everyday tasks.</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Pages" />
  <img src="https://img.shields.io/badge/Languages-NO%20%2F%20EN-785A85" alt="Norwegian and English" />
</p>

## Find a tool fast

The landing page opens a Spotlight-style search. Search by tool name, format or task, for example `format JSON`, `shrink image` or `UUID`, or browse the six categories. Names and task aliases rank ahead of incidental description matches.

| Key | Action |
| --- | --- |
| <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> | Open search from any tool page |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Select a result |
| <kbd>Enter</kbd> | Open the selected tool |
| <kbd>Esc</kbd> | Close and return focus |

Search opens over the current page without navigating. Category filters stay in the URL, and existing `?q=…` and `?focus=search` links still open the search window.

## What's in the box

JSON tools, JWT decoder, regex tester, cron explainer, encoders and hashes, ID and password generators, file converter and compressor, QR generator and reader, screenshot annotator, timestamp converter, subnet calculator, speed test, WCAG scanner and more. Most tools process data locally in your browser. Speed tests use Cloudflare's network endpoints, and website accessibility scans use the scanning API.

## Design

PortfolioTools shares PortfolioPortal and PortfolioV2's Terreng direction: peat and ivory surfaces, a fixed amber accent, organic card shapes, subtle contour lines, Bricolage Grotesque and Newsreader, all served locally. Light, dark and system modes share one palette.

## Run locally

```bash
npm install
npm run dev
npm run lint
npm run build
```

## SEO and accessibility

`npm run build` generates a separate HTML file for every registered tool with its own title, description, canonical URL, social metadata and structured data. Each page has a visible intro and crawlable links before JavaScript runs. The build also writes `robots.txt`, `sitemap.xml` and a `404.html` fallback, and unknown routes are marked `noindex`.

After a build, run `npm run check:seo` to verify metadata, links, structured data and route coverage. Pass a local Pages URL to also check HTTP responses: `npm run check:seo -- http://127.0.0.1:8789`.

Interactive tools need JavaScript. Tool pages load on demand, so the landing page never downloads file conversion, OCR or chart libraries upfront. Keyboard users get a skip link, controls have labels or accessible names, and selection buttons expose their state.

## Adding a tool

Register it in `src/tools/registry.ts`, the source for dashboard and navigation entries, and add its `name`, `summary`, `description`, `badge` and `keywords` to both locale files.

## Built with

React · TypeScript · Vite · Tailwind CSS · Framer Motion · Cloudflare Pages Functions

---

Created by [Emil Berglund](https://github.com/EmilB04)
