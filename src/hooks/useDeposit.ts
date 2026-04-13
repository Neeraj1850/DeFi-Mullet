import { useState, useCallback, useRef } from 'react';
import { useAccount, useConfig } from 'wagmi';
import {
  getQuote,
  convertQuoteToRoute,
  executeRoute,
  type RouteExtended,
  type ProcessType,
} from '@lifi/sdk';
import { parseUnits } from 'viem';
import type { EarnVault } from '../types';

export const safeParseUnits = (amount: string, decimals: number) => {
  const parts = amount.split('.');
  if (parts.length === 2 && parts[1].length > decimals) {
    return parseUnits(`${parts[0]}.${parts[1].slice(0, decimals)}`, decimals).toString();
  }
  return parseUnits(amount, decimals).toString();
};

export type DepositStep =
  | 'idle' | 'quoting' | 'quoted'
  | 'executing' | 'confirming' | 'success' | 'error';

interface DepositState {
  step: DepositStep;
  route: RouteExtended | null;
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
}

interface ZapConfig {
  chainId: number;
  tokenAddress: string;
  decimals: number;
}

export const useDeposit = (vault: EarnVault | null) => {
  const { address } = useAccount();
  const config = useConfig();

  const [state, setState] = useState<DepositState>({
    step: 'idle', route: null, txHash: null, explorerUrl: null, error: null,
  });

  const lastQuoteArgsRef = useRef<{ amount: string; zapConfig?: ZapConfig } | null>(null);

  // KEY FIX: track whether we already reached a terminal state so
  // updateRouteHook's continued polling doesn't overwrite it
  const terminalRef = useRef(false);

  const fetchQuote = useCallback(async (amount?: string, zapConfig?: ZapConfig) => {
    if (!vault || !address) return;
    const activeAmount = amount ?? lastQuoteArgsRef.current?.amount;
    const activeZapConfig = zapConfig ?? lastQuoteArgsRef.current?.zapConfig;
    if (!activeAmount) return;

    lastQuoteArgsRef.current = { amount: activeAmount, zapConfig: activeZapConfig };
    terminalRef.current = false;

    const underlyingToken = vault.underlyingTokens[0];
    if (!underlyingToken) return;

    setState({ step: 'quoting', route: null, txHash: null, explorerUrl: null, error: null });

    try {
      const fromDecimals = activeZapConfig?.decimals ?? underlyingToken.decimals;
      const fromAmountWei = safeParseUnits(activeAmount, fromDecimals);

      const quote = await getQuote({
        fromChain: activeZapConfig?.chainId ?? vault.chainId,
        toChain: vault.chainId,
        fromToken: activeZapConfig?.tokenAddress ?? underlyingToken.address,
        toToken: vault.address,
        fromAmount: fromAmountWei,
        fromAddress: address,
        toAddress: address,
      });

      setState((s) => ({ ...s, step: 'quoted', route: convertQuoteToRoute(quote) }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote';
      setState((s) => ({ ...s, step: 'error', error: message }));
    }
  }, [vault, address]);

  const execute = useCallback(async () => {
    if (!state.route) return;
    terminalRef.current = false;
    setState((s) => ({ ...s, step: 'executing', error: null, txHash: null, explorerUrl: null }));

    try {
      // 1. Await executeRoute fully
      const finalRoute = await executeRoute(state.route, {
        // 2. Intermediate UI only hook
        updateRouteHook: (updatedRoute) => {
          let latestHash: string | null = null;
          let latestExplorerUrl: string | null = null;

          for (const step of updatedRoute.steps) {
            for (const process of step.execution?.process ?? []) {
              if (process.txHash) latestHash = process.txHash;
              // 3. Expose explorerUrl directly from SDK process object
              if (process.txLink) latestExplorerUrl = process.txLink;
            }
          }

          if (latestHash) {
            setState((s) => {
              if (s.step === 'executing') {
                return { ...s, step: 'confirming', txHash: latestHash, explorerUrl: latestExplorerUrl ?? s.explorerUrl };
              }
              return { ...s, txHash: latestHash, explorerUrl: latestExplorerUrl ?? s.explorerUrl };
            });
          }
        },
        // 5. Unconditional accepted exchange rate adjustments
        acceptExchangeRateUpdateHook: async () => true,
      });

      // 6. isRouteFullyCompleted check
      const isRouteCompleted = finalRoute.steps.every(
        (step) => step.execution?.status === 'DONE' && step.execution?.process?.every((p) => p.status === 'DONE')
      );

      if (isRouteCompleted) {
        // Optimistic portfolio update
        try {
          if (vault && address) {
            const key = `optimistic_portfolio_${address}`;
            const existing = JSON.parse(window.localStorage.getItem(key) ?? '[]');
            const token = vault.underlyingTokens[0];
            existing.push({
              chainId: vault.chainId,
              protocolName: vault.protocol.name,
              vaultName: vault.name,
              asset: {
                address: token?.address ?? '0x0',
                symbol: token?.symbol ?? 'UNK',
                decimals: token?.decimals ?? 18,
              },
              balanceNative: finalRoute.fromAmount ?? '0',
              balanceUsd: finalRoute.fromAmountUSD ?? '0',
              apy: vault.analytics.apy.total || 0,
            });
            window.localStorage.setItem(key, JSON.stringify(existing));
            window.dispatchEvent(new Event('portfolio-updated'));
          }
        } catch (e) {
          console.warn('[useDeposit] Optimistic portfolio save failed', e);
        }

        setState((s) => ({ ...s, step: 'success' }));
      } else {
        // Route halted before completion but no error was thrown
        setState((s) => ({ ...s, step: 'error', error: 'Route halted before completion' }));
      }
    } catch (err) {
      if (!terminalRef.current) {
        terminalRef.current = true;
        setState((s) => ({
          ...s,
          step: 'error',
          error: err instanceof Error ? err.message : 'Transaction failed',
        }));
      }
    }
  }, [state.route, vault, address]);

  const reset = useCallback(() => {
    terminalRef.current = false;
    setState({ step: 'idle', route: null, txHash: null, explorerUrl: null, error: null });
  }, []);

  return { ...state, fetchQuote, execute, reset };
};