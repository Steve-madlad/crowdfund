// import { defineChain } from 'viem';
// import { injected, metaMask, safe } from 'wagmi/connectors';
import { sepolia } from 'viem/chains';
import { createConfig, http } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

// const hardhat = defineChain({
//   id: 31337,
//   name: 'Hardhat',
//   nativeCurrency: {
//     name: 'Ether',
//     symbol: 'ETH',
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: ['http://127.0.0.1:8545'],
//     },
//   },
// });

export const config = createConfig({
  chains: [sepolia],
  connectors: [metaMask()],
  transports: { [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL) },
});
