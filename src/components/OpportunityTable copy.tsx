import React from 'react';
import type { EarnVault, SortKey } from '../types';

interface Props {
  vaults: EarnVault[];
  loading: boolean;
  sortBy: SortKey;
  onSortChange: (k: SortKey) => void;
  onSelect: (v: EarnVault) => void;
}

const fmtTVL = (usd: string): string => {
  const n = parseFloat(usd);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

const fmtAPY = (v: number | null | undefined): string =>
  v != null ? `${(v * 100).toFixed(2)}%` : '—';

const apyTrend = (current: number | null, avg30d: number | null) => {
  if (current == null || avg30d == null || avg30d === 0) return null;
  const delta = current - avg30d;
  if (delta > 0.005)  return 'up';
  if (delta < -0.005) return 'down';
  return 'flat';
};

const Skeleton: React.FC = () => (
  <div className="skeleton-row">
    {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton-cell" />)}
  </div>
);

const OpportunityTable: React.FC<Props> = ({
  vaults, loading, sortBy, onSortChange, onSelect,
}) => (
  <div className="table-wrapper">
    <div className="table-header">
      <span>Vault</span>
      <span>Chain</span>
      <span
        className={`sortable ${sortBy === 'apy' ? 'active' : ''}`}
        onClick={() => onSortChange('apy')}
      >
        APY {sortBy === 'apy' ? '↓' : ''}
      </span>
      <span>30d avg</span>
      <span
        className={`sortable ${sortBy === 'tvl' ? 'active' : ''}`}
        onClick={() => onSortChange('tvl')}
      >
        TVL {sortBy === 'tvl' ? '↓' : ''}
      </span>
      <span />
    </div>

    {loading
      ? Array(8).fill(0).map((_, i) => <Skeleton key={i} />)
      : vaults.map((vault) => {
          const trend = apyTrend(vault.analytics.apy.total, vault.analytics.apy30d);
          return (
            <div
              key={vault.slug}
              className="opp-row"
              onClick={() => onSelect(vault)}
            >
              <div className="protocol-cell">
                {vault.protocol.logoUri
                  ? <img src={vault.protocol.logoUri} alt={vault.protocol.name} className="token-logo" />
                  : <div className="protocol-dot" />
                }
                <div style={{ minWidth: 0 }}>
                  <div className="protocol-name">{vault.name}</div>
                  <div className="protocol-type">
                    {vault.protocol.name}
                    <span style={{ opacity: 0.4 }}>·</span>
                    {vault.underlyingTokens.map((t) => t.symbol).join(', ')}
                    {vault.tags.includes('stablecoin') && (
                      <span className="tag-pill">stable</span>
                    )}
                    {(vault.timeLock ?? 0) > 0 && (
                      <span className="tag-pill warn">
                        {Math.floor((vault.timeLock ?? 0) / 86400)}d lock
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span className="chain-badge">{vault.network}</span>
              </div>

              <div className="apy-value">
                {fmtAPY(vault.analytics.apy.total)}
                {trend && (
                  <span className={`trend ${trend}`}>
                    {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '~'}
                  </span>
                )}
              </div>

              <div className="tvl-value muted">
                {fmtAPY(vault.analytics.apy30d)}
              </div>

              <div className="tvl-value">
                {fmtTVL(vault.analytics.tvl.usd)}
              </div>

              <div>
                {vault.isTransactional ? (
                  <button
                    className="deposit-btn"
                    onClick={(e) => { e.stopPropagation(); onSelect(vault); }}
                  >
                    Deposit
                  </button>
                ) : (
                  <span className="no-deposit-badge">View only</span>
                )}
              </div>
            </div>
          );
        })
    }

    {!loading && vaults.length === 0 && (
      <div className="empty-state">No vaults match your filters.</div>
    )}
  </div>
);

export default OpportunityTable;
