import React, { useState, useMemo } from 'react';
import { useAccount, useChainId, useBalance, useSwitchChain } from 'wagmi';
import { formatUnits } from 'viem';
import { useDeposit, type DepositStep } from '../hooks/useDeposit';
import type { EarnVault } from '../types';
import type { RouteExtended } from '@lifi/sdk';

interface Props {
  vault: EarnVault;
  onClose: () => void;
}

const EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io/tx/',
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
  84532: 'https://sepolia.basescan.org/tx/',
  10: 'https://optimistic.etherscan.io/tx/',
};

// FIXED: Defined dynamically once to ensure no inline re-derivations
const OMNI_ZAP_TOKENS: Record<number, { value: `0x${string}`; label: string; decimals: number }[]> = {
  1: [
    { value: '0x0000000000000000000000000000000000000000', label: 'ETH', decimals: 18 },
    { value: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', label: 'USDC', decimals: 6 },
  ],
  42161: [
    { value: '0x0000000000000000000000000000000000000000', label: 'ETH', decimals: 18 },
    { value: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', label: 'USDC', decimals: 6 },
  ],
  8453: [
    { value: '0x0000000000000000000000000000000000000000', label: 'ETH', decimals: 18 },
    { value: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', label: 'USDC', decimals: 6 },
  ],
  10: [
    { value: '0x0000000000000000000000000000000000000000', label: 'ETH', decimals: 18 },
    { value: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', label: 'USDC', decimals: 6 },
  ]
};

const DepositModal: React.FC<Props> = ({ vault, onClose }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const token = vault.underlyingTokens[0];
  const explorer = EXPLORERS[vault.chainId] ?? 'https://etherscan.io/tx/';
  const apy = vault.analytics.apy.total;

  // FIXED: Bug 2 & 5 - Compute availableTokens identically once at component mount
  const availableTokens = useMemo(() => {
    return OMNI_ZAP_TOKENS[chainId] || [{ value: '0x0000000000000000000000000000000000000000' as `0x${string}`, label: 'Native', decimals: 18 }];
  }, [chainId]);

  const [amount, setAmount] = useState('');
  const [zapToken, setZapToken] = useState<string>(availableTokens[0].value);
  const [zapDecimals, setZapDecimals] = useState<number>(availableTokens[0].decimals);

  const { step, route, txHash, explorerUrl, error, fetchQuote, execute, reset } = useDeposit(vault);

  React.useEffect(() => {
    // FIXED: Bug 2 - Reset selection if user dynamically switches chain while modal is open, referencing outer variable securely
    setZapToken(availableTokens[0].value);
    setZapDecimals(availableTokens[0].decimals);
  }, [chainId, availableTokens]);

  // Derived Zap Configuration
  const isZapNative = zapToken === '0x0000000000000000000000000000000000000000';
  const zapTokenAddress = isZapNative ? undefined : (zapToken as `0x${string}`);
  // FIXED: Bug 3 - Derived display label for Zap actions
  const depositLabel = availableTokens.find(t => t.value === zapToken)?.label ?? 'tokens';

  // State Fetching logic strictly protected by address presence
  const { data: targetTokenBalanceData, isLoading: loadingTargetToken } = useBalance({
    address,
    token: token?.address as `0x${string}`,
    chainId: vault.chainId,
    query: { enabled: !!address }
  });

  const { data: targetNativeBalanceData, isLoading: loadingTargetNative } = useBalance({
    address,
    chainId: vault.chainId,
    query: { enabled: !!address }
  });

  const { data: selectedZapBalanceData, isLoading: loadingZapBalance } = useBalance({
    address,
    chainId: chainId,
    token: zapTokenAddress,
    query: { enabled: !!address }
  });

  // True until all three balance queries have at least one result
  const isBalanceLoading = isConnected && (loadingTargetToken || loadingTargetNative || loadingZapBalance);

  // State Derivations Block
  const isWrongChain = isConnected && chainId !== vault.chainId;
  const targetTokenBalance = targetTokenBalanceData?.value ?? 0n;
  const targetNativeBalance = targetNativeBalanceData?.value ?? 0n;
  const selectedZapBalance = selectedZapBalanceData?.value ?? 0n; // FIXED: Bug 1 - Captures actual balance of selected zap token

  // Logicals
  // FIXED: isSwitchReady - True if the user is on wrong chain but ALREADY has enough underlying reserves waiting safely on destination chain
  const isSwitchReady = isWrongChain && targetTokenBalance > 0n && targetNativeBalance > 0n;

  // FIXED: Bug 1 - isZapMode explicitly guarantees user HAS spendable zapping payload BEFORE aggressively turning on mode
  const isZapMode = isConnected && !isSwitchReady && ((isWrongChain && selectedZapBalance > 0n) || (targetTokenBalance === 0n && selectedZapBalance > 0n));

  // ── Active balance (the token the user is actually spending) ──────────────
  // In normal mode  → underlying vault token (USDC, USDT, etc.) on the target chain
  // In zap mode     → whichever token the user selected in the ZapTokenSelector
  const activeBalance = isZapMode ? selectedZapBalance : targetTokenBalance;
  const activeDecimals = isZapMode ? zapDecimals : (token?.decimals ?? 18);
  const activeLabel = isZapMode ? depositLabel : (token?.symbol ?? 'tokens');

  // FIXED: hasNoBalance must reflect the token being spent, not always ETH
  // Also: only show "no balance" AFTER balances have loaded to prevent flicker
  const hasNoBalance = isConnected && !isBalanceLoading && activeBalance === 0n;

  // FIXED: exceedsBalance must compare against the correct token's balance
  const exceedsBalance = !!amount && Number(amount) > Number(formatUnits(activeBalance, activeDecimals));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal deposit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{vault.protocol.name}</h2>
            <span className="chain-badge">{vault.network}</span>
          </div>
          <button className="close-btn" onClick={onClose}>&#10005;</button>
        </div>

        <div className="modal-body">
          <div className="deposit-stats">
            <div className="deposit-stat">
              <span>APY</span>
              <strong className="green">
                {apy !== null ? `${apy.toFixed(2)}%` : '—'}
              </strong>
            </div>
            <div className="deposit-stat">
              <span>Asset</span>
              <strong>{token?.symbol ?? '—'}</strong>
            </div>
            <div className="deposit-stat">
              <span>TVL</span>
              <strong>${(parseFloat(vault.analytics.tvl.usd) / 1e6).toFixed(1)}M</strong>
            </div>
          </div>

          {!isConnected && (
            <div className="deposit-disconnected-actions">
              <div style={{ padding: '12px', background: 'var(--ink)', color: 'var(--surface)', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                Please connect your wallet at the top of the page to deposit.
              </div>
            </div>
          )}

          {isConnected && isSwitchReady && (
            <div className="omni-zap-banner" style={{ borderColor: 'rgba(0, 150, 255, 0.3)' }}>
              <div className="zap-header">
                <span className="zap-icon">🔄</span>
                <strong>Ready to Deposit</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>
                You already hold {token?.symbol} and gas on {vault.network}! Please switch your network to deposit without bridging fees.
              </p>
            </div>
          )}

          {isConnected && isZapMode && (step === 'idle' || step === 'error') && (
            <div className="omni-zap-banner">
              <div className="zap-header">
                <span className="zap-icon">⚡</span>
                <strong>Omni-Zap™ Route Available</strong>
              </div>
              <p>
                {isWrongChain
                  ? `You are connected to Chain ${chainId}. Teleport native tokens into this ${vault.network} vault without manually bridging!`
                  : `Zero ${token?.symbol} detected on ${vault.network}. Teleport your native gas token directly into the vault!`
                }
              </p>
            </div>
          )}

          {isConnected && hasNoBalance && (
            <div className="omni-zap-banner" style={{ background: '#111', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
              <div className="zap-header" style={{ color: 'var(--text-primary)' }}>
                <span className="zap-icon" style={{ filter: 'none' }}>⚠️</span>
                <strong style={{ color: '#fff' }}>Insufficient Funds</strong>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                You have no {activeLabel} on this network to deposit. Please load assets into your wallet to proceed.
              </p>
            </div>
          )}

          {/* ── Success: shown outside the hasNoBalance gate so it always renders ── */}
          {isConnected && step === 'success' && (
            <div className="deposit-success">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="2" fill="none">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3>{isZapMode ? 'Zap Successful! 🛸' : 'Deposit Successful!'}</h3>
              <p>Your assets are now earning yield in the <strong>{vault.protocol.name}</strong> vault.</p>
              {(explorerUrl ?? txHash) && (
                <a
                  className="tx-link"
                  style={{ marginTop: 16, display: 'block', textAlign: 'center' }}
                  href={explorerUrl ?? (txHash ? `${explorer}${txHash}` : '')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer →
                </a>
              )}
              <button
                className="btn-secondary"
                onClick={onClose}
                style={{ marginTop: 16, width: '100%' }}
              >
                Close
              </button>
            </div>
          )}

          {isConnected && step !== 'success' && (
            <>
              {(step === 'idle' || step === 'error') && (
                <>
                  <div className={`amount-row ${isZapMode ? 'zap-glow' : ''}`} style={{ flexWrap: 'wrap' }}>
                    {isZapMode && (
                      <ZapTokenSelector
                        availableTokens={availableTokens}
                        zapToken={zapToken}
                        setZapToken={setZapToken}
                        setZapDecimals={setZapDecimals}
                        selectedZapBalance={selectedZapBalance}
                        zapDecimals={zapDecimals}
                      />
                    )}
                    <div style={{ display: 'flex', flex: 1, gap: 8 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          className="amount-input"
                          type="number"
                          min="0"
                          placeholder={isZapMode ? `Amount in ${depositLabel}` : `Amount in ${token?.symbol ?? 'tokens'}`}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          style={{ width: '100%', paddingRight: '50px' }}
                        />
                        {/* FIXED: Bug 6 - MAX button support injecting exact formatted selectedZapBalance array precision */}
                        <button
                          onClick={() => setAmount(formatUnits(activeBalance, activeDecimals))}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                        >
                          MAX
                        </button>
                      </div>

                      {isSwitchReady ? (
                        <button
                          className="btn-primary"
                          onClick={() => switchChain({ chainId: vault.chainId as any })}
                        >
                          Switch to {vault.network}
                        </button>
                      ) : (
                        <button
                          className={`btn-primary ${isZapMode ? 'btn-zap' : ''}`}
                          disabled={!amount || parseFloat(amount) <= 0 || exceedsBalance}
                          onClick={() => {
                            if (isZapMode) {
                              fetchQuote(amount, { chainId: chainId, tokenAddress: zapToken, decimals: zapDecimals });
                            } else {
                              fetchQuote(amount);
                            }
                          }}
                        >
                          {isZapMode ? 'Preview Zap' : 'Preview'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Balance display — always shows the correct spending token */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, padding: '0 2px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>
                      Balance:{' '}
                      <strong style={{ color: activeBalance > 0n ? 'var(--text-primary)' : 'var(--error, #e53e3e)' }}>
                        {Number(formatUnits(activeBalance, activeDecimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {activeLabel}
                      </strong>
                    </span>
                    {exceedsBalance && (
                      <span style={{ color: 'var(--error, #e53e3e)', fontSize: 12, fontWeight: 600 }}>
                        Insufficient {activeLabel}
                      </span>
                    )}
                  </div>
                  {step === 'error' && error && (
                    <div className="deposit-error" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <span>{error}</span>
                      {/* FIXED: Requirement E - Retry block explicitly exposed alongside manual reset array mapping onto active state resets */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-primary" onClick={() => fetchQuote()} style={{ flex: 1 }}>Retry Quote</button>
                        <button className="btn-secondary" onClick={reset} style={{ flex: 1 }}>Change amount</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {step === 'quoting' && (
                <div className="deposit-loading">
                  <div className="spinner" />
                  Getting best route via LI.FI Composer...
                </div>
              )}

              {(step === 'quoted' || step === 'executing' || step === 'confirming') && route && (
                <QuoteCard
                  route={route}
                  amount={amount}
                  depositLabel={isZapMode ? depositLabel : (token?.symbol ?? 'tokens')}
                  step={step}
                  execute={execute}
                  reset={reset}
                  txHash={txHash}
                  explorerUrl={explorerUrl}
                  explorer={explorer}
                />
              )}

              {/* Old success block removed — now rendered above the hasNoBalance gate */}

            </>
          )}

        </div>
      </div>
    </div>
  );
};

// Subcomponents extracted for code quality:

// FIXED: Requirement A - Balance inline row output alongside Zap UI overlay mapping token selector logic natively isolated
const ZapTokenSelector = ({ availableTokens, zapToken, setZapToken, setZapDecimals, selectedZapBalance, zapDecimals }: any) => {
  return (
    <div style={{ width: '100%', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <select
        className="amount-input zap-token-select"
        value={zapToken}
        onChange={(e) => {
          const val = e.target.value;
          setZapToken(val);
          const t = availableTokens.find((x: any) => x.value === val);
          setZapDecimals(t?.decimals ?? 18);
        }}
        style={{ maxWidth: '140px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', appearance: 'none', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '14px', fontWeight: 500, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23888\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}
      >
        {availableTokens.map((t: any) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        Balance: {Number(formatUnits(selectedZapBalance, zapDecimals)).toFixed(4)}
      </div>
    </div>
  );
};

// FIXED: Route details layout strictly parsing LIFI action arrays dynamically presenting visual paths
const QuoteCard = ({ route, amount, depositLabel, step, execute, reset, txHash, explorerUrl, explorer }: any) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const quoteStep = route?.steps[0];
  const toAmount = quoteStep?.estimate?.toAmount;
  const toDecimals = quoteStep?.action?.toToken?.decimals ?? 18;
  const toSymbol = quoteStep?.action?.toToken?.symbol ?? 'vault tokens';
  const gasCostUsd = quoteStep?.estimate?.gasCosts?.[0]?.amountUSD;
  const fromLogo = quoteStep?.action?.fromToken?.logoURI;

  // FIXED: Requirement B - Explicit cross chain slippage deviation calculation logic alerting natively inside modal parameters
  const inputUSD = Number(quoteStep?.estimate?.fromAmountUSD ?? 0);
  const outputUSD = Number(quoteStep?.estimate?.toAmountUSD ?? 0);
  const slippage = inputUSD > 0 ? (inputUSD - outputUSD) / inputUSD : 0;
  const showSlippageWarning = slippage > 0.005;

  return (
    <div className="quote-card">
      <div className="quote-row">
        <span>You deposit</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* FIXED: Requirement D - 20x20 token icon dynamically mounted from available route API return map safely ignoring external blobs until quoted */}
          {fromLogo && <img src={fromLogo} alt="token icon" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
          <strong>{amount} {depositLabel}</strong>
        </div>
      </div>
      <div className="quote-row">
        <span>You receive</span>
        <strong>
          ~{toAmount
            ? (Number(toAmount) / 10 ** toDecimals).toFixed(6)
            : '—'
          } {toSymbol}
        </strong>
      </div>
      {gasCostUsd && (
        <div className="quote-row">
          <span>Est. gas</span>
          <strong>${parseFloat(gasCostUsd).toFixed(2)}</strong>
        </div>
      )}
      <div className="quote-row">
        <span>Via</span>
        <strong>LI.FI Composer</strong>
      </div>

      {showSlippageWarning && (
        <div style={{ padding: '8px 12px', background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.3)', borderRadius: 8, marginTop: 12, fontSize: 13, color: '#d97706' }}>
          High slippage: {(slippage * 100).toFixed(2)}% — price impact may be significant.
        </div>
      )}

      {/* FIXED: Requirement C - Fully retractable details segment listing complex multifeatured execution pipelines */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setDetailsExpanded(prev => !prev)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
        >
          {detailsExpanded ? 'Hide route details' : 'Show route details'}
        </button>
        {detailsExpanded && (
          <div style={{ padding: '12px', background: 'var(--background)', borderRadius: 8, marginTop: 8, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)' }}>
            {route.steps.map((st: any, i: number) => (
              <div key={i}>
                {st.action.fromChainId} → {st.action.fromToken.symbol} → {st.toolDetails?.name ?? st.tool} → {st.action.toChainId}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="quote-actions" style={{ marginTop: 16 }}>
        {step === 'quoted' && (
          <>
            <button className="btn-primary" onClick={execute}>
              Confirm Deposit
            </button>
            <button className="btn-secondary" onClick={reset}>
              Back
            </button>
          </>
        )}
        {step === 'executing' && (
          <button className="btn-primary" disabled>
            <span className="spinner-sm" />
            Waiting for signature...
          </button>
        )}
        {/* FIXED: Bug 7 - Confirming on-chain spinner explicit state exposure decoupling signature awaiting array limits */}
        {step === 'confirming' && (
          <button className="btn-primary" disabled>
            <span className="spinner-sm" />
            Confirming on-chain...
          </button>
        )}
      </div>

      {(step === 'confirming' || txHash) && (explorerUrl ?? txHash) && (
        <a
          className="tx-link"
          style={{ marginTop: 16, display: 'block', textAlign: 'center' }}
          href={explorerUrl ?? (txHash ? `${explorer}${txHash}` : '')}
          target="_blank"
          rel="noopener noreferrer"
        >
          View transaction
        </a>
      )}
    </div>
  );
};

export default DepositModal;