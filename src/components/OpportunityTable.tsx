import React, { useMemo } from 'react';
import type { EarnVault, SortKey } from '../types';
import { fmtTVL, fmtAPY } from '../utils/format';
import VaultScoreBadge from './VaultScoreBadge';

interface Props {
  vaults: EarnVault[];
  loading: boolean;
  sortBy: SortKey;
  onSortChange: (k: SortKey) => void;
  onSelect: (v: EarnVault) => void;
  onClearFilters?: () => void;
}

const apyTrend = (current: number | null, avg30d: number | null) => {
  if (current == null || avg30d == null || avg30d === 0) return null;
  const delta = current - avg30d;
  if (delta > 0.005)  return 'up';
  if (delta < -0.005) return 'down';
  return 'flat';
};

const Skeleton: React.FC = () => (
  <div className="skeleton-row">
    {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton-cell" />)}
  </div>
);

const OpportunityRow = React.memo(({
  vault,
  index,
  onSelect
}: {
  vault: EarnVault;
  index: number;
  onSelect: (v: EarnVault) => void;
}) => {
  const trend = apyTrend(vault.analytics.apy.total, vault.analytics.apy30d);

  return (
    <div
      className="opp-row"
      onClick={() => onSelect(vault)}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="protocol-cell">
        <div className="token-logo-wrap">
          {vault.protocol.logoUri ? (
            <img src={vault.protocol.logoUri} alt={vault.protocol.name} className="token-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="protocol-dot" />
          )}
          {vault.rewardTokens && vault.rewardTokens.map((rt, i) => (
            <img key={i} src={`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${rt.address}/logo.png`} alt={rt.symbol} className="reward-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ))}
        </div>
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

      <div className="mobile-row-stat">
        <span className="mobile-row-label desktop-hide">Network</span>
        <span className="chain-badge">{vault.network}</span>
      </div>

      <div className="mobile-row-stat">
        <span className="mobile-row-label desktop-hide">APY</span>
        <div className="apy-value">
          {fmtAPY(vault.analytics.apy.total)}
          {trend && (
            <span className={`trend ${trend}`}>
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '~'}
            </span>
          )}
        </div>
      </div>

      <div className="mobile-row-stat desktop-only">
        <span className="mobile-row-label desktop-hide">30d Avg</span>
        <div className="tvl-value muted">
          {fmtAPY(vault.analytics.apy30d)}
        </div>
      </div>

      <div className="mobile-row-stat">
        <span className="mobile-row-label desktop-hide">TVL</span>
        <div className="tvl-value">
          {fmtTVL(vault.analytics.tvl.usd)}
        </div>
      </div>

      <div className="mobile-row-stat">
        <span className="mobile-row-label desktop-hide">Score</span>
        <VaultScoreBadge vault={vault} />
      </div>

      <div className="mobile-row-stat action-cell">
        {vault.isTransactional ? (
          <button
            className="deposit-btn"
            onClick={(e) => { e.stopPropagation(); onSelect(vault); }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>Deposit</span>
          </button>
        ) : (
          <span className="no-deposit-badge">View only</span>
        )}
      </div>
    </div>
  );
});

const OpportunityTable: React.FC<Props> = ({
  vaults, loading, sortBy, onSortChange, onSelect, onClearFilters
}) => {
  const bestVault = useMemo(() => {
    if (vaults.length === 0) return null;
    return [...vaults].sort((a, b) => (b.analytics.apy.total ?? 0) - (a.analytics.apy.total ?? 0))[0];
  }, [vaults]);

  return (
    <>
      {!loading && bestVault && (
        <div className="best-yield-banner">
          <div className="best-yield-left">
            <span className="best-yield-pill">Highest Yield</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {bestVault.protocol.logoUri && (
                <img src={bestVault.protocol.logoUri} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
              )}
              <span className="protocol-name">{bestVault.name}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="apy-value">{fmtAPY(bestVault.analytics.apy.total)}</span>
            <button className="deposit-btn" onClick={() => onSelect(bestVault)}>
              <span style={{ position: 'relative', zIndex: 1 }}>Deposit</span>
            </button>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <div className="table-header">
          <span>Vault</span>
          <span>Chain</span>
          <span
            className={`sortable ${sortBy === 'apy' ? 'active' : ''}`}
            onClick={() => onSortChange('apy')}
          >
            APY <span className={`sort-arrow ${sortBy === 'apy' ? 'up' : ''}`}>↓</span>
          </span>
          <span>30d avg</span>
          <span
            className={`sortable ${sortBy === 'tvl' ? 'active' : ''}`}
            onClick={() => onSortChange('tvl')}
          >
            TVL <span className={`sort-arrow ${sortBy === 'tvl' ? 'up' : ''}`}>↓</span>
          </span>
          <span>Score</span>
          <span />
        </div>

        <div className="table-body">

        {loading
          ? Array(8).fill(0).map((_, i) => <Skeleton key={i} />)
          : vaults.map((vault, i) => (
              <OpportunityRow
                key={vault.slug}
                vault={vault}
                index={i}
                onSelect={onSelect}
              />
            ))
        }

        {!loading && vaults.length === 0 && (
          <div className="empty-state">
            <div className="empty-svg-wrap">
              <div className="empty-pattern" />
              <h3>No vaults match your filters</h3>
              <p style={{ color: '#999', fontSize: '13px', margin: '8px 0 16px 0' }}>Try removing some filters to see available opportunities.</p>
              {onClearFilters && (
                <button className="btn-secondary" onClick={onClearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default OpportunityTable;
