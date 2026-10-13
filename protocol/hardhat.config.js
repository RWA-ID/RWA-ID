require("dotenv").config();

require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-network-helpers");
require("@nomicfoundation/hardhat-verify");

const { LINEA_SEPOLIA_RPC_URL, LINEA_MAINNET_RPC_URL, SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

function accounts() {
  return PRIVATE_KEY ? [PRIVATE_KEY] : [];
}

module.exports = {
  solidity: {
    // The `compilers` form, not the `version` shorthand: Hardhat silently
    // ignores `overrides` next to a bare `version`.
    compilers: [
      {
        version: "0.8.24",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
    overrides: {
      // v4 carries the onchain renderer plus sponsorship and artwork; at 200 runs
      // it sits ~350 bytes under the 24,576-byte limit. Optimizing for size
      // instead keeps real headroom. Claims cost marginally more gas, which on
      // Robinhood Chain is fractions of a cent.
      "contracts/RWAIDv4.sol": {
        version: "0.8.24",
        settings: { optimizer: { enabled: true, runs: 1 } },
      },
    },
  },

  networks: {
    // FORK_ROBINHOOD=1 runs the local chain as a copy of Robinhood Chain, for
    // scripts/fork-check-v4.js. Nothing sent to a fork reaches the real chain.
    hardhat: process.env.FORK_ROBINHOOD
      ? {
          chainId: 4663,
          forking: { url: process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com" },
        }
      : {},

    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      chainId: 11155111,
      accounts: accounts(),
    },

    mainnet: {
      url: process.env.MAINNET_RPC_URL || process.env.ETH_MAINNET_RPC_URL || "",
      chainId: 1,
      accounts: accounts(),
    },

    lineaSepolia: {
      url: LINEA_SEPOLIA_RPC_URL || "",
      chainId: 59141,
      accounts: accounts(),
    },

    // Robinhood Chain (Arbitrum Orbit L2, ETH gas). RWAIDv4, the token and the
    // platform unlock live here; rwa-id.eth and its resolver stay on mainnet.
    robinhood: {
      url: process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
      chainId: 4663,
      accounts: accounts(),
    },

    linea: {
      url: LINEA_MAINNET_RPC_URL || "",
      chainId: 59144,
      accounts: accounts(),
    },
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
};

