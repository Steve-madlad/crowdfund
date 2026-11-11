import { network } from "hardhat";

async function main() {
  const { viem } = await network.getOrCreate("localhost")

  // Deploy CrowdFunding contract
  const crowdfunding = await viem.deployContract("CrowdFunding");

  console.log("CrowdFunding deployed:", crowdfunding.address);

  // Deploy another contract
  const counter = await viem.deployContract("Counter");
  
  console.log("Counter Contract deployed:", counter.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});