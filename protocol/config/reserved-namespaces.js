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
 * as "<company>'s allocation" publicly until that company has signed on.
 *
 * Slug rules (RWAIDv4): 3-32 chars, a-z 0-9 and inner hyphens, no "--" in
 * positions 3-4.
 */

const PLACEHOLDER = "0x0000000000000000000000000000000000000001";

const GROUPS = {
  // Carried over from the v3 mainnet reservations (2026-08-01).
  "Institutional / securities": ["securitize", "ondo", "superstate", "backed", "archax"],
  "Credit / lending": ["centrifuge", "maple", "goldfinch", "credix", "clearpool"],
  "Real estate": ["realt", "lofty", "propy", "homebase", "tangible"],
  "Infrastructure / compliance": ["polymesh", "tokeny", "realio", "defactor", "fasset"],
  "Commodities / funds": ["openeden", "swarm", "bitbond", "finblox", "parcl"],

  // New for Robinhood Chain (2026-10-13).
  Robinhood: ["robinhood", "robinhoodchain", "robinhood-chain", "hood"],
  // Named as Robinhood Chain issuers or launch partners in public reporting;
  // not yet confirmed onchain. Maple (above) is also active there.
  "Robinhood Chain ecosystem": ["paxos", "bitgo", "morpho"],
};

const SLUGS = Object.values(GROUPS).flat();

module.exports = { PLACEHOLDER, GROUPS, SLUGS };
