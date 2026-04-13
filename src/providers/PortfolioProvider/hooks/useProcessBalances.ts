import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { mainnet, arbitrum, base, optimism } from 'wagmi/chains';
import type { BalancesState } from '../PortfolioContext';
import type { WalletToken, PortfolioBalance } from '../../../types';

let cachedEthPrice = 3500;
let lastFetchTime = 0;

export const useProcessBalances = (lpTokens: string[], refreshKey: number) => {
  const { address } = useAccount();
  const [ethPrice, setEthPrice] = useState<number>(cachedEthPrice);
  const [isLoadingPrice, setIsLoadingPrice] = useState(!!address);

  const fetchEthPrice = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime < 60000) {
      // Cache is still fresh — no need to load, ensure loading is cleared
      setIsLoadingPrice(false);
      return;
    }
    setIsLoadingPrice(true);
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (res.ok) {
        const data = await res.json();
        const price = data?.ethereum?.usd;
        if (typeof price === 'number' && price > 0) {
          cachedEthPrice = price;
          lastFetchTime = now;
          setEthPrice(price);
        }
      }
    } catch {
      // Fallback securely, never throw
    } finally {
      setIsLoadingPrice(false);
    }
  }, []);

  useEffect(() => {
    fetchEthPrice();
  }, [fetchEthPrice, refreshKey]);

  // WAGMI Hook definitions safely shielded against missing addresses
  const queryEnabled = !!address;
  const bMainnet = useBalance({ address, chainId: mainnet.id, query: { enabled: queryEnabled } });
  const bArbitrum = useBalance({ address, chainId: arbitrum.id, query: { enabled: queryEnabled } });
  const bBase = useBalance({ address, chainId: base.id, query: { enabled: queryEnabled } });
  const bOp = useBalance({ address, chainId: optimism.id, query: { enabled: queryEnabled } });

  const isWagmiLoading = bMainnet.isLoading || bArbitrum.isLoading || bBase.isLoading || bOp.isLoading;
  const isWagmiError = bMainnet.isError || bArbitrum.isError || bBase.isError || bOp.isError;

  const state = useMemo((): BalancesState => {
    if (!address) {
      return {
        balances: [],
        balancesByAddress: {},
        metadata: { isLoading: false, isError: false, lastUpdated: Date.now() },
      };
    }

    const compiledBalances: PortfolioBalance<WalletToken>[] = [];

    const mapNativeEth = (b: any, chainId: number, chainName: string) => {
      if (b.data && b.data.formatted) {
        const amtStr = b.data.formatted;
        const usdValue = Number(amtStr) * ethPrice;
        compiledBalances.push({
          token: {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            decimals: 18,
            chainId,
            name: 'Ethereum',
          },
          amount: amtStr,
          amountUsd: usdValue.toString(),
        });
      }
    };

    mapNativeEth(bMainnet, mainnet.id, 'Mainnet');
    mapNativeEth(bArbitrum, arbitrum.id, 'Arbitrum');
    mapNativeEth(bBase, base.id, 'Base');
    mapNativeEth(bOp, optimism.id, 'Optimism');

    return {
      balances: compiledBalances.map(b => b.token),
      balancesByAddress: { [address]: compiledBalances },
      metadata: {
        isLoading: isWagmiLoading || isLoadingPrice,
        isError: isWagmiError,
        lastUpdated: Date.now(),
      },
    };
  }, [address, bMainnet, bArbitrum, bBase, bOp, ethPrice, isWagmiLoading, isLoadingPrice, isWagmiError]);

  return state;
};
