/**
 * Namespaces reserved on RWAIDv4 at deploy, and the platform token buckets
 * that go with them (one bucket per slug in RWAIDPlatformUnlock).
 *
 * Every slug is held at PLACEHOLDER — an address nobody controls — until the
 * real company is verified. The Safe then calls reserveNamespace(slug,
 * theirWallet, duration) so only they can create the project, and activates
 * the bucket once they have.
 *
 * Reserving a name is not a claim of partnership. Don't present any of these
 * as "<company>'s allocation" publicly until that company has signed on, and
 * show DISCLAIMER wherever the list or the logos appear.
 *
 * Logos: apps/dashboard/public/reserved/<logo>, 128px PNGs taken from each
 * company's own site icon or official X avatar (2026-10-13). Rasterised on
 * purpose: a third-party SVG is never served from our origin.
 *
 * Slug rules (RWAIDv4): 3-32 chars, a-z 0-9 and inner hyphens, no "--" in
 * positions 3-4.
 */

const PLACEHOLDER = "0x0000000000000000000000000000000000000001";

const DISCLAIMER =
  "These namespaces are held to protect the companies named from impersonation. " +
  "A reservation does not mean the company is affiliated with, endorses, or has partnered with RWA ID. " +
  "Company names and logos are trademarks of their respective owners and are shown only to identify " +
  "who each namespace is held for. If you represent one of these companies, email partner@rwa-id.com " +
  "and the multisig will assign the namespace to your wallet.";

// [slug, company, domain, logo]
const GROUPS = {
  // Carried over from the v3 mainnet reservations (2026-08-01).
  "Institutional / securities": [
    ["securitize", "Securitize", "securitize.io", "securitize.png"],
    ["ondo", "Ondo Finance", "ondo.finance", "ondo.png"],
    ["superstate", "Superstate", "superstate.com", "superstate.png"],
    ["backed", "Backed Finance", "backed.fi", "backed.png"],
    ["archax", "Archax", "archax.com", "archax.png"],
  ],
  "Credit / lending": [
    ["centrifuge", "Centrifuge", "centrifuge.io", "centrifuge.png"],
    ["maple", "Maple Finance", "maple.finance", "maple.png"],
    ["goldfinch", "Goldfinch", "goldfinch.finance", "goldfinch.png"],
    ["credix", "Credix", "credix.finance", "credix.png"],
    ["clearpool", "Clearpool", "clearpool.finance", "clearpool.png"],
  ],
  "Real estate": [
    ["realt", "RealT", "realt.co", "realt.png"],
    ["lofty", "Lofty", "lofty.ai", "lofty.png"],
    ["propy", "Propy", "propy.com", "propy.png"],
    ["homebase", "Homebase", "homebasedao.io", "homebase.png"],
    ["tangible", "Tangible", "tangible.store", "tangible.png"],
  ],
  "Infrastructure / compliance": [
    ["polymesh", "Polymesh", "polymesh.network", "polymesh.png"],
    ["tokeny", "Tokeny", "tokeny.com", "tokeny.png"],
    ["realio", "Realio", "realio.network", "realio.png"],
    ["defactor", "Defactor", "defactor.com", "defactor.png"],
    ["fasset", "Fasset", "fasset.io", "fasset.png"],
  ],
  "Commodities / funds": [
    ["openeden", "OpenEden", "openeden.com", "openeden.png"],
    ["swarm", "Swarm", "swarm.com", "swarm.png"],
    ["bitbond", "Bitbond", "bitbond.com", "bitbond.png"],
    ["finblox", "Finblox", "finblox.com", "finblox.png"],
    ["parcl", "Parcl", "parcl.co", "parcl.png"],
  ],

  // New for Robinhood Chain (2026-10-13).
  Robinhood: [
    ["robinhood", "Robinhood", "robinhood.com", "robinhood.png"],
    ["robinhoodchain", "Robinhood", "robinhood.com", "robinhood.png"],
    ["robinhood-chain", "Robinhood", "robinhood.com", "robinhood.png"],
    ["hood", "Robinhood", "robinhood.com", "robinhood.png"],
  ],
  // Robinhood Chain launch infrastructure: stablecoin, custody, lending.
  "Robinhood Chain infrastructure": [
    ["paxos", "Paxos", "paxos.com", "paxos.png"],
    ["bitgo", "BitGo", "bitgo.com", "bitgo.png"],
    ["morpho", "Morpho", "morpho.org", "morpho.png"],
  ],
  // Stock-token and RWA trading venues live on Robinhood Chain.
  "Robinhood Chain markets": [
    ["arcus", "Arcus", "arcus.xyz", "arcus.png"],
    ["lighter", "Lighter", "lighter.xyz", "lighter.png"],
    ["rialto", "Rialto", "rialto.xyz", "rialto.png"],
    ["meridian", "Meridian", "meridian.xyz", "meridian.png"],
  ],
};

const RESERVED = Object.entries(GROUPS).flatMap(([group, rows]) =>
  rows.map(([slug, company, domain, logo]) => ({ slug, company, domain, logo, group }))
);
const SLUGS = RESERVED.map((r) => r.slug);

module.exports = { PLACEHOLDER, DISCLAIMER, GROUPS, RESERVED, SLUGS };
