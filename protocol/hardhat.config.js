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
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    hardhat: {},

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

