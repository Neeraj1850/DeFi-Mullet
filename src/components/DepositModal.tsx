import React, { useState } from 'react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDeposit } from '../hooks/useDeposit';
import type { EarnVault } from '../types';

interface Props {
  vault: EarnVault;
  onClose: () => void;
}

const EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io/tx/',
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
  84532: 'https://sepolia.basescan.org/tx/',
};

const DepositModal: React.FC<Props> = ({ vault, onClose }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState('');
  const { step, route, txHash, error, fetchQuote, execute, reset } = useDeposit(vault);

  const token = vault.underlyingTokens[0];
  const explorer = EXPLORERS[vault.chainId] ?? 'https://etherscan.io/tx/';
  const apy = vault.analytics.apy.total;

  const { data: balanceData } = useBalance({
    address,
    token: token?.address as `0x${string}`,
    chainId: vault.chainId,
  });

  const isWrongChain = isConnected && chainId !== vault.chainId;
  const hasZeroBalance = balanceData !== undefined && balanceData.value === 0n;
  const isZapMode = isConnected && (isWrongChain || hasZeroBalance);

  const quoteStep = route?.steps[0];
  const toAmount = quoteStep?.estimate?.toAmount;
  const toDecimals = quoteStep?.action?.toToken?.decimals ?? 18;
  const toSymbol = quoteStep?.action?.toToken?.symbol ?? 'vault tokens';
  const gasCostUsd = quoteStep?.estimate?.gasCosts?.[0]?.amountUSD;

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
            <div className="connect-prompt">
              <p>Connect your wallet to deposit</p>
              <ConnectButton />
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

          {isConnected && (
            <>
              {(step === 'idle' || step === 'error') && (
                <>
                  <div className={`amount-row ${isZapMode ? 'zap-glow' : ''}`}>
                    <input
                      className="amount-input"
                      type="number"
                      min="0"
                      placeholder={isZapMode ? `Amount (Native Gas Token)` : `Amount (${token?.symbol ?? 'tokens'})`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button
                      className={`btn-primary ${isZapMode ? 'btn-zap' : ''}`}
                      disabled={!amount || parseFloat(amount) <= 0}
                      onClick={() => {
                        if (isZapMode) {
                          fetchQuote(amount, { chainId: chainId, tokenAddress: '0x0000000000000000000000000000000000000000', decimals: 18 });
                        } else {
                          fetchQuote(amount);
                        }
                      }}
                    >
                      {isZapMode ? 'Preview Zap' : 'Preview'}
                    </button>
                  </div>
                  {step === 'error' && error && (
                    <div className="deposit-error">{error}</div>
                  )}
                </>
              )}

              {step === 'quoting' && (
                <div className="deposit-loading">
                  <div className="spinner" />
                  Getting best route via LI.FI Composer...
                </div>
              )}

              {(step === 'quoted' || step === 'executing') && route && (
                <div className="quote-card">
                  <div className="quote-row">
                    <span>You deposit</span>
                    <strong>{amount} {token?.symbol}</strong>
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

                  <div className="quote-actions">
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
                        {txHash ? 'Confirming...' : 'Waiting for signature...'}
                      </button>
                    )}
                  </div>

                  {txHash && (
                    <a
                      className="tx-link"
                      href={`${explorer}${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View transaction
                    </a>
                  )}
                </div>
              )}

              {step === 'success' && (
                <div className="deposit-success">
                  <div className="success-icon">
                    <svg className="success-svg" viewBox="0 0 52 52">
                      <circle className="success-circle" cx="26" cy="26" r="25" fill="none" />
                      <path className="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                  </div>
                  <p>Deposit successful!</p>
                  {txHash && (
                    <a
                      className="tx-link"
                      href={`${explorer}${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on explorer
                    </a>
                  )}
                  <button className="btn-secondary" onClick={reset}>
                    Deposit more
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default DepositModal;