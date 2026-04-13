import { useMemo } from 'react';
import type { BalancesState, PositionsState, OrchestrationState } from '../PortfolioContext';

export const useOrchestrationState = (
  balancesData: BalancesState,
  positionsData: PositionsState
): OrchestrationState => {
  return useMemo(() => {
    const isLoading = balancesData.metadata.isLoading || positionsData.metadata.isLoading;
    const isBalanceError = balancesData.metadata.isError;
    const isPositionError = positionsData.metadata.isError;
    const isError = isBalanceError && isPositionError;
    const isEmpty = balancesData.balances.length === 0 && positionsData.positions.length === 0;

    return {
      isLoading,
      isError,
      isBalanceError,
      isPositionError,
      isEmpty,
      canRefresh: !isLoading,
    };
  }, [balancesData, positionsData]);
};
