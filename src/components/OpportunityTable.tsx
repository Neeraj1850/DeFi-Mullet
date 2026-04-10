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
  return `$${n.toLocaleString()}`;
};

const fmtAPY = (apy: number | null): string =>
  apy !== null ? `${(apy * 100).toFixed(2)}%` : '—';

const Skeleton: React.FC = () => (
  <div className="skeleton-row">
    {[1,2,3,4,5].map(i => <div key={i} className="skeleton-cell" />)}
  </div>
);

const OpportunityTable: React.FC<Props> = ({
  vaults, loading, sortBy, onSortChange, onSelect,
}) => (
  <div className="table-wrapper">
    <div className="table-header">
      <span>Vault</span>
      <span>Chain</span>
      <span className={`sortable ${sortBy === 'apy' ? 'active' : ''}`} onClick={() => onSortChange('apy')}>
        APY {sortBy === 'apy' ? '↓' : ''}
      </span>
      <span className={`sortable ${sortBy === 'tvl' ? 'active' : ''}`} onClick={() => onSortChange('tvl')}>
        TVL {sortBy === 'tvl' ? '↓' : ''}
      </span>
      <span />
    </div>

    {loading
      ? Array(6).fill(0).map((_, i) => <Skeleton key={i} />)
      : vaults.map((vault) => (
        <div key={vault.slug} className="opp-row" onClick={() => onSelect(vault)}>
          <div className="protocol-cell">
            {vault.protocol.logoUri
              ? <img src={vault.protocol.logoUri} alt={vault.protocol.name} className="token-logo" />
              : <div className="protocol-dot" style={{ background: '#888' }} />
            }
            <div>
              <div className="protocol-name">{vault.name}</div>
              <div className="protocol-type">
                {vault.protocol.name} · {vault.underlyingTokens.map(t => t.symbol).join(', ')}
              </div>
            </div>
          </div>
          <div><span className="chain-badge">{vault.network}</span></div>
          <div className="apy-value">{fmtAPY(vault.analytics.apy.total)}</div>
          <div className="tvl-value">{fmtTVL(vault.analytics.tvl.usd)}</div>
          <div>
            <button className="deposit-btn" onClick={e => { e.stopPropagation(); onSelect(vault); }}>
              Deposit →
            </button>
          </div>
        </div>
      ))
    }
    {!loading && vaults.length === 0 && (
      <div className="empty-state">No vaults match your filters.</div>
    )}
  </div>
);

export default OpportunityTable;