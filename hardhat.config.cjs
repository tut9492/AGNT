require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: [PRIVATE_KEY],
    },
    baseSepolia: {
      url: "https://sepolia.base.org", 
      chainId: 84532,
      accounts: [PRIVATE_KEY],
    },
    megaeth: {
      url: process.env.MEGAETH_RPC_URL || "https://rpc.megaeth.com",
      chainId: Number(process.env.MEGAETH_CHAIN_ID) || 6342,
      accounts: [PRIVATE_KEY],
    },
  },
};
