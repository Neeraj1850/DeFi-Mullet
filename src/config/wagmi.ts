/// <reference types="vite/client" />
import { createConfig as createWagmiConfig } from 'wagmi';
import { base, baseSepolia, arbitrum, arbitrumSepolia, mainnet, sepolia, optimism, optimismSepolia } from 'wagmi/chains';
import { createClient, http } from 'viem';

export const MAINNET_CHAINS = [mainnet, base, arbitrum, optimism] as const;
export const TESTNET_CHAINS = [sepolia, baseSepolia, arbitrumSepolia, optimismSepolia] as const;

export const MAINNET_CHAIN_IDS = MAINNET_CHAINS.map((c) => c.id);
export const TESTNET_CHAIN_IDS = TESTNET_CHAINS.map((c) => c.id);

export const wagmiConfig = createWagmiConfig({
  chains: [...MAINNET_CHAINS, ...TESTNET_CHAINS],
  client: ({ chain }) => createClient({ chain, transport: http() }),
});