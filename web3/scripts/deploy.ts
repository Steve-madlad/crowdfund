import { network } from "hardhat";

async function main() {
  const { viem } = await network.getOrCreate("sepolia");

  const crowdfunding = await viem.deployContract("CrowdFunding");

  console.log("CrowdFunding contract deployed:", crowdfunding.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});