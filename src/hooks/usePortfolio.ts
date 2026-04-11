import { useState, useEffect, useCallback } from 'react';
import { getPortfolioPositions } from '../api/earn';
import type { PortfolioPosition } from '../types';

interface UsePortfolioResult {
  positions: PortfolioPosition[];
  loading: boolean;
  error: string | null;
  totalUsd: number;
  refresh: () => void;
}

export const usePortfolio = (userAddress: string | undefined): UsePortfolioResult => {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userAddress) {
      setPositions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPortfolioPositions(userAddress);

      // Merge optimistic deposits from localStorage
      let optimisticDeposits: PortfolioPosition[] = [];
      try {
        const localKey = `optimistic_portfolio_${userAddress}`;
        const localData = window.localStorage.getItem(localKey);
        if (localData) {
          optimisticDeposits = JSON.parse(localData);
        }
      } catch (e) {
        console.warn('Failed to parse optimistic portfolio positions', e);
      }

      setPositions([...data, ...optimisticDeposits]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalUsd = positions.reduce((sum, p) => sum + parseFloat(p.balanceUsd), 0);

  return { positions, loading, error, totalUsd, refresh: fetchData };
};