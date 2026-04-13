import { useState, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  getQuote,
  convertQuoteToRoute,
  executeRoute,
  type RouteExtended,
} from '@lifi/sdk';
import { parseUnits } from 'viem';
import type { PortfolioPosition } from '../types';
import { EARN_BASE, earnHeaders } from '../api/earn';

export type WithdrawStep =
  | 'idle' | 'quoting' | 'quoted'
  | 'executing' | 'confirming' | 'success' | 'error';

interface WithdrawState {
  step: WithdrawStep;
  route: RouteExtended | null;
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
  toAmountUSD: string | null;
}

/**
 * Convert a balance string that may be decimal ("0.000997") or integer ("997")
 * into a raw BigInt-compatible string in the token's smallest unit.
 *
 * LI.FI's portfolio API returns `balanceNative` as a human-readable decimal
 * (e.g. "0.000997" USDC), but getQuote() requires `fromAmount` as an integer
 * string in atomic units (e.g. "997" for USDC with 6 decimals).
 */
function toRawAmount(balance: string, decimals: number): string {
  if (!balance || balance === '0') return '0';

  // If it already looks like a large integer (no decimal point, >6 chars), use as-is
  if (!balance.includes('.')) {
    return balance;
  }

  // Decimal string → parse into raw units via viem
  try {
    return parseUnits(balance as `${number}`, decimals).toString();
  } catch {
    // Fallback: manual multiplication with rounding
    const [int, frac = ''] = balance.split('.');
    const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
    const raw = BigInt(int) * BigInt(10 ** decimals) + BigInt(fracPadded);
    return raw.toString();
  }
}

/**
 * When the portfolio API doesn't return a distinct vault address (vaultAddress
 * equals the underlying asset address), we try to look it up from the
 * LI.FI Earn vaults API by matching chain + underlying token.
 */
async function resolveVaultAddress(
  chainId: number,
  underlyingAddress: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      chainId: String(chainId),
      limit: '5',
    });
    const res = await fetch(`${EARN_BASE}/vaults?${params}`, { headers: earnHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    const vaults: any[] = data.data ?? [];
    // Find a vault whose underlyingToken matches
    const match = vaults.find((v: any) =>
      v.underlyingTokens?.some((t: any) =>
        t.address?.toLowerCase() === underlyingAddress.toLowerCase()
      ),
    );
    return match?.address ?? null;
  } catch {
    return null;
  }
}

