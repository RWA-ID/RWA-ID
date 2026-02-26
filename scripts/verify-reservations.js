/**
 * verify-reservations.js — confirm all slug reservations are live on mainnet
 * Run: npx hardhat run scripts/verify-reservations.js --network mainnet
 */
const { ethers } = require("hardhat");

const REGISTRY = "0xD0B565C7134bDB16Fc3b8A9Cb5fdA003C37930c2";

const SLUGS = [
  "securitize", "ondo", "superstate", "backed", "archax",
  "centrifuge", "maple", "goldfinch", "credix", "clearpool",
  "realt", "lofty", "propy", "homebase", "tangible",
  "polymesh", "tokeny", "realio", "defactor", "fasset",
  "openeden", "swarm", "bitbond", "finblox", "parcl",
];

async function main() {
  const registry = await ethers.getContractAt("RWAIDv2", REGISTRY);
  const now = BigInt(Math.floor(Date.now() / 1000));

  console.log("Checking", SLUGS.length, "reservations on mainnet...\n");

  let ok = 0, fail = 0;

  for (const slug of SLUGS) {
    const slugHash = ethers.keccak256(ethers.toUtf8Bytes(slug));
    const reservedTo = await registry.reservedTo(slugHash);
    const expiry     = await registry.reservationExpiry(slugHash);
    const active     = reservedTo !== ethers.ZeroAddress && expiry > now;
    const expiryDate = new Date(Number(expiry) * 1000).toISOString().split("T")[0];

    if (active) {
      console.log(`  ✅ ${slug.padEnd(14)} reserved until ${expiryDate}`);
      ok++;
    } else {
      console.log(`  ❌ ${slug.padEnd(14)} NOT reserved`);
      fail++;
    }
  }

  console.log(`\n${ok}/${SLUGS.length} reserved${fail > 0 ? ` — ${fail} missing` : " — all good"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
