import { useMemo } from 'react';
import type { BalancesState, PositionsState, SummaryData } from '../PortfolioContext';

export const usePortfolioSummary = (
  balancesData: BalancesState,
  positionsData: PositionsState
): SummaryData => {
  return useMemo(() => {
    // 1. Calculate Wallet Value 
    let walletValueUSD = 0;
    Object.values(balancesData.balancesByAddress).forEach((balancesArray) => {
      balancesArray.forEach((b) => {
        walletValueUSD += Number(b.amountUsd) || 0;
      });
    });

    // 2. Calculate Earn Value
    let earnValueUSD = 0;
    let validApySum = 0;
    let validApyCount = 0;
    let activePositionCount = 0;
    const chainBreakdown: Record<number, number> = {};

    Object.values(positionsData.positionsByAddress).forEach((posArray) => {
      posArray.forEach((pos) => {
        activePositionCount++;
        const posUsd = Number(pos.balanceUsd) || 0;
        earnValueUSD += posUsd;

        // Breakdown logically by chain
        if (!chainBreakdown[pos.chainId]) chainBreakdown[pos.chainId] = 0;
        chainBreakdown[pos.chainId] += posUsd;

        // Extract normalized APY mapped outputs gracefully
        if (typeof pos.apy === 'number' && pos.apy > 0) {
          validApySum += pos.apy;
          validApyCount++;
        }
      });
    });

    // 3. Compute Normalized Aggregates
    const totalValueUSD = walletValueUSD + earnValueUSD;
    const averageApy = validApyCount > 0 ? validApySum / validApyCount : 0;

    return {
      totalValueUSD,
      earnValueUSD,
      walletValueUSD,
      averageApy,
      activePositionCount,
      chainBreakdown,
    };
  }, [balancesData, positionsData]);
};
