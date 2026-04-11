// ─── Earn API types (earn.li.fi) ─────────────────────────────────────────────

export type NetworkMode = 'mainnet' | 'testnet';

export interface EarnToken {
  address: string;
  symbol: string;
  decimals: number;
  weight?: number;
  priceUsd?: string;
}

export interface EarnProtocol {
  name: string;
  logoUri: string;
  url: string;
}

export interface EarnVault {
  address: string;
  network: string;
  chainId: number;
  slug: string;
  name: string;
  description: string | null;
  protocol: EarnProtocol;
  underlyingTokens: EarnToken[];
  lpTokens: EarnToken[];
  tags: string[];
  analytics: {
    apy: {
      base: number | null;
      reward: number | null;
      total: number | null;
    };
    apy1d: number | null;
    apy7d: number | null;
    apy30d: number | null;
    tvl: {
      usd: string;
      native: string;
    };
    updatedAt: string;
  };
  isTransactional: boolean;
  isRedeemable: boolean;
  timeLock: number;
  kyc: boolean;
}

export interface EarnChain {
  name: string;
  chainId: number;
  networkCaip: string;
}

export interface EarnProtocolMeta {
  name: string;
  logoUri: string;
  url: string;
}

export interface PortfolioPosition {
  chainId: number;
  protocolName: string;
  asset: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  balanceUsd: string;
  balanceNative: string;
}

export interface VaultsResponse {
  data: EarnVault[];
  nextCursor?: string;
  total: number;
}

// ─── UI / filter types ────────────────────────────────────────────────────────

export interface Filters {
  chainId?: number | null;
  asset?: string | null;
  protocol?: string | null;
  minTvlUsd?: number | null;
}

export type SortKey = 'apy' | 'tvl';