import React, { useMemo, useState, useCallback, ReactNode } from 'react';
import { PortfolioContext } from './PortfolioContext';
import { useProcessedPositions } from './hooks/useProcessedPositions';
import { useProcessBalances } from './hooks/useProcessBalances';
import { usePortfolioSummary } from './hooks/usePortfolioSummary';
import { useOrchestrationState } from './hooks/useOrchestrationState';

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const positionsData = useProcessedPositions(refreshKey);
  
  // Compact lpTokens mapped explicitly over null types natively
  const lpTokens = useMemo(() => {
    return positionsData.lpTokens.filter((token): token is string => token !== null);
  }, [positionsData.lpTokens]);

  const balancesData = useProcessBalances(lpTokens, refreshKey);
  const summary = usePortfolioSummary(balancesData, positionsData);
  const state = useOrchestrationState(balancesData, positionsData);

  const value = useMemo(
    () => ({
      balances: balancesData,
      positions: positionsData,
      summary,
      state,
      refresh,
    }),
    [balancesData, positionsData, summary, state, refresh]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
