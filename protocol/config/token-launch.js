/**
 * RWAIDRH launch parameters — the single source for the fork rehearsal and the
 * real launch (scripts/launch-token.js), so the two can never drift apart.
 *
 * Decided 2026-10-13 by Hector:
 *   RWA IDENTITY / RWAIDRH, 50B fixed supply
 *   40% launch liquidity, single-sided vs WETH, Uniswap v3 1% pool, LP locked permanently
 *   20% platform buckets (RWAIDPlatformUnlock, one per reserved namespace)
 *   15% treasury + 15% open-platform pool → the Safe
 *   10% founder → vault.ensgiant.eth, 12-month cliff then 36 months linear
 *   opening FDV $100,000
 */
const { ethers } = require("hardhat");
const { RWAIDv4 } = require("../deployments/robinhood.json");
const { SLUGS } = require("./reserved-namespaces");

const E18 = 10n ** 18n;
const DAY = 86400n;

const ADDR = {
  safe: "0xa28743bD38C9c951910d8FA9812c48ab5CDf75Ab",
  founder: "0x0104c88Ea4f55c26df89F5cd3eC62F3C8288D69b", // vault.ensgiant.eth
  registry: RWAIDv4.address,
  // Uniswap v3 on Robinhood Chain (developers.uniswap.org, verified on-chain 2026-10-13)
  factory: "0x1f7d7550b1b028f7571e69a784071f0205fd2efa",
  positionManager: "0x73991a25c818bf1f1128deaab1492d45638de0d3",
  swapRouter: "0xcaf681a66d020601342297493863e78c959e5cb2",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", // NonfungiblePositionManager.WETH9()
  wethUsdgPool: "0x69BfaF19C9f377BB306a89aEd9F6B07e2c1a8d9a", // 0.05%, WETH = token0, USDG = token1
};

const SUPPLY_WHOLE = 50_000_000_000n;
const FDV_USD = 100_000n;
const FEE = 10000; // 1%

function isqrt(n) {
  if (n < 2n) return n;
  let x = n, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}

/** ETH price in USDG (6 decimals) from the on-chain WETH/USDG pool. */
async function ethUsdE6(provider) {
  const pool = new ethers.Contract(ADDR.wethUsdgPool, ["function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"], provider);
  const [sqrtP] = await pool.slot0();
  // price = USDG_raw per WETH_raw = sqrtP² / 2^192; per whole ETH that is × 1e18.
  return (sqrtP * sqrtP * E18) >> 192n;
}

async function build(provider, now) {
  const ethUsd = await ethUsdE6(provider);
  // WETH_raw per token_raw = FDV / supply / ETHUSD (both tokens have 18 decimals).
  const sqrtPriceX96TokenIsToken0 = isqrt((FDV_USD * 1_000_000n << 192n) / (SUPPLY_WHOLE * ethUsd));

  const supply = SUPPLY_WHOLE * E18;
  const pct = (n) => (supply * BigInt(n)) / 100n;
  const platform = pct(20);
  const perBucket = platform / BigInt(SLUGS.length); // dust (< 36 wei) goes to the Safe

  return {
    ethUsdE6: ethUsd,
    params: {
      name: "RWA IDENTITY",
      symbol: "RWAIDRH",
      supply,
      safe: ADDR.safe,
      founder: ADDR.founder,
      registry: ADDR.registry,
      positionManager: ADDR.positionManager,
      weth: ADDR.weth,
      fee: FEE,
      sqrtPriceX96TokenIsToken0,
      liquidityAmount: pct(40),
      founderAmount: pct(10),
      vestingStart: BigInt(now) + 365n * DAY, // nothing before the 12-month cliff
      vestingDuration: 3n * 365n * DAY, // then linear over 36 months
      claimsForFullUnlock: 10_000n,
      releaseDuration: 730n * DAY,
      activationDeadline: BigInt(now) + 548n * DAY,
      slugs: SLUGS,
      bucketAmounts: SLUGS.map(() => perBucket),
    },
  };
}

module.exports = { ADDR, FEE, FDV_USD, SUPPLY_WHOLE, build, ethUsdE6 };
