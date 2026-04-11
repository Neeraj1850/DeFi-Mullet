import { createConfig, EVM, ChainType, getChains, config } from '@lifi/sdk';
import { getWalletClient, switchChain } from '@wagmi/core';
import { wagmiConfig } from './wagmi';

export const initLiFi = () => {
  createConfig({
    integrator: import.meta.env.VITE_LIFI_INTEGRATOR_ID ?? 'yield-explorer',
    providers: [
      EVM({
        getWalletClient: () => getWalletClient(wagmiConfig),
        switchChain: async (chainId) => {
          await switchChain(wagmiConfig, { chainId: chainId as any });
          return getWalletClient(wagmiConfig, { chainId });
        },
      }),
    ],
    preloadChains: false,
  });
};

// Call this after init to sync LI.FI chains with wagmi
export const syncChains = async () => {
  const chains = await getChains({ chainTypes: [ChainType.EVM] });
  config.setChains(chains);
  return chains;
};