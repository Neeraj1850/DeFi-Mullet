import { useState, useEffect, useCallback } from 'react';
import { getAllVaults } from '../api/earn';
import { MAINNET_CHAIN_IDS, TESTNET_CHAIN_IDS } from '../config/wagmi';
import type { EarnVault, Filters, NetworkMode, SortKey } from '../types';

interface UseVaultsResult {
  vaults: EarnVault[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useVaults = (
  filters: Filters,
  sortBy: SortKey,
  networkMode: NetworkMode
): UseVaultsResult => {
  const [vaults, setVaults] = useState<EarnVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllVaults(filters, sortBy);

      // Filter by network mode using chainId
      const allowedIds = networkMode === 'mainnet' ? MAINNET_CHAIN_IDS : TESTNET_CHAIN_IDS;
      const filtered = data.filter((v) => (allowedIds as number[]).includes(v.chainId));

      setVaults(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), sortBy, networkMode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { vaults, loading, error, refresh: fetchData };
};