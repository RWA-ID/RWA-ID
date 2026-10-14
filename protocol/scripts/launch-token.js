/**
 * launch-token.js — launch RWAIDRH in one transaction via RWAIDLauncher.
 *
 *   npx hardhat run scripts/launch-token.js --network robinhood            # prints the plan, sends nothing
 *   LAUNCH=1 npx hardhat run scripts/launch-token.js --network robinhood   # sends the launch
 *
 * Parameters come from config/token-launch.js (shared with the fork test).
 *
 * Token-order guard: Uniswap sorts the pair by address. The fork rehearsal ran
 * with the token sorting after WETH, which is the overwhelmingly likely case
 * (WETH is 0x0Bd7…). The token's address is predictable (the launcher's first
 * CREATE), so the script checks it first and, in the unlikely other case, burns
 * one deployer nonce with a 0-value self-transfer rather than launch down the
 * branch the rehearsal did not exercise.
 */
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ADDR, build } = require("../config/token-launch");

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (network.name === "robinhood" && chainId !== 4663n) throw new Error(`Expected 4663, got ${chainId}`);

  const block = await ethers.provider.getBlock("latest");
  const { params, ethUsdE6 } = await build(ethers.provider, block.timestamp);

  let nonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
  const predict = (n) => {
    const launcher = ethers.getCreateAddress({ from: deployer.address, nonce: n });
    return { launcher, token: ethers.getCreateAddress({ from: launcher, nonce: 1 }) };
  };
  let p = predict(nonce);

  const fmt = (v) => ethers.formatEther(v).replace(/\.0$/, "");
  console.log(`\nRWAIDRH launch — ${process.env.LAUNCH ? "LIVE" : "plan only"} on ${network.name} (chain ${chainId})`);
  console.log(`  deployer        ${deployer.address}  (${fmt(await ethers.provider.getBalance(deployer.address))} ETH)`);
  console.log(`  ETH/USD         $${(Number(ethUsdE6) / 1e6).toFixed(2)} from the WETH/USDG pool`);
  console.log(`  token           ${params.name} / ${params.symbol}, ${fmt(params.supply)} supply`);
  console.log(`  opening FDV     $100,000  (sqrtPriceX96 ${params.sqrtPriceX96TokenIsToken0} as token0)`);
  console.log(`  liquidity       ${fmt(params.liquidityAmount)} single-sided vs WETH, 1% pool, locked forever, fees → Safe`);
  console.log(`  founder         ${fmt(params.founderAmount)} → ${params.founder}, vests ${new Date(Number(params.vestingStart) * 1000).toISOString().slice(0, 10)} → +36 months`);
  console.log(`  platform        ${fmt(params.bucketAmounts.reduce((a, b) => a + b, 0n))} in ${params.slugs.length} buckets → handover to Safe`);
  console.log(`  Safe            ${params.safe} receives the rest (treasury + open-platform pool)`);
  console.log(`  predicted       launcher ${p.launcher}, token ${p.token} (${BigInt(p.token) > BigInt(ADDR.weth) ? "sorts after WETH ✓" : "sorts BEFORE WETH"})`);

  if (!process.env.LAUNCH) {
    const gas = await ethers.provider.estimateGas(
      await (await ethers.getContractFactory("RWAIDLauncher")).getDeployTransaction(params)
    ).catch((e) => `estimate failed: ${e.shortMessage || e.message}`);
    console.log(`  estimated gas   ${gas}\n\nPlan only. Re-run with LAUNCH=1 to send.\n`);
    return;
  }

  if (BigInt(p.token) <= BigInt(ADDR.weth)) {
    console.log("  token would sort before WETH — burning one nonce with a 0-value self-transfer");
    await (await deployer.sendTransaction({ to: deployer.address, value: 0, nonce })).wait();
    nonce += 1;
    p = predict(nonce);
    if (BigInt(p.token) <= BigInt(ADDR.weth)) throw new Error("Still sorts before WETH; stop and re-check");
  }

  const launcher = await (await ethers.getContractFactory("RWAIDLauncher")).deploy(params, { nonce });
  const receipt = await launcher.deploymentTransaction().wait();
  const address = await launcher.getAddress();
  if (address !== p.launcher) throw new Error(`Launcher at ${address}, expected ${p.launcher}`);

  const out = {
    launchedAt: new Date(Number((await ethers.provider.getBlock(receipt.blockNumber)).timestamp) * 1000).toISOString(),
    block: receipt.blockNumber,
    tx: receipt.hash,
    launcher: address,
    token: await launcher.token(),
    pool: await launcher.pool(),
    positionId: (await launcher.positionId()).toString(),
    lock: await launcher.lock(),
    founderVesting: await launcher.founderVesting(),
    platformUnlock: await launcher.platformUnlock(),
    ethUsdAtLaunch: Number(ethUsdE6) / 1e6,
    params: JSON.parse(JSON.stringify(params, (_, v) => (typeof v === "bigint" ? v.toString() : v))),
  };
  const file = path.join(__dirname, "../deployments/robinhood.json");
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  d.RWAIDRH = out;
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + "\n");

  console.log(`\n  ✓ launched in tx ${receipt.hash} (block ${receipt.blockNumber}, gas ${receipt.gasUsed})`);
  for (const k of ["token", "pool", "positionId", "lock", "founderVesting", "platformUnlock"]) console.log(`    ${k.padEnd(15)} ${out[k]}`);
  console.log(`\nRecorded in deployments/robinhood.json. Next: the Safe calls acceptOwnership() on platformUnlock ${out.platformUnlock}.\n`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
