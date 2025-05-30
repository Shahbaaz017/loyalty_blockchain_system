import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // Includes ethers, waffle, etc.
import "dotenv/config"; // To load .env variables

// Load environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

if (!PRIVATE_KEY) {
  console.warn("WARNING: PRIVATE_KEY is not set in .env file. Deployments to live networks will fail.");
}
if (!SEPOLIA_RPC_URL) {
  console.warn("WARNING: SEPOLIA_RPC_URL is not set in .env file. Connection to Sepolia will fail.");
}

const config: HardhatUserConfig = {
  solidity: "0.8.24", // Ensure this matches or is compatible with your contract's pragma
  networks: {
    hardhat: { // Default local network for quick tests
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://rpc.sepolia.org", // Fallback public RPC, but .env is better
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111, // Chain ID for Sepolia
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY || ""
  },
  gasReporter: { // Optional: for tracking gas usage during tests
    enabled: process.env.REPORT_GAS === "true", // Enable by setting REPORT_GAS=true in .env
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY, // Optional: for USD conversion
    // token: "ETH", // Can specify MATIC for Polygon, ETH for Ethereum
  },
};

export default config;
