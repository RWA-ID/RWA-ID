// Renders public/og/*.png (1200×630 share cards) from scripts/og-card.html,
// plus the favicon and app icons, with a headless Chromium.
//
// Playwright is not a dependency of this app. Point PLAYWRIGHT at any install of
// playwright or playwright-core, and CHROMIUM at a browser binary if that
// install has none of its own:
//
//   PLAYWRIGHT=/path/to/node_modules/playwright-core/index.mjs \
//   CHROMIUM="$HOME/Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
//   node scripts/render-og.mjs

import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const pw = process.env.PLAYWRIGHT || 'playwright'
const { chromium } = await import(pw.startsWith('/') ? pathToFileURL(pw).href : pw)
const pub = resolve(here, '..', 'public')

const CARDS = ['home', 'claim', 'console', 'docs', 'terms', 'privacy', 'refunds']

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
const source = pathToFileURL(resolve(here, 'og-card.html')).href

for (const card of CARDS) {
  await page.goto(`${source}?card=${card}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  await page.locator('#card').screenshot({ path: `${pub}/og/${card}.png` })
  console.log(`rendered og/${card}.png`)
}

// Icons: the 2c mark, ink on paper for small sizes (legible in a tab strip),
// lime on ink for the app tile.
const ICONS = [
  { file: 'favicon-32.png', size: 32, bg: 'transparent', tone: 'light', pad: 1 },
  { file: 'apple-touch-icon.png', size: 180, bg: '#0B0C0A', tone: 'dark', pad: 34 },
  { file: 'icon-512.png', size: 512, bg: '#0B0C0A', tone: 'dark', pad: 96 },
]
for (const ic of ICONS) {
  const w = ic.size - ic.pad * 2
  const body = ic.tone === 'dark' ? '#CCFF00' : '#0B0C0A'
  const ink = ic.tone === 'dark' ? '#0B0C0A' : '#CCFF00'
  await page.setViewportSize({ width: ic.size, height: ic.size })
  await page.setContent(`<body style="margin:0;background:transparent">
    <div id="i" style="width:${ic.size}px;height:${ic.size}px;background:${ic.bg};display:flex;align-items:center;justify-content:center">
      <div style="position:relative;width:${w}px;height:${Math.round(w * .92)}px">
        <div style="position:absolute;inset:0;background:${body};border-radius:${w * .24}px;clip-path:polygon(0 0,62% 0,100% 40%,100% 100%,0 100%)"></div>
        <div style="position:absolute;right:0;top:0;width:${w * .3}px;height:${w * .3}px;border-radius:${w * .08}px;background:#FF5A1F"></div>
        <div style="position:absolute;left:${w * .19}px;top:${w * .19}px;width:${w * .21}px;height:${w * .21}px;border-radius:50%;background:${ink}"></div>
        <div style="position:absolute;left:${w * .19}px;bottom:${w * .19}px;width:${w * .42}px;height:${Math.max(w * .08, 2)}px;border-radius:2px;background:${ink}"></div>
      </div></div></body>`)
  await page.locator('#i').screenshot({ path: `${pub}/${ic.file}`, omitBackground: true })
  console.log(`rendered ${ic.file}`)
}
await browser.close()

// The SVG favicon: the same mark as vector, so it stays sharp at any size.
writeFileSync(`${pub}/favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 92">
<clipPath id="c"><path d="M0 0h62l38 37v55H0z"/></clipPath>
<rect width="100" height="92" rx="24" fill="#0B0C0A" clip-path="url(#c)"/>
<rect x="70" width="30" height="30" rx="8" fill="#FF5A1F"/>
<circle cx="29.5" cy="29.5" r="10.5" fill="#CCFF00"/>
<rect x="19" y="65" width="42" height="8" rx="2" fill="#CCFF00"/>
<style>@media (prefers-color-scheme: dark){rect[rx="24"]{fill:#CCFF00}circle,rect[y="65"]{fill:#0B0C0A}}</style>
</svg>
`)
console.log('wrote favicon.svg')