export const useWithdraw = () => {
  const { address } = useAccount();
  const terminalRef = useRef(false);

  const [state, setState] = useState<WithdrawState>({
    step: 'idle', route: null, txHash: null, explorerUrl: null, error: null, toAmountUSD: null,
  });

  const fetchQuote = useCallback(async (
    position: PortfolioPosition,
    /** Optional override for the raw amount — must be BigInt string. */
    fromAmountOverride?: string,
  ) => {
    if (!address) return;

    const underlyingAddress = position.asset?.address;
    const decimals          = position.asset?.decimals ?? 18;

    if (!underlyingAddress) {
      setState(s => ({ ...s, step: 'error', error: 'Position is missing underlying asset address' }));
      return;
    }

    terminalRef.current = false;
    setState({ step: 'quoting', route: null, txHash: null, explorerUrl: null, error: null, toAmountUSD: null });

    try {
      // ── 1. Resolve raw fromAmount (always integer wei-like string) ────────────
      let rawFromAmount: string;
      if (fromAmountOverride) {
        rawFromAmount = fromAmountOverride;
      } else {
        rawFromAmount = toRawAmount(position.balanceNative, decimals);
      }

      if (!rawFromAmount || rawFromAmount === '0') {
        throw new Error('No redeemable balance — position balance is zero');
      }

      // ── 2. Resolve vault receipt-token address ────────────────────────────────
      //
      // fromToken must be the vault's receipt/share token (NOT the underlying).
      // If the portfolio API returned a distinct vaultAddress, use it.
      // If vaultAddress === underlyingAddress (or is absent), try to look it up
      // from the Earn vaults API.
      let fromToken = position.vaultAddress;

      const sameAsUnderlying =
        !fromToken ||
        fromToken.toLowerCase() === underlyingAddress.toLowerCase();

      if (sameAsUnderlying) {
        const resolved = await resolveVaultAddress(position.chainId, underlyingAddress);
        if (resolved) {
          fromToken = resolved;
        } else {
          // Cannot safely construct the withdrawal — avoid a 400 from LI.FI
          throw new Error(
            `Vault contract address unavailable for ${position.asset?.symbol} on chain ${position.chainId}. ` +
            `Please withdraw directly on the ${position.protocolName} protocol page.`,
          );
        }
      }

      // ── 3. Fire the LI.FI withdrawal quote ───────────────────────────────────
      const quote = await getQuote({
        fromChain:   position.chainId,
        toChain:     position.chainId,
        fromToken:   fromToken!,        // vault receipt token
        toToken:     underlyingAddress, // underlying asset (USDC, ETH, …)
        fromAmount:  rawFromAmount,     // validated integer string
        fromAddress: address,
        toAddress:   address,
      });

      setState(s => ({
        ...s,
        step: 'quoted',
        route: convertQuoteToRoute(quote),
        toAmountUSD: quote.estimate?.toAmountUSD ?? null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get withdrawal quote';
      setState(s => ({ ...s, step: 'error', error: msg }));
    }
  }, [address]);

  const execute = useCallback(async () => {
    if (!state.route) return;
    terminalRef.current = false;
    setState(s => ({ ...s, step: 'executing', error: null, txHash: null, explorerUrl: null }));

    try {
      const finalRoute = await executeRoute(state.route, {
        updateRouteHook: (updatedRoute) => {
          let latestHash: string | null = null;
          let latestUrl:  string | null = null;
          for (const step of updatedRoute.steps) {
            for (const process of step.execution?.process ?? []) {
              if (process.txHash) latestHash = process.txHash;
              if (process.txLink) latestUrl  = process.txLink;
            }
          }
          if (latestHash) {
            setState(s => {
              if (s.step === 'executing') {
                return { ...s, step: 'confirming', txHash: latestHash, explorerUrl: latestUrl ?? s.explorerUrl };
              }
              return { ...s, txHash: latestHash, explorerUrl: latestUrl ?? s.explorerUrl };
            });
          }
        },
        acceptExchangeRateUpdateHook: async () => true,
      });

      const isCompleted = finalRoute.steps.every(
        step =>
          step.execution?.status === 'DONE' &&
          step.execution?.process?.every(p => p.status === 'DONE'),
      );

      if (isCompleted) {
        // Clean up optimistic deposit for this position
        try {
          if (address) {
            const key = `optimistic_portfolio_${address}`;
            const existing: any[] = JSON.parse(window.localStorage.getItem(key) ?? '[]');
            const filtered = existing.filter(
              p => p.asset?.address !== state.route?.fromToken?.address,
            );
            window.localStorage.setItem(key, JSON.stringify(filtered));
            window.dispatchEvent(new Event('portfolio-updated'));
          }
        } catch { /* non-critical */ }
        setState(s => ({ ...s, step: 'success' }));
      } else {
        setState(s => ({ ...s, step: 'error', error: 'Transaction stalled before completion' }));
      }
    } catch (err) {
      if (!terminalRef.current) {
        terminalRef.current = true;
        setState(s => ({
          ...s,
          step: 'error',
          error: err instanceof Error ? err.message : 'Withdrawal failed',
        }));
      }
    }
  }, [state.route, address]);

  const reset = useCallback(() => {
    terminalRef.current = false;
    setState({ step: 'idle', route: null, txHash: null, explorerUrl: null, error: null, toAmountUSD: null });
  }, []);

  return { ...state, fetchQuote, execute, reset };
};
