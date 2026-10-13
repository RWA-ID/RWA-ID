/**
 * Per-route share cards.
 *
 * The client is a single-page app, so every route is served the same
 * index.html — which means X, Slack, iMessage and every other crawler sees one
 * title and one image for the whole site. Crawlers do not run the bundle, so
 * the only way to differentiate is to rewrite the tags before the HTML leaves
 * the server. index.html carries the default set between the two markers below
 * and this module swaps that block out per path.
 */

export const SITE_URL = "https://rwa-id.com";
const SITE_NAME = "RWA-ID";
const START = "<!--meta:start-->";
const END = "<!--meta:end-->";

type Meta = {
  path: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  /** Set on anything that isn't a real page: the redirects and the 404. */
  noindex?: boolean;
};

const HOME: Meta = {
  path: "/",
  title: "RWA-ID | Identity for real-world asset platforms and client wallets",
  description:
    "Verifiable, ENS-compatible onchain identities for your clients — without touching KYC or internal ID systems. Non-custodial, resolvable on any chain, auditable by anyone.",
  image: "/og/home.png",
  imageAlt:
    "RWA-ID — an identity card reading joe.yourfirm.rwa-id.eth resolving on six chains",
};

/* Both of these only exist to carry old links to the dashboard, so they get a
   card but never an index entry. */
const DASHBOARD: Meta = {
  path: "/console",
  title: "Platform dashboard | RWA-ID",
  description:
    "Allowlists, claim fees, treasury and revocation for your RWA-ID namespace — every control onchain, with no backend to run.",
  image: "/og/dashboard.png",
  imageAlt: "RWA-ID platform dashboard",
  noindex: true,
};

const ROUTES: Meta[] = [
  HOME,
  {
    path: "/privacy",
    title: "Privacy policy | RWA-ID",
    description:
      "Infrastructure only. RWA-ID collects no personal data, performs no KYC, and never custodies funds or assets.",
    image: "/og/privacy.png",
    imageAlt: "RWA-ID privacy policy",
  },
  DASHBOARD,
  { ...DASHBOARD, path: "/claim" },
];

function metaFor(pathname: string): Meta {
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  const known = ROUTES.find((r) => r.path === clean);
  if (known) return known;

  // /claim/:projectId/:cid was shared before the flow moved to the dashboard.
  if (clean.startsWith("/claim/")) return { ...DASHBOARD, path: clean };

  // Anything else is the 404. It keeps the brand card so a mistyped link still
  // previews as RWA-ID, but it canonicalises to itself rather than to the home
  // page — pointing a 404 at "/" is how duplicate-content reports start.
  return {
    ...HOME,
    path: clean,
    title: "Page not found | RWA-ID",
    noindex: true,
  };
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tagsFor(meta: Meta) {
  const url = `${SITE_URL}${meta.path === "/" ? "/" : meta.path}`;
  const image = `${SITE_URL}${meta.image}`;
  const t = escapeAttr(meta.title);
  const d = escapeAttr(meta.description);
  const alt = escapeAttr(meta.imageAlt);

  return [
    `<title>${escapeAttr(meta.title)}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...(meta.noindex ? [`<meta name="robots" content="noindex, follow" />`] : []),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:secure_url" content="${image}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${alt}" />`,
    // Some clients never fall back to og:image, so twitter:image is explicit.
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@rwa_ideth" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${alt}" />`,
  ].join("\n    ");
}

/** Swaps the marker block in index.html for the tags this path deserves. */
export function injectMeta(html: string, pathname: string) {
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start === -1 || end === -1 || end < start) return html;

  return (
    html.slice(0, start + START.length) +
    "\n    " +
    tagsFor(metaFor(pathname)) +
    "\n    " +
    html.slice(end)
  );
}
