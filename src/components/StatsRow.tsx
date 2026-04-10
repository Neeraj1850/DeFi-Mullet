import React from 'react';
import type { EarnVault } from '../types';

interface Props {
  vaults: EarnVault[];
}

const fmt = (n: number): string => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};

const StatsRow: React.FC<Props> = ({ vaults }) => {
  const apys     = vaults.map(v => v.analytics.apy.total).filter((a): a is number => a !== null);
  const highest  = apys.length ? `${(Math.max(...apys) * 100).toFixed(2)}%` : '—';
  const totalTVL = vaults.reduce((s, v) => s + parseFloat(v.analytics.tvl.usd), 0);
  const chains   = new Set(vaults.map(v => v.chainId)).size;

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">Vaults found</div>
        <div className="stat-value">{vaults.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Highest APY</div>
        <div className="stat-value green">{highest}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total TVL</div>
        <div className="stat-value">{totalTVL > 0 ? fmt(totalTVL) : '—'}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Chains</div>
        <div className="stat-value">{chains}</div>
      </div>
    </div>
  );
};

export default StatsRow;