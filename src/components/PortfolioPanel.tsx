import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePortfolio } from '../hooks/usePortfolio';
import AnimatedNumber from './AnimatedNumber';

const CHAIN_NAMES: Record<number, string> = {
  1:     'Ethereum',
  8453:  'Base',
  42161: 'Arbitrum',
  10:    'Optimism',
  137:   'Polygon',
};

const fmt = (usd: string): string => {
  const n = parseFloat(usd);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};

const PortfolioPanel: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { positions, loading, error, totalUsd, refresh } = usePortfolio(address);

  if (!isConnected) {
    return (
      <div className="portfolio-empty">
        <div className="portfolio-empty-icon">◎</div>
        <h3>Connect your wallet</h3>
        <p>See your active DeFi positions across all supported protocols in one place.</p>
        <ConnectButton />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="portfolio-loading">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="portfolio-skeleton" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-empty">
        <p className="error-text">Failed to load: {error}</p>
        <button className="btn-secondary" onClick={refresh}>Try again</button>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="portfolio-empty">
        <div className="portfolio-empty-icon">◎</div>
        <h3>No positions yet</h3>
        <p>You have no active positions in supported protocols. Head to Explore to deposit into your first vault.</p>
      </div>
    );
  }

  return (
    <div className="portfolio-panel">
      <div className="portfolio-header">
        <div>
          <div className="portfolio-total-label">Total deposited</div>
          <div className="portfolio-total">
            $<AnimatedNumber value={totalUsd} decimals={2} duration={1000} />
          </div>
        </div>
        <button className="refresh-btn" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }} onClick={refresh} title="Refresh">&#8635;</button>
      </div>

      <div className="portfolio-table-header">
        <span>Protocol</span>
        <span>Asset</span>
        <span>Network</span>
        <span>Balance</span>
        <span>Value (USD)</span>
      </div>

      {positions.map((pos, i) => (
        <div key={i} className="portfolio-row" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="portfolio-protocol">
            <span className="portfolio-dot" />
            <span>{pos.protocolName}</span>
          </div>
          <div>
            <span className="chain-badge">{pos.asset.symbol}</span>
          </div>
          <div>
            <span className="chain-badge">
              {CHAIN_NAMES[pos.chainId] ?? `Chain ${pos.chainId}`}
            </span>
          </div>
          <div className="portfolio-balance">
            {(Number(pos.balanceNative) / 10 ** pos.asset.decimals).toFixed(4)}
          </div>
          <div className="portfolio-value">
            {fmt(pos.balanceUsd)}
          </div>
        </div>
      ))}

      <div className="portfolio-footer">
        {positions.length} position{positions.length !== 1 ? 's' : ''} across {new Set(positions.map((p) => p.chainId)).size} chain{new Set(positions.map((p) => p.chainId)).size !== 1 ? 's' : ''} · via LI.FI Earn
      </div>
    </div>
  );
};

export default PortfolioPanel;
