import { createConfig, EVM, ChainType, getChains, config } from '@lifi/sdk';
import { getWalletClient, switchChain } from '@wagmi/core';
import { wagmiConfig as proWagmiConfig } from './wagmi';
import type { Config } from 'wagmi';

let _wagmiConfig: Config = proWagmiConfig;

export const initLiFi = (wagmiConfig?: Config): void => {
  if (wagmiConfig) _wagmiConfig = wagmiConfig;

  createConfig({
    integrator: import.meta.env.VITE_LIFI_INTEGRATOR_ID ?? 'yield-explorer',
    providers: [
      EVM({
        getWalletClient: () => getWalletClient(_wagmiConfig),
        switchChain: async (chainId) => {
          await switchChain(_wagmiConfig, { chainId: chainId as any });
          return getWalletClient(_wagmiConfig, { chainId });
        },
      }),
    ],
    preloadChains: false,
  });
};

// Call this after init to sync LI.FI chains with wagmi
export const syncLiFiChains = async (): Promise<void> => {
  const chains = await getChains({ chainTypes: [ChainType.EVM] });
  config.setChains(chains);
};