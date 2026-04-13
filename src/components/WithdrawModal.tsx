import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownCircle, ExternalLink, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useWithdraw, type WithdrawStep } from '../hooks/useWithdraw';
import type { PortfolioPosition } from '../types';

const CHAIN_META: Record<number, { name: string; color: string; explorer: string }> = {
  1:     { name: 'Ethereum', color: '#627EEA', explorer: 'https://etherscan.io/tx/' },
  8453:  { name: 'Base',     color: '#0052FF', explorer: 'https://basescan.org/tx/' },
  42161: { name: 'Arbitrum', color: '#28A0F0', explorer: 'https://arbiscan.io/tx/' },
  10:    { name: 'Optimism', color: '#FF0420', explorer: 'https://optimistic.etherscan.io/tx/' },
  137:   { name: 'Polygon',  color: '#8247E5', explorer: 'https://polygonscan.com/tx/' },
};

interface Props {
  position: PortfolioPosition;
  onClose: () => void;
}

const STEP_LABEL: Record<WithdrawStep, string> = {
  idle:       '',
  quoting:    'Getting withdrawal quote…',
  quoted:     '',
  executing:  'Submitting withdrawal…',
  confirming: 'Waiting for confirmation…',
  success:    'Withdrawal complete!',
  error:      '',
};

const WithdrawModal: React.FC<Props> = ({ position, onClose }) => {
  const { step, route, txHash, explorerUrl, toAmountUSD, error, fetchQuote, execute, reset } = useWithdraw();

  const chain = CHAIN_META[position.chainId] ?? { name: `Chain ${position.chainId}`, color: '#888', explorer: 'https://etherscan.io/tx/' };
  const usdValue = Number(position.balanceUsd) || 0;
  const nativeAmt = position.balanceNative
    ? (Number(position.balanceNative) / 10 ** (position.asset?.decimals || 18)).toFixed(6)
    : '—';

  // Auto-quote the full position on open
  useEffect(() => {
    fetchQuote(position);
  }, [fetchQuote, position]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const isLoading = step === 'quoting' || step === 'executing' || step === 'confirming';
  const canExecute = step === 'quoted' && !!route;

  // Estimated receive amount — token info is on step.action, amounts on estimate
  const firstStep = route?.steps?.[0];
  const estimate  = firstStep?.estimate;
  const actionTo  = firstStep?.action;                         // has toToken, decimals
  const toToken   = actionTo?.toToken;
  const toAmount  = estimate && toToken
    ? (Number(estimate.toAmount) / 10 ** (toToken.decimals ?? 18)).toFixed(6)
    : null;
  const toSymbol = toToken?.symbol ?? position.asset?.symbol ?? 'tokens';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 460,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #eeecea',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--ink)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800,
              }}>
                {position.protocolName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                  Withdraw Position
                </div>
                <div style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: chain.color, display: 'inline-block' }} />
                  {position.protocolName} · {chain.name}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Position Summary ── */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #eeecea' }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Your Position
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, fontSize: 26, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: 13, color: '#888' }}>
                {nativeAmt} {position.asset?.symbol}
              </span>
            </div>
            {position.vaultName && (
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{position.vaultName}</div>
            )}
          </div>

          {/* ── Main Body ── */}
          <div style={{ padding: '20px 24px' }}>
            
            {/* Quote loading */}
            {step === 'quoting' && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa' }}>
                <Loader2 size={28} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: 14 }}>Fetching best withdrawal route…</div>
              </div>
            )}

            {/* Quote ready */}
            {step === 'quoted' && route && (
              <div>
                <div style={{
                  padding: 16, background: '#f8f8f6', borderRadius: 12, border: '1px solid #eeecea',
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>You receive</span>
                    <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>
                      {toAmount ? `${toAmount} ${toSymbol}` : '—'}
                    </span>
                  </div>
                  {toAmountUSD && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#bbb' }}>Est. USD value</span>
                      <span style={{ fontSize: 12, color: '#888' }}>${Number(toAmountUSD).toFixed(2)}</span>
                    </div>
                  )}
                  {route.steps?.[0]?.estimate?.gasCosts?.[0]?.amountUSD && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: '#bbb' }}>Gas estimate</span>
                      <span style={{ fontSize: 12, color: '#888' }}>~${Number(route.steps[0].estimate.gasCosts[0].amountUSD).toFixed(4)}</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: '#bbb', marginBottom: 16, lineHeight: 1.5 }}>
                  This will redeem your entire position and return the underlying tokens to your wallet. 
                  The route is powered by LI.FI's on-chain Earn infrastructure.
                </div>
              </div>
            )}

            {/* Executing / Confirming */}
            {(step === 'executing' || step === 'confirming') && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  border: '3px solid var(--accent)', borderTopColor: 'transparent',
                  margin: '0 auto 16px',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                  {STEP_LABEL[step]}
                </div>
                {txHash && (
                  <a
                    href={`${chain.explorer}${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    View on Explorer <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}

            {/* Success */}
            {step === 'success' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={48} color="#00a65a" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Withdrawal Complete</div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                  Your funds have been returned to your wallet.
                </div>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', background: '#f0fdf4', color: '#00a65a',
                      borderRadius: 8, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    View Transaction <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            {/* Error */}
            {step === 'error' && (
              <div style={{
                padding: 16, background: '#fff8f8', border: '1px solid #fecdd3',
                borderRadius: 12, marginBottom: 16, display: 'flex', gap: 12,
              }}>
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#dc2626', marginBottom: 4 }}>
                    Withdrawal Failed
                  </div>
                  <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.5 }}>
                    {error ?? 'Unknown error'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer CTA ── */}
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
            {(step === 'success') && (
              <button
                onClick={handleClose}
                style={{
                  flex: 1, padding: '13px 0', background: 'var(--ink)', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Close
              </button>
            )}
            {step === 'error' && (
              <>
                <button
                  onClick={() => fetchQuote(position)}
                  style={{
                    flex: 1, padding: '13px 0', background: '#f4f3f0', color: 'var(--ink)',
                    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Retry Quote
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    flex: 1, padding: '13px 0', background: 'var(--ink)', color: '#fff',
                    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </>
            )}
            {canExecute && (
              <>
                <button
                  onClick={handleClose}
                  style={{
                    flex: '0 0 auto', padding: '13px 18px', background: '#f4f3f0', color: '#666',
                    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={execute}
                  style={{
                    flex: 1, padding: '13px 0',
                    background: 'linear-gradient(135deg, #00c97a, #00a65a)',
                    color: '#fff',
                    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <ArrowDownCircle size={16} />
                  Withdraw Full Position
                </button>
              </>
            )}
            {isLoading && (
              <button
                disabled
                style={{
                  flex: 1, padding: '13px 0', background: '#f4f3f0', color: '#aaa',
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                {STEP_LABEL[step]}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WithdrawModal;
