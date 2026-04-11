import React, { useState, useMemo } from 'react';
import { useVaults } from '../hooks/useVaults';
import { STABLECOIN_SYMBOLS } from '../types';
import type { EarnVault } from '../types';
import { fmtAPY, fmtTVL, fmtYield } from '../utils/format';

interface Props {
  onDeposit: (vault: EarnVault) => void;
}

const QUICK_FILL_AMOUNTS = [1_000, 10_000, 100_000, 1_000_000];

const TreasuryTool: React.FC<Props> = ({ onDeposit }) => {
  const [capital, setCapital]   = useState('');
  const [assetFilter, setAsset] = useState<string | null>(null);

  const { vaults, loading } = useVaults(
    { asset: assetFilter, minTvlUsd: 1_000_000 },
    'apy'
  );

  const stableVaults = useMemo(() =>
    vaults.filter((v) =>
      v.underlyingTokens.some((t) => STABLECOIN_SYMBOLS.includes(t.symbol))
    ),
  [vaults]);

  const amount   = parseFloat(capital) || 0;
  const top5     = stableVaults.slice(0, 5);
  const bestVault = stableVaults[0];
  const bestAPY  = bestVault?.analytics.apy.total ?? null;

  const availableAssets = useMemo(() => {
    const seen = new Set<string>();
    stableVaults.forEach((v) =>
      v.underlyingTokens.forEach((t) => {
        if (STABLECOIN_SYMBOLS.includes(t.symbol)) seen.add(t.symbol);
      })
    );
    return Array.from(seen).sort();
  }, [stableVaults]);

  const getDeltaBadge = (apy: number | null, bestApy: number | null) => {
    if (apy == null || bestApy == null) return null;
    if (apy === bestApy) return <span className="delta-badge green">Best</span>;
    const delta = apy - bestApy;
    if (delta > -1)  return <span className="delta-badge green">{delta.toFixed(2)}%</span>;
    if (delta > -3)  return <span className="delta-badge amber">{delta.toFixed(2)}%</span>;
    return <span className="delta-badge red">{delta.toFixed(2)}%</span>;
  };

  return (
    <div className="treasury-tool">
      <div className="treasury-header">
        <h2 className="treasury-title">Treasury optimizer</h2>
        <p className="treasury-subtitle">
          Put idle stablecoins to work. Enter your capital below to see projected returns
          across {stableVaults.length} institutional-grade vaults — sorted by yield.
        </p>
      </div>

      <div className="treasury-controls">
        <div>
          <div className="treasury-amount-wrap">
            <span className="treasury-currency">$</span>
            <input
              className="treasury-amount"
              type="number"
              min="0"
              placeholder="Enter your idle capital (e.g. 50,000)"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
          </div>
          <div className="quick-fill-row">
            {QUICK_FILL_AMOUNTS.map((amt) => (
              <button
                key={amt}
                className="quick-fill-btn"
                onClick={() => setCapital(amt.toString())}
              >
                ${amt >= 1_000_000 ? `${amt / 1_000_000}M` : `${amt / 1_000}K`}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group" style={{ marginTop: 24, marginBottom: 24 }}>
          <span className="filter-label">Asset</span>
          <button
            className={`pill ${!assetFilter ? 'active' : ''}`}
            onClick={() => setAsset(null)}
          >
            All stablecoins
          </button>
          {availableAssets.map((sym) => (
            <button
              key={sym}
              className={`pill ${assetFilter === sym ? 'active' : ''}`}
              onClick={() => setAsset(sym)}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {amount > 0 && bestAPY !== null && (
        <div className="treasury-projection-banner">
          At the best available rate of <strong>{bestAPY.toFixed(2)}% APY</strong>,
          your <strong>${amount.toLocaleString()}</strong> could earn{' '}
          <strong className="green">${(amount * bestAPY / 100).toFixed(0)} per year</strong>
          {' '}— that's <strong>${(amount * bestAPY / 100 / 12).toFixed(0)}/month</strong> in
          passive yield with {bestVault?.protocol.name}.
        </div>
      )}

      {!loading && top5.length > 0 && bestAPY && (
        <div className="yield-chart">
          <h3 style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>Top 5 Yield Comparison</h3>
          {top5.map((v, i) => {
            const vApy = v.analytics.apy.total ?? 0;
            const pct = (vApy / bestAPY) * 100;
            return (
              <div key={v.slug} className="yield-bar-row">
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.protocol.name}
                </span>
                <div className="yield-bar-track">
                  <div className="yield-bar-fill" style={{ width: `${pct}%`, animationDelay: `${i * 0.1}s` }} />
                </div>
                <span className="apy-value" style={{ textAlign: 'right' }}>{fmtAPY(v.analytics.apy.total)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="table-wrapper">
        <div className="table-header treasury-grid" style={{ gridTemplateColumns: amount > 0 ? '2.5fr 1fr 1fr 1fr 1.5fr 1fr' : '2.5fr 1fr 1fr 1fr 1fr' }}>
          <span>Vault</span>
          <span>APY</span>
          <span>vs best</span>
          <span>TVL</span>
          {amount > 0 && <span>Projected yield</span>}
          <span />
        </div>

        {loading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton-row treasury-grid">
                {[1,2,3,4,5,6].map((j) => <div key={j} className="skeleton-cell" />)}
              </div>
            ))
          : stableVaults.map((vault) => (
              <div key={vault.slug} className="opp-row treasury-grid" style={{ gridTemplateColumns: amount > 0 ? '2.5fr 1fr 1fr 1fr 1.5fr 1fr' : '2.5fr 1fr 1fr 1fr 1fr' }}>
                <div className="protocol-cell">
                  {vault.protocol.logoUri && (
                    <img src={vault.protocol.logoUri} alt={vault.protocol.name} className="token-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="protocol-name">{vault.name}</div>
                    <div className="protocol-type">
                      {vault.protocol.name}
                      <span style={{ opacity: 0.4 }}>·</span>
                      {vault.underlyingTokens.map((t) => t.symbol).join(', ')}
                      {vault.timeLock === 0 && <span className="tag-pill">instant</span>}
                      {(vault.timeLock ?? 0) > 0 && (
                        <span className="tag-pill warn">
                          {Math.floor((vault.timeLock ?? 0) / 86400)}d lock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mobile-row-stat">
                  <span className="mobile-row-label desktop-hide">APY</span>
                  <div className="apy-value">{fmtAPY(vault.analytics.apy.total)}</div>
                </div>

                <div className="mobile-row-stat desktop-only">
                  <span className="mobile-row-label desktop-hide">vs best</span>
                  {getDeltaBadge(vault.analytics.apy.total, bestAPY)}
                </div>

                <div className="mobile-row-stat">
                  <span className="mobile-row-label desktop-hide">TVL</span>
                  <div className="tvl-value">{fmtTVL(vault.analytics.tvl.usd)}</div>
                </div>

                {amount > 0 && (
                  <div className="mobile-row-stat">
                    <span className="mobile-row-label desktop-hide">Projected</span>
                    <div className="projected-yield" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {fmtYield(vault.analytics.apy.total, amount)}
                    </div>
                  </div>
                )}

                <div className="mobile-row-stat action-cell">
                  {vault.isTransactional ? (
                    <button className="deposit-btn" onClick={() => onDeposit(vault)}>
                      <span style={{ position: 'relative', zIndex: 1 }}>Deposit</span>
                    </button>
                  ) : (
                    <span className="no-deposit-badge">View only</span>
                  )}
                </div>
              </div>
            ))
        }

        {!loading && stableVaults.length === 0 && (
          <div className="empty-state">No stablecoin vaults found.</div>
        )}
      </div>
    </div>
  );
};

export default TreasuryTool;
