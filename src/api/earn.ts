// ─── LI.FI Earn Data API ─────────────────────────────────────────────────────
// Base URL: https://earn.li.fi  (separate from li.quest used for quotes)
// Docs: https://docs.li.fi/earn/guides/api-integration
// ─────────────────────────────────────────────────────────────────────────────
/// <reference types="vite/client" />
import { getQuote } from '@lifi/sdk';
import type {
  EarnChain,
  EarnProtocolMeta,
  EarnVault,
  Filters,
  PortfolioPosition,
  VaultsResponse,
} from '../types';

const EARN_BASE = import.meta.env.DEV
  ? '/earn-api/v1/earn'        // proxied through Vite in dev — no CORS
  : 'https://earn.li.fi/v1/earn'; // direct in production build
const API_KEY = import.meta.env.VITE_LIFI_INTEGRATOR_ID ?? '';

const earnHeaders: HeadersInit = {
  'Content-Type': 'application/json',
  ...(API_KEY && { 'x-lifi-api-key': API_KEY }),
};


// ─── Vaults ───────────────────────────────────────────────────────────────────
export const getVaults = async (
  filters: Filters = {},
  sortBy: 'apy' | 'tvl' = 'apy',
  limit = 50,
  cursor?: string
): Promise<VaultsResponse> => {
  const params = new URLSearchParams();
  if (filters.chainId)     params.set('chainId',    String(filters.chainId));
  if (filters.asset)       params.set('asset',       filters.asset);
  if (filters.protocol)    params.set('protocol',    filters.protocol);
  if (filters.minTvlUsd)   params.set('minTvlUsd',  String(filters.minTvlUsd));
  if (cursor)              params.set('cursor',      cursor);
  params.set('sortBy', sortBy);
  params.set('limit',  String(limit));

  const res = await fetch(`${EARN_BASE}/vaults?${params}`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Vaults API error: ${res.status}`);
  return res.json();
};

// Fetch ALL vaults across pages
export const getAllVaults = async (
  filters: Filters = {},
  sortBy: 'apy' | 'tvl' = 'apy'
): Promise<EarnVault[]> => {
  const all: EarnVault[] = [];
  let cursor: string | undefined;

  do {
    const response = await getVaults(filters, sortBy, 100, cursor);
    all.push(...response.data);
    cursor = response.nextCursor;
  } while (cursor);

  return all;
};

// Single vault
export const getVaultByAddress = async (
  chainId: number,
  address: string
): Promise<EarnVault> => {
  const res = await fetch(`${EARN_BASE}/vaults/${chainId}/${address}`, {
    headers: earnHeaders,
  });
  if (!res.ok) throw new Error(`Vault not found: ${res.status}`);
  return res.json();
};

// ─── Chains ───────────────────────────────────────────────────────────────────
export const getChains = async (): Promise<EarnChain[]> => {
  const res = await fetch(`${EARN_BASE}/chains`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Chains API error: ${res.status}`);
  return res.json();
};

// ─── Protocols ────────────────────────────────────────────────────────────────
export const getProtocols = async (): Promise<EarnProtocolMeta[]> => {
  const res = await fetch(`${EARN_BASE}/protocols`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Protocols API error: ${res.status}`);
  return res.json();
};

// ─── Portfolio ────────────────────────────────────────────────────────────────
export const getPortfolioPositions = async (
  userAddress: string
): Promise<PortfolioPosition[]> => {
  const res = await fetch(
    `${EARN_BASE}/portfolio/${userAddress}/positions`,
    { headers: earnHeaders }
  );
  if (!res.ok) throw new Error(`Portfolio API error: ${res.status}`);
  const data = await res.json();
  return data.positions ?? [];
};

// ─── Composer quote (via li.quest + LI.FI SDK) ────────────────────────────────
// Vault address goes in toToken — triggers Composer automatically
// Docs: https://docs.li.fi/composer/guides/sdk-integration
// replace the VaultQuoteParams interface and getVaultQuote with this:
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
    fromChain:   params.fromChain,
    toChain:     params.toChain,
    fromToken:   params.fromToken,
    toToken:     params.toToken,
    fromAmount:  params.fromAmount,
    fromAddress: params.fromAddress,
    toAddress:   params.fromAddress,
  });
};