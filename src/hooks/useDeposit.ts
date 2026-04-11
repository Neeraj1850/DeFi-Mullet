import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  getQuote,
  convertQuoteToRoute,
  executeRoute,
  type RouteExtended,
} from '@lifi/sdk';
import { parseUnits } from 'viem';
import type { EarnVault } from '../types';

export type DepositStep =
  | 'idle'
  | 'quoting'
  | 'quoted'
  | 'executing'
  | 'success'
  | 'error';

interface DepositState {
  step: DepositStep;
  route: RouteExtended | null;
  txHash: string | null;
  error: string | null;
}

export const useDeposit = (vault: EarnVault | null) => {
  const { address } = useAccount();
  const [state, setState] = useState<DepositState>({
    step: 'idle',
    route: null,
    txHash: null,
    error: null,
  });

  const fetchQuote = useCallback(async (amount: string) => {
    if (!vault || !address) return;

    const underlyingToken = vault.underlyingTokens[0];
    if (!underlyingToken) return;

    setState({ step: 'quoting', route: null, txHash: null, error: null });

    try {
      const amountWei = parseUnits(amount, underlyingToken.decimals).toString();

      const quote = await getQuote({
        fromChain:   vault.chainId,
        toChain:     vault.chainId,
        fromToken:   underlyingToken.address,
        toToken:     vault.address,          // vault address triggers Composer
        fromAmount:  amountWei,
        fromAddress: address,
        toAddress:   address,
      });

      const route = convertQuoteToRoute(quote);
      setState((s) => ({ ...s, step: 'quoted', route }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'error',
        error: err instanceof Error ? err.message : 'Failed to get quote',
      }));
    }
  }, [vault, address]);

  const execute = useCallback(async () => {
    if (!state.route) return;

    setState((s) => ({ ...s, step: 'executing', error: null }));

    try {
      // executeRoute handles: approval check → approval tx → deposit tx → status polling
      const executed = await executeRoute(state.route, {
        updateRouteHook: (updatedRoute) => {
          // Grab tx hash as soon as it's available
          for (const step of updatedRoute.steps) {
            for (const process of step.execution?.process ?? []) {
              if (process.txHash) {
                setState((s) => ({ ...s, txHash: process.txHash ?? null }));
              }
            }
          }
        },
      });

      // Extract final tx hash from last process
      const lastStep = executed.steps[executed.steps.length - 1];
      const lastProcess = lastStep?.execution?.process?.slice(-1)[0];

      setState((s) => ({
        ...s,
        step: 'success',
        txHash: lastProcess?.txHash ?? s.txHash,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'error',
        error: err instanceof Error ? err.message : 'Transaction failed',
      }));
    }
  }, [state.route]);

  const reset = useCallback(() => {
    setState({ step: 'idle', route: null, txHash: null, error: null });
  }, []);

  return { ...state, fetchQuote, execute, reset };
};