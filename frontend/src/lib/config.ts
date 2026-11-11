import { defineChain } from 'viem';
import { sepolia } from 'viem/chains';
import { createConfig, http } from 'wagmi';
import { injected, metaMask, safe } from 'wagmi/connectors';

const hardhat = defineChain({
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
});

export const config = createConfig({
  chains: [hardhat, sepolia],
  connectors: [injected(), metaMask(), safe()],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
});
