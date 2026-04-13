import { createContext } from 'react';
import type { WalletToken, PortfolioBalance, PortfolioPosition } from '../../types';

export interface BalancesState {
  balances: WalletToken[];
  balancesByAddress: Record<string, PortfolioBalance<WalletToken>[]>;
  metadata: { isLoading: boolean; isError: boolean; lastUpdated: number | null };
}

export interface PositionsState {
  positions: PortfolioPosition[];
  positionsByAddress: Record<string, PortfolioPosition[]>;
  positionsByProtocolAndChain: Record<string, Record<number, PortfolioPosition[]>>;
  positionsByProtocol: Record<string, PortfolioPosition[]>;
  metadata: { isLoading: boolean; isError: boolean; lastUpdated: number | null };
  lpTokens: (string | null)[];
}

export interface SummaryData {
  totalValueUSD: number;
  earnValueUSD: number;
  walletValueUSD: number;
  averageApy: number;
  activePositionCount: number;
  chainBreakdown: Record<number, number>;
}

export interface OrchestrationState {
  isLoading: boolean;
  isError: boolean;          // both failed
  isBalanceError: boolean;   // only ETH balances failed
  isPositionError: boolean;  // only positions API failed
  isEmpty: boolean;
  canRefresh: boolean;
}

export interface PortfolioContextType {
  balances: BalancesState;
  positions: PositionsState;
  summary: SummaryData;
  state: OrchestrationState;
  refresh: () => void;
}

export const PortfolioContext = createContext<PortfolioContextType | null>(null);
