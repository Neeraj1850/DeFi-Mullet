import React, { useState } from 'react';
import StatsRow from './components/StatsRow';
import FilterBar from './components/FilterBar';
import OpportunityTable from './components/OpportunityTable';
import { useVaults } from './hooks/useVaults';
import type { EarnVault, Filters, SortKey } from './types';
import './styles/app.css';

const App: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy]   = useState<SortKey>('apy');
  const [selected, setSelected] = useState<EarnVault | null>(null);

  const { vaults, loading, error, refresh } = useVaults(filters, sortBy);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <h1>Yield Explorer</h1>
          <span className="powered-badge">Powered by LI.FI Earn</span>
        </div>
        <div className="topbar-right">
          <button className="refresh-btn" onClick={refresh}>↻ Refresh</button>
          {error && <span className="error-badge" title={error}>API error</span>}
        </div>
      </header>

      <main className="content">
        <StatsRow vaults={vaults} />
        <FilterBar filters={filters} onChange={setFilters} />
        <OpportunityTable
          vaults={vaults}
          loading={loading}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelect={setSelected}
        />

        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selected.name}</h2>
                <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="modal-body">
                {selected.description && <p>{selected.description}</p>}
                <p><strong>Protocol:</strong> {selected.protocol.name}</p>
                <p><strong>Chain:</strong> {selected.network} ({selected.chainId})</p>
                <p><strong>APY (total):</strong> {selected.analytics.apy.total !== null ? `${(selected.analytics.apy.total * 100).toFixed(2)}%` : '—'}</p>
                <p><strong>APY (7d avg):</strong> {selected.analytics.apy7d !== null ? `${(selected.analytics.apy7d * 100).toFixed(2)}%` : '—'}</p>
                <p><strong>TVL:</strong> ${parseFloat(selected.analytics.tvl.usd).toLocaleString()}</p>
                <p><strong>Assets:</strong> {selected.underlyingTokens.map(t => t.symbol).join(', ')}</p>
                <p><strong>Vault address:</strong> <code>{selected.address}</code></p>
                <p className="coming-soon">Deposit flow in v2 — wallet connect + Composer quote coming next.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        Live data from LI.FI Earn API · Auto-refreshes every 60s
      </footer>
    </div>
  );
};

export default App;