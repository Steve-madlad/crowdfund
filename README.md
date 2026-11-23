# Venti

A responsive Web3 crowdfunding dApp. Browse and support campaigns, create campaigns with multiple images, and manage campaign funds through an Ethereum smart contract.

<p>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" /></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" /></a>
  <a href="https://vite.dev/"><img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" /></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" /></a>
  <a href="https://wagmi.sh/"><img alt="Wagmi" src="https://img.shields.io/badge/Wagmi-3-1C1C1C?style=for-the-badge&logo=ethereum&logoColor=white" /></a>
  <a href="https://viem.sh/"><img alt="Viem" src="https://img.shields.io/badge/Viem-2-1C1C1C?style=for-the-badge&logo=ethereum&logoColor=white" /></a>
  <a href="https://soliditylang.org/"><img alt="Solidity" src="https://img.shields.io/badge/Solidity-0.8-363636?style=for-the-badge&logo=solidity&logoColor=white" /></a>
  <a href="https://hardhat.org/"><img alt="Hardhat" src="https://img.shields.io/badge/Hardhat-3-FFF100?style=for-the-badge&logo=hardhat&logoColor=111111" /></a>
</p>

> **Testnet notice:** Venti uses the Sepolia Ethereum testnet. ETH and transactions on Sepolia are for testing only and have no real-world monetary value. Use Sepolia test ETH, not real funds.

## What it does

- Browse campaigns with search, status and category filters, sorting, and pagination.
- Connect an injected wallet, MetaMask, or Safe; view wallet details and disconnect.
- Create campaigns with a goal, deadline, description, and up to five HTTPS images. Reorder images to choose the cover.
- Donate to campaigns, track progress, and view campaign and profile activity.
- Withdraw funds from eligible successful campaigns.
- Claim refunds for cancelled or unsuccessful campaigns. Successful campaigns that remain unpaid past the refund window can have refunds enabled.
- See locally stored refund reminders for eligible refunds; dismissals can be snoozed or disabled per campaign.
- Save campaigns and switch between light and dark themes.

Campaign images are stored as HTTPS URLs on-chain, not uploaded by the app. Each image host controls the image availability.

## Repository layout

| Path | Description |
| --- | --- |
| `frontend/` | React web application |
| `web3/contracts/CrowdFunding.sol` | Solidity crowdfunding contract |
| `web3/test/CrowdFunding.ts` | Hardhat/viem contract integration tests |
| `web3/hardhat.config.ts` | Hardhat 3 networks and compiler configuration |

## Requirements

- [Bun](https://bun.sh/) (used for frontend and contract project scripts)
- A browser wallet for connecting to an Ethereum network
- A deployed `CrowdFunding` contract address for the network you intend to use

## Run the frontend

Install dependencies and configure the contract address:

```powershell
cd frontend
bun install
```

Create `frontend/.env.local`:

```dotenv
VITE_REACT_CONTRACT_ADDRESS=0xYourCrowdFundingContractAddress
```

Start the Vite development server:

```powershell
bun run dev
```

Venti is configured for the Sepolia testnet for public use. Sepolia ETH is test ETH and has no real-world monetary value. The frontend also supports a local Hardhat network at `http://127.0.0.1:8545` (chain ID `31337`) for development. Connect a wallet configured for the same network as the contract address.

## Work with the contract

```powershell
cd web3
bun install
bunx hardhat compile
```

Run the contract integration tests with:

```powershell
bunx hardhat test
```

Hardhat network and Solidity compiler settings are in `web3/hardhat.config.ts`. Sepolia settings use Hardhat configuration variables for the RPC URL and deployer private key; configure these securely with Hardhat's keystore rather than committing secrets.

## Frontend scripts

Run these commands from `frontend/`:

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Vite development server |
| `bun run build` | Type-check and create a production build |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |

## Smart contract notes

The `CrowdFunding` contract holds campaign contributions until eligible withdrawal or refund. Campaign creators choose a goal, deadline, and one to five unique HTTPS image URLs. The first image is the cover. The contract does not upload or verify that image content remains available.

Supporters claim refunds themselves when a campaign is cancelled or fails to reach its goal. If a successful campaign remains unpaid for three weeks after its deadline, anyone may enable refunds; funds cannot be withdrawn after refunds have been enabled. Review the in-app Help page before creating or supporting a campaign.
