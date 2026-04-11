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
  rewardTokens?: EarnToken[];
  tags: string[];
  analytics: {
    apy: { base: number | null; reward: number | null; total: number | null };
    apy1d: number | null;
    apy7d: number | null;
    apy30d: number | null;
    tvl: { usd: string; native?: string };
    updatedAt: string;
  };
  caps?: { totalCap: string; maxCap: string };
  timeLock?: number;
  kyc?: boolean;
  isTransactional: boolean;
  isRedeemable: boolean;
  depositPacks: { name: string; stepsType: string }[];
  redeemPacks: { name: string; stepsType: string }[];
  syncedAt: string;
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

export interface Filters {
  chainId?: number | null;
  asset?: string | null;
  protocol?: string | null;
  minTvlUsd?: number | null;
  minGrade?: 'A' | 'B' | 'C' | 'D' | 'F' | null;
}

export type SortKey = 'apy' | 'tvl';
export type Tab = 'explore' | 'treasury' | 'portfolio';

// Stablecoin symbols the Treasury tool filters on
export const STABLECOIN_SYMBOLS = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'PYUSD', 'crvUSD', 'GHO', 'sDAI'];