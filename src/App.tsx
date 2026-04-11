import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import StatsRow from './components/StatsRow';
import FilterBar from './components/FilterBar';
import OpportunityTable from './components/OpportunityTable';
import DepositModal from './components/DepositModal';
import { useVaults } from './hooks/useVaults';
import type { EarnVault, Filters, NetworkMode, SortKey } from './types';
import './styles/app.css';

const App: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState<SortKey>('apy');
  const [selected, setSelected] = useState<EarnVault | null>(null);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('mainnet');

  const { vaults, loading, error, refresh } = useVaults(filters, sortBy, networkMode);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <h1>Yield Explorer</h1>
          <span className="powered-badge">Powered by LI.FI Earn</span>
        </div>
        <div className="topbar-right">
          <div className="network-toggle">
            <button
              className={`toggle-btn ${networkMode === 'mainnet' ? 'active' : ''}`}
              onClick={() => { setNetworkMode('mainnet'); setFilters({}); }}
            >
              Mainnet
            </button>
            <button
              className={`toggle-btn ${networkMode === 'testnet' ? 'active' : ''}`}
              onClick={() => { setNetworkMode('testnet'); setFilters({}); }}
            >
              Testnet
            </button>
          </div>
          <ConnectButton />
          <button className="refresh-btn" onClick={refresh}>&#8635; Refresh</button>
          {error && <span className="error-badge" title={error}>API error</span>}
        </div>
      </header>

      <main className="content">
        {networkMode === 'testnet' && (
          <div className="testnet-banner">
            Testnet mode — using test networks only. Transactions have no real value.
          </div>
        )}
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
          <DepositModal vault={selected} onClose={() => setSelected(null)} />
        )}
      </main>

      <footer className="footer">
        Live data from LI.FI Earn API · Auto-refreshes every 60s
      </footer>
    </div>
  );
};

export default App;