import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { getPortfolioPositions } from '../../../api/earn';
import type { PortfolioPosition } from '../../../types';
import type { PositionsState } from '../PortfolioContext';

export const useProcessedPositions = (refreshKey: number) => {
  const { address } = useAccount();
  // Track the last address+refreshKey we successfully loaded — prevents
  // redundant network calls when the parent re-renders without data changes.
  const loadedKeyRef = useRef<string | null>(null);

  const [state, setState] = useState<PositionsState>({
    positions: [],
    positionsByAddress: {},
    positionsByProtocolAndChain: {},
    positionsByProtocol: {},
    metadata: { isLoading: !!address, isError: false, lastUpdated: null },
    lpTokens: [],
  });

  const fetchPositions = useCallback(async (force = false) => {
    if (!address) {
      setState((s) => ({
        ...s,
        positions: [],
        positionsByAddress: {},
        positionsByProtocolAndChain: {},
        positionsByProtocol: {},
        metadata: { isLoading: false, isError: false, lastUpdated: Date.now() },
        lpTokens: [],
      }));
      return;
    }

    // Deduplicate: skip if same address+refreshKey already loaded
    const cacheKey = `${address}:${refreshKey}`;
    if (!force && loadedKeyRef.current === cacheKey) return;

    setState((s) => ({ ...s, metadata: { ...s.metadata, isLoading: true, isError: false } }));

    try {
      const apiPositions = await getPortfolioPositions(address);

      let optimisticDeposits: PortfolioPosition[] = [];
      try {
        const localData = window.localStorage.getItem(`optimistic_portfolio_${address}`);
        if (localData) optimisticDeposits = JSON.parse(localData);
      } catch (e) {
        console.warn('Failed to parse optimistic portfolio positions', e);
      }

      const allPositions = [...apiPositions, ...optimisticDeposits];

      const positionsByAddress: Record<string, PortfolioPosition[]> = {};
      positionsByAddress[address] = allPositions;

      const positionsByProtocolAndChain: Record<string, Record<number, PortfolioPosition[]>> = {};
      const positionsByProtocol: Record<string, PortfolioPosition[]> = {};
      const lpTokensSet = new Set<string>();

      allPositions.forEach((pos) => {
        if (!positionsByProtocol[pos.protocolName]) positionsByProtocol[pos.protocolName] = [];
        positionsByProtocol[pos.protocolName].push(pos);

        if (!positionsByProtocolAndChain[pos.protocolName]) positionsByProtocolAndChain[pos.protocolName] = {};
        if (!positionsByProtocolAndChain[pos.protocolName][pos.chainId]) positionsByProtocolAndChain[pos.protocolName][pos.chainId] = [];
        positionsByProtocolAndChain[pos.protocolName][pos.chainId].push(pos);

        if (pos.asset?.address && pos.asset.address !== '0x0' && pos.asset.address !== '0x0000000000000000000000000000000000000000') {
          lpTokensSet.add(pos.asset.address);
        }
      });

      loadedKeyRef.current = cacheKey;

      setState({
        positions: allPositions,
        positionsByAddress,
        positionsByProtocolAndChain,
        positionsByProtocol,
        metadata: { isLoading: false, isError: false, lastUpdated: Date.now() },
        lpTokens: Array.from(lpTokensSet),
      });
    } catch {
      setState((s) => ({
        ...s,
        metadata: { ...s.metadata, isLoading: false, isError: true },
      }));
    }
  }, [address, refreshKey]);

  useEffect(() => {
    fetchPositions();
    // Force re-fetch only on explicit portfolio-updated events (deposit/withdraw)
    const handleUpdate = () => fetchPositions(true);
    window.addEventListener('portfolio-updated', handleUpdate);
    return () => window.removeEventListener('portfolio-updated', handleUpdate);
  }, [fetchPositions]);

  return state;
};
