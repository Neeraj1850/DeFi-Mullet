/// <reference types="vite/client" />
import { createConfig as createWagmiConfig, fallback } from 'wagmi';
import {
  base, baseSepolia,
  arbitrum, arbitrumSepolia,
  mainnet, sepolia,
  optimism, optimismSepolia,
} from 'wagmi/chains';
import { createClient, http } from 'viem';

export const MAINNET_CHAINS = [mainnet, base, arbitrum, optimism] as const;
export const TESTNET_CHAINS = [sepolia, baseSepolia, arbitrumSepolia, optimismSepolia] as const;

export const MAINNET_CHAIN_IDS = MAINNET_CHAINS.map((c) => c.id);
export const TESTNET_CHAIN_IDS = TESTNET_CHAINS.map((c) => c.id);

/**
 * CORS-safe public RPC endpoints.
 * eth.merkle.io blocks browser requests — use llamarpc / public nodes instead.
 */
const RPC_URLS: Record<number, string[]> = {
  [mainnet.id]:           ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'],
  [base.id]:              ['https://mainnet.base.org', 'https://base.llamarpc.com'],
  [arbitrum.id]:          ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.llamarpc.com'],
  [optimism.id]:          ['https://mainnet.optimism.io', 'https://optimism.llamarpc.com'],
  [sepolia.id]:           ['https://rpc.sepolia.org', 'https://rpc.ankr.com/eth_sepolia'],
  [baseSepolia.id]:       ['https://sepolia.base.org'],
  [arbitrumSepolia.id]:   ['https://sepolia-rollup.arbitrum.io/rpc'],
  [optimismSepolia.id]:   ['https://sepolia.optimism.io'],
};

export const wagmiConfig = createWagmiConfig({
  chains: [...MAINNET_CHAINS, ...TESTNET_CHAINS],
  client: ({ chain }) => {
    const urls = RPC_URLS[chain.id];
    // Use fallback transport with multiple RPCs so if one fails it moves to the next
    const transport = urls && urls.length > 1
      ? fallback(urls.map((url) => http(url)))
      : http(urls?.[0]);
    return createClient({ chain, transport });
  },
});