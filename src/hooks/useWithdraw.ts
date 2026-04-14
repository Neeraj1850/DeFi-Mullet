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
 * Convert balanceNative (raw integer atomic units per LI.FI API docs) to a
 * validated fromAmount string for getQuote.
 *
 * API docs: balanceNative = "1523450000" means 1523.45 USDC (6 decimals)
 * i.e. it is already in atomic units — return as-is for integers.
 * If the value has a decimal point (legacy/unexpected), parseUnits it.
 */
function toRawAmount(balance: string, decimals: number): string {
  if (!balance || balance === '0') return '0';

  // Integer → already raw atomic units, return as-is (correct per API docs)
  if (!balance.includes('.')) {
    return balance;
  }

  // Decimal string (unexpected) → convert to raw units
  try {
    const [int, frac = ''] = balance.split('.');
    const fracTrunc = frac.slice(0, decimals).padEnd(decimals, '0');
    return parseUnits(`${int}.${fracTrunc}` as `${number}`, decimals).toString();
  } catch {
    const [int] = balance.split('.');
    return (BigInt(int || '0') * BigInt(10 ** decimals)).toString();
  }
}

/**
 * Resolve the vault receipt-token address from the LI.FI Earn vaults API.
 *
 * Strategy:
 * 1. Query vaults for the given chain, optionally filtered by protocol name.
 * 2. Find the vault whose underlyingTokens match the position's asset address.
 * 3. Return the vault's lpToken (receipt/share token) if present, otherwise the vault address itself.
 */
async function resolveVaultAddress(
  chainId: number,
  underlyingAddress: string,
  protocolHint?: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      chainId: String(chainId),
      limit: '50',
    });
    if (protocolHint) params.set('protocol', protocolHint);

    const res = await fetch(`${EARN_BASE}/vaults?${params}`, { headers: earnHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    let vaults: any[] = data.data ?? [];

    // Find a vault whose underlyingToken matches our position asset
    let match = vaults.find((v: any) =>
      v.underlyingTokens?.some((t: any) =>
        t.address?.toLowerCase() === underlyingAddress.toLowerCase()
      )
    );

    // If no match with protocol filter, retry without it
    if (!match && protocolHint) {
      const fallbackParams = new URLSearchParams({ chainId: String(chainId), limit: '100' });
      const fallbackRes = await fetch(`${EARN_BASE}/vaults?${fallbackParams}`, { headers: earnHeaders });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        vaults = fallbackData.data ?? [];
        match = vaults.find((v: any) =>
          v.underlyingTokens?.some((t: any) =>
            t.address?.toLowerCase() === underlyingAddress.toLowerCase()
          )
        );
      }
    }

    if (!match) return null;

    // Prefer the LP/receipt token over the vault address itself
    const receiptToken =
      match.lpTokens?.[0]?.address ??
      match.shareToken?.address ??
      match.receiptToken?.address ??
      match.address;   // vault address IS the receipt token for some protocols

    return receiptToken ?? null;
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
      // ── 1. Resolve raw fromAmount (already atomic units per API docs) ──────────
      let rawFromAmount: string;
      if (fromAmountOverride) {
        rawFromAmount = fromAmountOverride;
      } else {
        rawFromAmount = toRawAmount(position.balanceNative, decimals);
      }

      const usdValue = Number(position.balanceUsd || '0');

      // Sanity check A: if rawFromAmount implies a token amount > 10000x the USD value,
      // the balanceNative field is corrupted → derive from balanceUsd.
      const impliedTokens = Number(rawFromAmount) / 10 ** decimals;
      if (usdValue > 0 && impliedTokens > usdValue * 10000) {
        const safeDigits = Math.min(decimals, 6);
        const safeAmount = parseUnits(
          usdValue.toFixed(safeDigits) as `${number}`,
          decimals,
        ).toString();
        rawFromAmount = safeAmount;
        console.warn(
          `[useWithdraw] balanceNative sanity check failed (implied ${impliedTokens.toFixed(2)} tokens for $${usdValue}). ` +
          `Using USD-derived amount ${safeAmount} instead.`
        );
      }

      // Sanity check B: if rawFromAmount is still 0 but we have a USD value,
      // the API returned zero native balance → derive from USD (assume $1/token for stables)
      if ((!rawFromAmount || rawFromAmount === '0') && usdValue > 0) {
        const safeDigits = Math.min(decimals, 6);
        rawFromAmount = parseUnits(
          usdValue.toFixed(safeDigits) as `${number}`,
          decimals,
        ).toString();
        console.warn(
          `[useWithdraw] balanceNative is 0 but balanceUsd is $${usdValue}. ` +
          `Deriving fromAmount=${rawFromAmount} from USD value.`
        );
      }

      if (!rawFromAmount || rawFromAmount === '0') {
        throw new Error('This position has no redeemable balance. It may have already been fully withdrawn.');
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
        const resolved = await resolveVaultAddress(
          position.chainId,
          underlyingAddress,
          position.protocolName,   // hint for faster API match
        );
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

      // isCompleted: step-level DONE is the authoritative signal
      const isCompleted = finalRoute.steps.every((step) => {
        const stepDone = step.execution?.status === 'DONE';
        const noFailures = (step.execution?.process ?? []).every(
          (p) => p.status !== 'FAILED'
        );
        return stepDone && noFailures;
      });

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
