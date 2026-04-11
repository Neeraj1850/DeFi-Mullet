import React from 'react';
import AnimatedNumber from './AnimatedNumber';
import type { EarnVault } from '../types';

interface Props {
  vaults: EarnVault[];
  total: number;
}

const StatsRow: React.FC<Props> = ({ vaults, total }) => {
  const apys = vaults.map((v) => v.analytics.apy.total).filter((a): a is number => a !== null);
  const highestAPY = apys.length ? Math.max(...apys) : 0;
  const totalTVL = vaults.reduce((s, v) => s + parseFloat(v.analytics.tvl.usd), 0);
  const chains = new Set(vaults.map((v) => v.chainId)).size;
  const protocols = new Set(vaults.map((v) => v.protocol.name)).size;

  const fmtTVL = (n: number): string => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">Depositable vaults</div>
        <div className="stat-value">
          <AnimatedNumber value={total} />
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Best APY</div>
        <div className="stat-value green">
          {highestAPY > 0
            ? <><AnimatedNumber value={highestAPY} decimals={2} />%</>
            : '—'
          }
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total TVL</div>
        <div className="stat-value">
          {totalTVL > 0 ? fmtTVL(totalTVL) : '—'}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Chains</div>
        <div className="stat-value">
          <AnimatedNumber value={chains} />
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Protocols</div>
        <div className="stat-value">
          <AnimatedNumber value={protocols} />
        </div>
      </div>
    </div>
  );
};

export default StatsRow;
