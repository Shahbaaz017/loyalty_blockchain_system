import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CoffeeCoin contract with the account:", deployer.address);

  const coffeeCoinFactory = await ethers.getContractFactory("CoffeeCoin");
  // Pass the deployer's address as the initialOwner for Ownable
  const coffeeCoin = await coffeeCoinFactory.deploy(deployer.address);

  // Wait for the contract to be deployed
  await coffeeCoin.waitForDeployment();

  const contractAddress = await coffeeCoin.getAddress();
  console.log("CoffeeCoin contract deployed to:", contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
