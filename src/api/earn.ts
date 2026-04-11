/// <reference types="vite/client" />
import { createConfig, EVM, getChains as sdkGetChains, config, getQuote } from '@lifi/sdk';
import type {
  EarnChain, EarnProtocolMeta, EarnVault,
  Filters, PortfolioPosition, VaultsResponse,
} from '../types';

const EARN_BASE = import.meta.env.DEV
  ? '/earn-api/v1/earn'
  : 'https://earn.li.fi/v1/earn';
const API_KEY = import.meta.env.VITE_LIFI_INTEGRATOR_ID ?? '';

const earnHeaders: HeadersInit = {
  'Content-Type': 'application/json',
  ...(API_KEY && { 'x-lifi-api-key': API_KEY }),
};

// Uses SDK's getChains (aliased to avoid name clash with our local getChains)
export const syncLiFiChains = async (): Promise<void> => {
  const chains = await sdkGetChains();
  config.setChains(chains);
};

export const initLiFi = (): void => {
  createConfig({
    integrator: API_KEY || 'yield-explorer',
    providers: [
      EVM({
        getWalletClient: () => import('@wagmi/core').then(({ getWalletClient }) =>
          getWalletClient(import('../config/wagmi').then(m => m.wagmiConfig) as any)
        ),
      }),
    ],
    preloadChains: false,
  });
};

export const getVaults = async (
  filters: Filters = {},
  sortBy: 'apy' | 'tvl' = 'apy',
  limit = 50,
  cursor?: string
): Promise<VaultsResponse> => {
  const params = new URLSearchParams();
  if (filters.chainId) params.set('chainId', String(filters.chainId));
  if (filters.asset) params.set('asset', filters.asset);
  if (filters.protocol) params.set('protocol', filters.protocol);
  if (filters.minTvlUsd) params.set('minTvlUsd', String(filters.minTvlUsd));
  if (cursor) params.set('cursor', cursor);
  params.set('sortBy', sortBy);
  params.set('limit', String(limit));
  const res = await fetch(`${EARN_BASE}/vaults?${params}`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Vaults API error: ${res.status}`);
  return res.json();
};

export const getAllVaults = async (
  filters: Filters = {},
  sortBy: 'apy' | 'tvl' = 'apy'
): Promise<EarnVault[]> => {
  const all: EarnVault[] = [];
  let cursor: string | undefined;

  do {
    const page = await getVaults(filters, sortBy, 100, cursor);
    const clean = page.data.filter((v: EarnVault) => {
      if (!v.isTransactional) return false;
      const apy = v.analytics.apy.total;
      // Filter out null APY and anything above 500% — almost certainly bad data
      if (apy === null) return true; // keep nulls, display as —
      if (apy > 500) return false;   // anything above 500% is bad pipeline data
      if (apy < 0) return false;     // negative APY vaults not useful
      return true;
    });
    all.push(...clean);
    cursor = page.nextCursor;
  } while (cursor);

  return all;
};

export const getVaultById = async (chainId: number, address: string): Promise<EarnVault> => {
  const res = await fetch(`${EARN_BASE}/vaults/${chainId}/${address}`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Vault not found: ${res.status}`);
  return res.json();
};

export const getEarnChains = async (): Promise<EarnChain[]> => {
  const res = await fetch(`${EARN_BASE}/chains`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Chains API error: ${res.status}`);
  return res.json();
};

export const getEarnProtocols = async (): Promise<EarnProtocolMeta[]> => {
  const res = await fetch(`${EARN_BASE}/protocols`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Protocols API error: ${res.status}`);
  return res.json();
};

export const getPortfolioPositions = async (userAddress: string): Promise<PortfolioPosition[]> => {
  const res = await fetch(`${EARN_BASE}/portfolio/${userAddress}/positions`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Portfolio API error: ${res.status}`);
  const data = await res.json();
  return data.positions ?? [];
};

interface VaultQuoteParams {
  fromChain: string | number;
  toChain: string | number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}

export const getVaultQuote = async (params: VaultQuoteParams) => {
  return getQuote({
    fromChain: params.fromChain,
    toChain: params.toChain,
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toAddress: params.fromAddress,
  });
};