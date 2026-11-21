# Crowdfund smart contracts

This directory contains the Crowdfund Solidity contract and its Hardhat 3 development setup.

## Layout

- `contracts/CrowdFunding.sol` — campaign creation, donations, withdrawals, and refunds.
- `test/CrowdFunding.ts` — TypeScript integration tests using Hardhat's viem toolbox.
- `hardhat.config.ts` — Solidity compiler and local, simulated, and Sepolia network configuration.

## Install and compile

```powershell
bun install
bunx hardhat compile
```

## Run contract tests

```powershell
bunx hardhat test
```

For frontend setup and environment configuration, see the repository [README](../README.md).

Sepolia settings use Hardhat configuration variables `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY`. Store secrets with Hardhat's keystore and never commit them.
