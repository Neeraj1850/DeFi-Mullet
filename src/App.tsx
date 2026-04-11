import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import StatsRow from './components/StatsRow';
import FilterBar from './components/FilterBar';
import OpportunityTable from './components/OpportunityTable';
import DepositModal from './components/DepositModal';
import TabNav from './components/TabNav';
import TreasuryTool from './components/TreasuryTool';
import PortfolioPanel from './components/PortfolioPanel';
import { useVaults } from './hooks/useVaults';
import { usePortfolio } from './hooks/usePortfolio';
import { syncLiFiChains } from './api/earn';
import { useAccount } from 'wagmi';
import type { EarnVault, Filters, SortKey, Tab } from './types';
import './styles/app.css';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('explore');
  const [filters, setFilters]     = useState<Filters>({});
  const [sortBy, setSortBy]       = useState<SortKey>('apy');
  const [selected, setSelected]   = useState<EarnVault | null>(null);

  const { address } = useAccount();
  const { vaults, loading, error, total, refresh } = useVaults(filters, sortBy);
  const { positions } = usePortfolio(address);

  useEffect(() => {
    syncLiFiChains().catch(console.error);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setFilters({});
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <h1>Yield Explorer</h1>
          <span className="powered-badge">LI.FI Earn</span>
        </div>
        <div className="topbar-right">
          <ConnectButton />
          <button className="refresh-btn" onClick={refresh} title="Refresh data">
            &#8635;
          </button>
          {error && <span className="error-badge" title={error}>API error</span>}
        </div>
      </header>

      <main className="content">
        <TabNav
          active={activeTab}
          onChange={handleTabChange}
          portfolioCount={positions.length}
        />

        {activeTab === 'explore' && (
          <div className="tab-panel">
            <StatsRow vaults={vaults} total={total} />
            <FilterBar filters={filters} onChange={setFilters} />
            <OpportunityTable
              vaults={vaults}
              loading={loading}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onSelect={setSelected}
            />
          </div>
        )}

        {activeTab === 'treasury' && (
          <div className="tab-panel">
            <TreasuryTool onDeposit={setSelected} />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="tab-panel">
            <PortfolioPanel />
          </div>
        )}

        {selected && (
          <DepositModal
            vault={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </main>

      <footer className="footer">
        Live data · LI.FI Earn API · {total} depositable vaults · Refreshes every 15 min
      </footer>
    </div>
  );
};

export default App;
