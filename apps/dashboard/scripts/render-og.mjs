// Renders public/og/*.png from scripts/og-card.html.
//
// There is no local sharp/ImageMagick, so this drives Playwright's headless
// Chromium. Playwright is not a dependency of this app — point PLAYWRIGHT at an
// install that has it, e.g.:
//
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node scripts/render-og.mjs
//
// Cards rendered: home, docs.

import { pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pw = process.env.PLAYWRIGHT || 'playwright'
const { chromium } = await import(pw.startsWith('/') ? pathToFileURL(pw).href : pw)

const source = pathToFileURL(resolve(here, 'og-card.html')).href
const outDir = resolve(here, '..', 'public', 'og')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

for (const card of ['home', 'docs']) {
  await page.goto(`${source}?card=${card}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.locator('#card').screenshot({ path: `${outDir}/${card}.png` })
  console.log(`rendered og/${card}.png`)
}

await browser.close()
