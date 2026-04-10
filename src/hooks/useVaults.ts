import { useState, useEffect, useCallback } from 'react';
import { getAllVaults } from '../api/earn';
import type { EarnVault, Filters, SortKey } from '../types';

interface UseVaultsResult {
  vaults: EarnVault[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useVaults = (filters: Filters, sortBy: SortKey): UseVaultsResult => {
  const [vaults, setVaults] = useState<EarnVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllVaults(filters, sortBy);
      setVaults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), sortBy]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { vaults, loading, error, refresh: fetchData };
};