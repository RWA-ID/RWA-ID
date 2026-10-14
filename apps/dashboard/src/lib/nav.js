// Tiny client-side router: the app routes on pathname, so in-app links push
// state and fire popstate instead of reloading.
export function navigate(to) {
  const url = new URL(to, window.location.href)
  if (url.origin !== window.location.origin) { window.location.href = to; return }
  window.history.pushState({}, '', url.pathname + url.search + url.hash)
  window.dispatchEvent(new PopStateEvent('popstate'))
  if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView()
  else window.scrollTo(0, 0)
}

/** onClick for an <a href> that should route in-app (keeps cmd-click working). */
export function linkTo(e) {
  const href = e.currentTarget.getAttribute('href')
  if (!href || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  if (href.startsWith('#')) return
  if (/^(https?:|mailto:)/.test(href)) return
  e.preventDefault()
  navigate(href)
}

export const GITHUB = 'https://github.com/RWA-ID/RWA-ID'
export const WHITEPAPER = 'https://github.com/RWA-ID/RWA-ID/blob/main/whitepaper.md'
export const CONTACT = 'partner@rwa-id.com'
export const X_URL = 'https://x.com/rwaidentity'
