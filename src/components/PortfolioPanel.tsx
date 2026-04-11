import React, { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePortfolio } from '../hooks/usePortfolio';
import AnimatedNumber from './AnimatedNumber';
import { fmtTVL } from '../utils/format';

const CHAIN_NAMES: Record<number, string> = {
  1:     'Ethereum',
  8453:  'Base',
  42161: 'Arbitrum',
  10:    'Optimism',
  137:   'Polygon',
};

const CHAIN_COLORS: Record<number, string> = {
  1:     '#627EEA',
  8453:  '#0052FF',
  42161: '#28A0F0',
  10:    '#FF0420',
  137:   '#8247E5',
};

const PortfolioPanel: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { positions, loading, error, totalUsd, refresh } = usePortfolio(address);

  const stats = useMemo(() => {
    return {
      chains: new Set(positions.map((p) => p.chainId)).size,
      protocols: new Set(positions.map((p) => p.protocolName)).size,
    };
  }, [positions]);

  if (!isConnected) {
    return (
      <div className="portfolio-empty">
        <div className="portfolio-empty-pulse">
          <div className="portfolio-empty-pulse-inner" />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Connect your wallet</h3>
        <p>See your active DeFi positions across all supported protocols in one place.</p>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="portfolio-loading">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
          </div>
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
        <div className="portfolio-empty-pulse">
          <div className="portfolio-empty-pulse-inner" />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>No positions yet</h3>
        <p>Your positions will appear here after your first deposit.</p>
      </div>
    );
  }

  return (
    <div className="portfolio-panel">
      <div className="portfolio-header">
        <div className="portfolio-header-content">
          <div className="portfolio-total-label">Total deposited</div>
          <div className="portfolio-total">
            $<AnimatedNumber value={totalUsd} decimals={2} duration={1000} />
          </div>
          <div className="portfolio-chips">
            <span className="portfolio-chip">
              <span className="portfolio-dot" style={{ backgroundColor: '#fff', width: 6, height: 6 }} />
              {stats.protocols} Protocol{stats.protocols !== 1 ? 's' : ''}
            </span>
            <span className="portfolio-chip">
              <span className="portfolio-dot" style={{ backgroundColor: '#fff', width: 6, height: 6 }} />
              {stats.chains} Network{stats.chains !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button className="refresh-btn portfolio-header-content" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', background: 'transparent' }} onClick={refresh} title="Refresh">&#8635;</button>
      </div>

      <div className="portfolio-table-header">
        <span>Protocol</span>
        <span>Asset</span>
        <span>Network</span>
        <span>Balance</span>
        <span style={{ textAlign: 'right' }}>Value (USD)</span>
      </div>

      {positions.map((pos, i) => {
        const dotColor = CHAIN_COLORS[pos.chainId] || '#888';
        return (
          <div key={i} className="portfolio-row" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="protocol-cell">
              <div className="protocol-name">{pos.protocolName}</div>
            </div>
            
            <div className="mobile-row-stat">
              <span className="mobile-row-label desktop-hide">Asset</span>
              <span className="chain-badge">{pos.asset.symbol}</span>
            </div>
            
            <div className="mobile-row-stat">
              <span className="mobile-row-label desktop-hide">Network</span>
              <span className="chain-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="protocol-dot" style={{ background: dotColor, width: 8, height: 8 }} />
                {CHAIN_NAMES[pos.chainId] ?? `Chain ${pos.chainId}`}
              </span>
            </div>
            
            <div className="mobile-row-stat">
              <span className="mobile-row-label desktop-hide">Balance</span>
              <div className="portfolio-balance">
                {(Number(pos.balanceNative) / 10 ** pos.asset.decimals).toFixed(4)}
              </div>
            </div>
            
            <div className="mobile-row-stat">
              <span className="mobile-row-label desktop-hide">Value</span>
              <div className="portfolio-value" style={{ textAlign: 'right' }}>
                {fmtTVL(pos.balanceUsd.toString())}
              </div>
            </div>
          </div>
        );
      })}

      <div className="portfolio-footer footer">
        via LI.FI Earn
      </div>
    </div>
  );
};

export default PortfolioPanel;
