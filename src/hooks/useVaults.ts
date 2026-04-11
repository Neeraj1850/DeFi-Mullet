import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllVaults } from '../api/earn';
import { scoreVault, gradeFilter } from '../utils/vaultScore';
import type { EarnVault, Filters, SortKey } from '../types';

const DEFAULT_MIN_TVL = 100_000;

export interface UseVaultsResult {
  vaults: EarnVault[];
  loading: boolean;
  error: string | null;
  total: number;
  refresh: () => void;
}

export const useVaults = (filters: Filters, sortBy: SortKey): UseVaultsResult => {
  const [vaults, setVaults]   = useState<EarnVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [total, setTotal]     = useState(0);
  const abortRef              = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const data = await getAllVaults(
        { ...filters, minTvlUsd: filters.minTvlUsd ?? DEFAULT_MIN_TVL },
        sortBy
      );
      const filtered = filters.minGrade
        ? data.filter((v) => gradeFilter(scoreVault(v), filters.minGrade!))
        : data;

      setVaults(filtered);
      setTotal(filtered.length);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch vaults');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => { clearTimeout(timer); clearInterval(interval); abortRef.current?.abort(); };
  }, [fetchData]);

  return { vaults, loading, error, total, refresh: fetchData };
};