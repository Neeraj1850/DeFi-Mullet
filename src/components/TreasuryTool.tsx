import React, { useState, useMemo } from 'react';
import { useVaults } from '../hooks/useVaults';
import { STABLECOIN_SYMBOLS } from '../types';
import type { EarnVault } from '../types';

interface Props {
  onDeposit: (vault: EarnVault) => void;
}

const fmtAPY   = (v: number | null): string => v != null ? `${(v * 100).toFixed(2)}%` : '—';
const fmtTVL   = (usd: string): string => {
  const n = parseFloat(usd);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
};

const fmtYield = (apy: number | null, amount: number): string => {
  if (!apy || !amount) return '—';
  const annual  = amount * apy;
  const monthly = annual / 12;
  const daily   = annual / 365;
  return `$${annual.toFixed(0)}/yr · $${monthly.toFixed(0)}/mo · $${daily.toFixed(2)}/day`;
};

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

        <div className="filter-group" style={{ marginTop: 14 }}>
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
          At the best available rate of <strong>{(bestAPY * 100).toFixed(2)}% APY</strong>,
          your <strong>${amount.toLocaleString()}</strong> could earn{' '}
          <strong className="green">${(amount * bestAPY).toFixed(0)} per year</strong>
          {' '}— that's <strong>${((amount * bestAPY) / 12).toFixed(0)}/month</strong> in
          passive yield with {bestVault?.protocol.name}.
        </div>
      )}

      <div className="table-wrapper">
        <div className="table-header treasury-grid">
          <span>Vault</span>
          <span>APY</span>
          <span>30d avg</span>
          <span>TVL</span>
          {amount > 0 && <span>Projected yield</span>}
          <span />
        </div>

        {loading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton-row treasury-grid">
                {[1,2,3,4,5].map((j) => <div key={j} className="skeleton-cell" />)}
              </div>
            ))
          : stableVaults.map((vault) => (
              <div key={vault.slug} className="opp-row treasury-grid">
                <div className="protocol-cell">
                  {vault.protocol.logoUri && (
                    <img src={vault.protocol.logoUri} alt={vault.protocol.name} className="token-logo" />
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

                <div className="apy-value">{fmtAPY(vault.analytics.apy.total)}</div>
                <div className="tvl-value muted">{fmtAPY(vault.analytics.apy30d)}</div>
                <div className="tvl-value">{fmtTVL(vault.analytics.tvl.usd)}</div>

                {amount > 0 && (
                  <div className="projected-yield">
                    {fmtYield(vault.analytics.apy.total, amount)}
                  </div>
                )}

                <div>
                  {vault.isTransactional && (
                    <button className="deposit-btn" onClick={() => onDeposit(vault)}>
                      Deposit
                    </button>
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
