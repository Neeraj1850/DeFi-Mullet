import React, { useState, useMemo } from 'react';
import { scoreVault, gradeFilter } from '../utils/vaultScore';
import { STABLECOIN_SYMBOLS } from '../types';
import type { EarnVault } from '../types';
import { fmtAPY, fmtTVL, fmtYield } from '../utils/format';
import CustomSelect, { Option } from './CustomSelect';
import { useChains } from '../hooks/useChains';
import { useProtocols } from '../hooks/useProtocols';

interface Props {
  onDeposit: (vault: EarnVault) => void;
  vaults: EarnVault[];
  loading: boolean;
}

const QUICK_FILL_AMOUNTS = [1_000, 10_000, 100_000, 1_000_000];
const GRADES = ['A', 'B', 'C', 'D'] as const;

const TreasuryTool: React.FC<Props> = ({ onDeposit, vaults, loading }) => {
  const [capital, setCapital] = useState('');
  const [assetFilter, setAsset] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [minGrade, setMinGrade] = useState<any>(null);

  const chains = useChains();
  const protocols = useProtocols();

  const stableVaults = useMemo(() => {
    return vaults.filter((v) => {
      if (!v.underlyingTokens.some((t) => STABLECOIN_SYMBOLS.includes(t.symbol))) return false;
      if (assetFilter && !v.underlyingTokens.some((t) => t.symbol === assetFilter)) return false;
      if (chainId && v.chainId !== chainId) return false;
      if (protocol && v.protocol.name !== protocol) return false;
      if (minGrade && !gradeFilter(scoreVault(v), minGrade)) return false;
      if (Number(v.analytics.tvl.usd) < 1_000_000) return false;
      return true;
    }).sort((a, b) => (b.analytics.apy.total ?? 0) - (a.analytics.apy.total ?? 0));
  }, [vaults, assetFilter, chainId, protocol, minGrade]);

  const amount = parseFloat(capital) || 0;
  const top5 = stableVaults.slice(0, 5);
  const bestVault = stableVaults[0];
  const bestAPY = bestVault?.analytics.apy.total ?? null;

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
    if (apy === bestApy) return <span className="tvl-value" style={{ color: 'var(--accent)', fontWeight: 600 }}>Best</span>;
    const delta = apy - bestApy;
    if (delta > -1) return <span className="tvl-value" style={{ color: 'var(--accent)', fontWeight: 500 }}>{delta.toFixed(2)}%</span>;
    if (delta > -3) return <span className="tvl-value" style={{ color: '#e65100', fontWeight: 500 }}>{delta.toFixed(2)}%</span>;
    return <span className="tvl-value" style={{ color: '#d32f2f', fontWeight: 500 }}>{delta.toFixed(2)}%</span>;
  };

  const assetOptions: Option[] = availableAssets.map((sym) => ({ label: sym, value: sym }));
  const chainOptions: Option[] = chains.map(c => ({ label: c.name, value: c.chainId }));
  const protocolOptions: Option[] = protocols.map(p => ({ label: p.name, value: p.name, icon: p.logoUri }));
  const gradeOptions: Option[] = GRADES.map(g => ({ label: `Grade ${g}+`, value: g }));

  return (
    <div className="treasury-tool" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="treasury-header">
        <h2 className="treasury-title">Treasury optimizer</h2>
      </div>

      <div className="treasury-controls">
        <div>
          <div className="treasury-amount-wrap">
            <input
              className="treasury-amount"
              type="number"
              min="0"
              placeholder="$ Enter your idle capital"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-dropdowns" style={{ marginTop: 24, marginBottom: 24 }}>
          <CustomSelect
            placeholder="Chain: All"
            options={chainOptions}
            value={chainId}
            onChange={(val) => setChainId(val ? Number(val) : null)}
          />
          <CustomSelect
            placeholder="Protocol: All"
            options={protocolOptions}
            value={protocol}
            onChange={(val) => setProtocol(val)}
          />
          <CustomSelect
            placeholder="Asset: All Stablecoins"
            options={assetOptions}
            value={assetFilter}
            onChange={(val) => setAsset(val)}
          />
          <CustomSelect
            placeholder="Min Grade: All"
            options={gradeOptions}
            value={minGrade}
            onChange={(val) => setMinGrade(val)}
          />
        </div>
      </div>

      {amount > 0 && bestAPY !== null && (
        <div className="treasury-projection-banner">
          At the best available rate of <strong>{(bestAPY ?? 0).toFixed(2)}% APY</strong>,
          your <strong>${amount.toLocaleString()}</strong> could earn{' '}
          <strong className="green">${(amount * (bestAPY ?? 0) / 100).toFixed(0)} per year</strong>
          {' '}— that's <strong>${(amount * (bestAPY ?? 0) / 100 / 12).toFixed(0)}/month</strong> in
          passive yield with {bestVault?.protocol.name}.
        </div>
      )}

      <div className="table-wrapper">
        <div className="table-header treasury-grid" style={{ gridTemplateColumns: amount > 0 ? '2.5fr 1fr 1fr 1fr 1.5fr 1fr' : '2.5fr 1fr 1fr 1fr 1fr' }}>
          <span>Vault</span>
          <span style={{ textAlign: 'center' }}>APY</span>
          <span style={{ textAlign: 'center' }}>vs best</span>
          <span style={{ textAlign: 'center' }}>TVL</span>
          {amount > 0 && <span style={{ textAlign: 'center' }}>Projected yield</span>}
          <span style={{ textAlign: 'center' }} />
        </div>

        <div className="table-body">
          {loading
            ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton-row treasury-grid">
                {[1, 2, 3, 4, 5, 6].map((j) => <div key={j} className="skeleton-cell" />)}
              </div>
            ))
            : stableVaults.map((vault, i) => (
              <div key={vault.slug} className="opp-row treasury-grid" style={{ animationDelay: `${i * 0.05}s`, gridTemplateColumns: amount > 0 ? '2.5fr 1fr 1fr 1fr 1.5fr 1fr' : '2.5fr 1fr 1fr 1fr 1fr' }}>
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

                <div className="mobile-row-stat" style={{ textAlign: 'center' }}>
                  <span className="mobile-row-label desktop-hide">APY</span>
                  <div className="apy-value">{fmtAPY(vault.analytics.apy.total)}</div>
                </div>

                <div className="mobile-row-stat desktop-only" style={{ textAlign: 'center' }}>
                  <span className="mobile-row-label desktop-hide">vs best</span>
                  {getDeltaBadge(vault.analytics.apy.total, bestAPY)}
                </div>

                <div className="mobile-row-stat" style={{ textAlign: 'center' }}>
                  <span className="mobile-row-label desktop-hide">TVL</span>
                  <div className="tvl-value">{fmtTVL(vault.analytics.tvl.usd)}</div>
                </div>

                {amount > 0 && (
                  <div className="mobile-row-stat" style={{ textAlign: 'center' }}>
                    <span className="mobile-row-label desktop-hide">Projected</span>
                    <div className="projected-yield" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {fmtYield(vault.analytics.apy.total, amount)}
                    </div>
                  </div>
                )}

                <div className="mobile-row-stat action-cell" style={{ display: 'flex', justifyContent: 'center' }}>
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
    </div>
  );
};

export default TreasuryTool;
