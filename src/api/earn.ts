/// <reference types="vite/client" />
import { getQuote } from '@lifi/sdk';
import type {
  EarnChain, EarnProtocolMeta, EarnVault,
  Filters, PortfolioPosition, VaultsResponse,
} from '../types';

/* ─── Base URL (proxied in dev, direct in prod) ────────────────── */
export const EARN_BASE = import.meta.env.DEV
  ? '/earn-api/v1/earn'
  : 'https://earn.li.fi/v1/earn';

const API_KEY = import.meta.env.VITE_LIFI_INTEGRATOR_ID ?? '';

export const earnHeaders: HeadersInit = {
  'Content-Type': 'application/json',
  ...(API_KEY && { 'x-lifi-api-key': API_KEY }),
};

/* ─── Vault endpoints ─────────────────────────────────────────── */
export const getVaults = async (
  filters: Filters = {},
  sortBy: 'apy' | 'tvl' = 'apy',
  limit = 100,
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
      if (apy === null) return true;  // keep null-APY vaults — show as "—"
      if (apy > 100) return false; // bad pipeline data
      if (apy < 0) return false; // negative APY not useful
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

/* ─── Chain & Protocol metadata ───────────────────────────────── */
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

/* ─── Portfolio positions ─────────────────────────────────────── */
export const getPortfolioPositions = async (userAddress: string): Promise<PortfolioPosition[]> => {
  const res = await fetch(`${EARN_BASE}/portfolio/${userAddress}/positions`, { headers: earnHeaders });
  if (!res.ok) throw new Error(`Portfolio API error: ${res.status}`);
  const data = await res.json();

  // Normalise API shape — positions may be in data.positions or data directly
  const raw: any[] = data.positions ?? (Array.isArray(data) ? data : []);

  return raw.map((p: any): PortfolioPosition => {
    // Discover vault receipt-token address across all known LI.FI API field shapes
    const vaultAddress =
      p.vaultAddress ??
      p.vault ??
      p.poolAddress ??
      p.pool ??
      p.lpToken ??
      p.lpTokenAddress ??
      p.shareToken ??
      p.receiptToken ??
      p.positionAddress ??
      p.address ??         // some responses use bare 'address'
      undefined;

    // balanceNative may arrive as:
    //   (a) a decimal human-readable string: "0.000997"  ← raw token units need parseUnits
    //   (b) an integer wei-like string:      "997"       ← ready to use
    // We store it as-is; useWithdraw.ts is responsible for converting if decimal.
    const balanceNative = String(p.balanceNative ?? p.balance_native ?? p.amount ?? '0');

    return {
      chainId:      p.chainId      ?? p.chain_id ?? 0,
      protocolName: p.protocolName ?? p.protocol  ?? 'Unknown',
      vaultName:    p.vaultName    ?? p.name      ?? undefined,
      vaultAddress,
      asset: {
        address:  p.asset?.address  ?? p.tokenAddress ?? p.underlyingToken?.address ?? '0x0000000000000000000000000000000000000000',
        symbol:   p.asset?.symbol   ?? p.symbol        ?? p.underlyingToken?.symbol  ?? 'UNK',
        decimals: p.asset?.decimals ?? p.decimals       ?? p.underlyingToken?.decimals ?? 18,
        name:     p.asset?.name     ?? p.tokenName      ?? p.underlyingToken?.name     ?? undefined,
      },
      balanceUsd:    String(p.balanceUsd    ?? p.balance_usd    ?? p.amountUsd ?? '0'),
      balanceNative,
      apy: typeof p.apy === 'number' ? p.apy : undefined,
    };
  });
};

/* ─── Quote helper (used by deposit + withdraw hooks) ────────── */
export const getVaultQuote = (params: {
  fromChain: string | number;
  toChain: string | number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}) =>
  getQuote({
    fromChain: params.fromChain,
    toChain: params.toChain,
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toAddress: params.fromAddress,
  });