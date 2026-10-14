/**
 * The RWAIDRH launch, rehearsed against live Robinhood Chain state (real
 * Uniswap v3, real WETH, real registry). Runs only on a fork:
 *
 *   FORK_ROBINHOOD=1 npx hardhat test test/RWAIDLauncher.fork.test.js
 */
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { ADDR, FDV_USD, SUPPLY_WHOLE, build } = require("../config/token-launch");
const { SLUGS } = require("../config/reserved-namespaces");

const E18 = 10n ** 18n;
const onFork = !!process.env.FORK_ROBINHOOD;

(onFork ? describe : describe.skip)("RWAIDLauncher (Robinhood Chain fork)", function () {
  this.timeout(600_000);
  let launcher, token, lock, vesting, unlock, npm, pool, cfg, positionId, buyer;

  const npmAbi = [
    "function positions(uint256) view returns (uint96,address,address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256,uint256,uint128,uint128)",
    "function ownerOf(uint256) view returns (address)",
    "function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint256,uint256)",
  ];

  before(async function () {
    [buyer] = await ethers.getSigners();
    await network.provider.send("hardhat_mine", ["0x1"]); // past the fork block
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    cfg = await build(ethers.provider, now);
    launcher = await (await ethers.getContractFactory("RWAIDLauncher")).deploy(cfg.params);
    const receipt = await launcher.deploymentTransaction().wait();
    this.gasUsed = receipt.gasUsed;
    token = await ethers.getContractAt("RWAIDToken", await launcher.token());
    lock = await ethers.getContractAt("RWAIDLiquidityLock", await launcher.lock());
    vesting = await ethers.getContractAt("VestingWallet", await launcher.founderVesting());
    unlock = await ethers.getContractAt("RWAIDPlatformUnlock", await launcher.platformUnlock());
    npm = new ethers.Contract(ADDR.positionManager, npmAbi, ethers.provider);
    pool = new ethers.Contract(await launcher.pool(), ["function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)", "function token0() view returns (address)"], ethers.provider);
    positionId = await launcher.positionId();
    console.log(`      launch gas ${receipt.gasUsed}, ETH at $${Number(cfg.ethUsdE6) / 1e6}, token ${await token.getAddress()}`);
  });

  it("mints exactly 50B RWAIDRH named RWA IDENTITY, and the launcher keeps nothing", async function () {
    expect(await token.name()).to.equal("RWA IDENTITY");
    expect(await token.symbol()).to.equal("RWAIDRH");
    expect(await token.totalSupply()).to.equal(SUPPLY_WHOLE * E18);
    expect(await token.balanceOf(await launcher.getAddress())).to.equal(0n);
  });

  it("splits the supply 40 / 20 / 30 / 10", async function () {
    const supply = SUPPLY_WHOLE * E18;
    const inPool = await token.balanceOf(await launcher.pool());
    expect(inPool).to.be.closeTo((supply * 40n) / 100n, E18); // Uniswap may leave a few wei of rounding
    expect(await token.balanceOf(await unlock.getAddress())).to.be.closeTo((supply * 20n) / 100n, 36n);
    expect(await token.balanceOf(await vesting.getAddress())).to.equal((supply * 10n) / 100n);
    const safe = await token.balanceOf(ADDR.safe);
    expect(safe).to.be.closeTo((supply * 30n) / 100n, E18);
    expect(inPool + safe + (await token.balanceOf(await unlock.getAddress())) + (await token.balanceOf(await vesting.getAddress()))).to.equal(supply);
  });

  it("opens the pool at the $100k FDV price", async function () {
    const [sqrtP] = await pool.slot0();
    const tokenIs0 = (await pool.token0()).toLowerCase() === (await token.getAddress()).toLowerCase();
    // WETH per token, as a float, then the implied FDV in USD.
    const p = (Number(sqrtP) / 2 ** 96) ** 2;
    const wethPerToken = tokenIs0 ? p : 1 / p;
    const fdv = wethPerToken * Number(SUPPLY_WHOLE) * (Number(cfg.ethUsdE6) / 1e6);
    expect(fdv).to.be.closeTo(Number(FDV_USD), Number(FDV_USD) * 0.001);
  });

  it("locks a single-sided position forever: the lock owns it and nobody else can touch it", async function () {
    expect(await npm.ownerOf(positionId)).to.equal(await lock.getAddress());
    const pos = await npm.positions(positionId);
    expect(pos.liquidity).to.be.gt(0n);
    const [, tick] = await pool.slot0();
    const tokenIs0 = pos.token0.toLowerCase() === (await token.getAddress()).toLowerCase();
    if (tokenIs0) expect(pos.tickLower).to.be.gt(tick); else expect(pos.tickUpper).to.be.lte(tick);
    expect(await ethers.provider.getBalance(await launcher.getAddress())).to.equal(0n);
    await expect(npm.connect(buyer).decreaseLiquidity({ tokenId: positionId, liquidity: 1n, amount0Min: 0, amount1Min: 0, deadline: 2n ** 40n }))
      .to.be.reverted;
    // The lock exposes no withdrawal: its only state-changing entry points are collect and onERC721Received.
    const fns = lock.interface.fragments.filter((f) => f.type === "function" && f.stateMutability !== "view").map((f) => f.name).sort();
    expect(fns).to.deep.equal(["collect", "onERC721Received"]);
  });

  it("vests 5B to vault.ensgiant.eth from month 12, linearly to month 48", async function () {
    expect(await vesting.owner()).to.equal(ADDR.founder);
    expect(await vesting.start()).to.equal(cfg.params.vestingStart);
    expect(await vesting.duration()).to.equal(cfg.params.vestingDuration);
    const tokenAddr = await token.getAddress();
    expect(await vesting["releasable(address)"](tokenAddr)).to.equal(0n);
  });

  it("funds 36 platform buckets and starts the handover to the Safe", async function () {
    expect(await unlock.bucketCount()).to.equal(BigInt(SLUGS.length));
    expect(await unlock.owner()).to.equal(await launcher.getAddress());
    expect(await unlock.pendingOwner()).to.equal(ADDR.safe);
    expect(await token.balanceOf(await unlock.getAddress())).to.be.gte(await unlock.totalCommitted());
  });

  it("trades: a 0.1 ETH buy gets tokens and raises the price, a sell works, and fees go to the Safe", async function () {
    const weth = await ethers.getContractAt(["function deposit() payable", "function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"], ADDR.weth);
    const router = new ethers.Contract(ADDR.swapRouter, [
      "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
    ], buyer);
    await weth.connect(buyer).deposit({ value: ethers.parseEther("1") });
    await weth.connect(buyer).approve(ADDR.swapRouter, ethers.MaxUint256);
    const tokenAddr = await token.getAddress();
    const [, tickBefore] = await pool.slot0();

    await (await router.exactInputSingle({ tokenIn: ADDR.weth, tokenOut: tokenAddr, fee: 10000, recipient: buyer.address, amountIn: ethers.parseEther("0.1"), amountOutMinimum: 0, sqrtPriceLimitX96: 0 })).wait();
    const got = await token.balanceOf(buyer.address);
    expect(got).to.be.gt(0n);
    const [, tickAfter] = await pool.slot0();
    expect(tickAfter).to.not.equal(tickBefore);
    console.log(`      0.1 ETH bought ${ethers.formatEther(got)} RWAIDRH`);

    await token.connect(buyer).approve(ADDR.swapRouter, got);
    await (await router.exactInputSingle({ tokenIn: tokenAddr, tokenOut: ADDR.weth, fee: 10000, recipient: buyer.address, amountIn: got / 2n, amountOutMinimum: 0, sqrtPriceLimitX96: 0 })).wait();

    const safeWethBefore = await weth.balanceOf(ADDR.safe);
    await (await lock.connect(buyer).collect(positionId)).wait(); // anyone can trigger it
    const fees = (await weth.balanceOf(ADDR.safe)) - safeWethBefore;
    expect(fees).to.be.closeTo(ethers.parseEther("0.001"), ethers.parseEther("0.00001")); // 1% of the 0.1 WETH buy
    console.log(`      fees collected to the Safe: ${ethers.formatEther(fees)} WETH`);
  });
});
