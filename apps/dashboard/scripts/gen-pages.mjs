// Writes the per-route HTML entry points (index.html, docs/, claim/, …).
//
//   node scripts/gen-pages.mjs
//
// Each route is a real HTML file with its own <title>, description and OG card,
// because crawlers and link-preview scrapers never run the SPA. Every entry boots
// the same app, which routes on pathname. vite.config.js lists the entries and
// public/_redirects maps the clean URLs to them.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://rwa-id.com'

export const PAGES = [
  { path: '', card: 'home', title: 'RWA ID — One name, every client', description: 'Give every client wallet on your tokenized-asset platform a readable ENS name like joe.yourplatform.rwa-id.eth. Free namespaces, live on Robinhood Chain. No KYC, no PII.' },
  { path: 'claim', card: 'claim', title: 'Claim your name · RWA ID', description: 'Your platform reserved a readable ENS name for your wallet. Connect the wallet they allowlisted and claim it in one step.' },
  { path: 'console', card: 'console', title: 'Console · RWA ID', description: 'Register your namespace, publish allowlists, sponsor claims and set your NFT artwork. Free to create on Robinhood Chain.' },
  { path: 'names', card: 'claim', title: 'My names · RWA ID', description: 'Point your RWA ID name at your Bitcoin, Solana and other addresses, and add profile details every ENS-aware wallet shows.' },
  { path: 'docs', card: 'docs', title: 'Docs · RWA ID v4.1', description: 'How to issue, resolve and administer RWA ID names: namespaces, Merkle allowlists, USDG fees and sponsorship, on-chain identity NFTs and ENS resolution.' },
  { path: 'terms', card: 'terms', title: 'Terms of Service · RWA ID', description: 'The terms for using RWA ID and its contracts on Robinhood Chain.' },
  { path: 'privacy', card: 'privacy', title: 'Privacy Policy · RWA ID', description: 'What RWA ID does and does not collect: no accounts, no tracking, and no server that stores your data.' },
  { path: 'refunds', card: 'refunds', title: 'Refund Policy · RWA ID', description: 'How claim fees and network costs work on RWA ID, and why on-chain payments are final.' },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function html({ path, card, title, description }) {
  const url = `${ORIGIN}/${path ? `${path}/` : ''}`
  const image = `${ORIGIN}/og/${card}.png`
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="RWA ID" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="${esc(title)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@rwaidentity" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${image}" />

    <meta name="theme-color" content="#F1F1EC" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Turret+Road:wght@700&family=JetBrains+Mono:wght@400;500;700&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
}

for (const page of PAGES) {
  const file = resolve(root, page.path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html(page))
  console.log(`wrote ${page.path || '.'}/index.html`)
}
