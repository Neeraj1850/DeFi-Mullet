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
      {loading && <div className="global-loading" />}
      <header className="topbar">
        <div className="topbar-left">
          <div className="lifi-logo-text">LI.FI</div>
          <h1>Yield Explorer</h1>
        </div>
        <div className="topbar-right">
          <ConnectButton />
          <button className="refresh-btn" onClick={refresh} title="Refresh data">
            &#8635;
          </button>
        </div>
      </header>

      <main className="content">
        <TabNav
          active={activeTab}
          onChange={handleTabChange}
          portfolioCount={positions.length}
        />

        {error && (
          <div className="global-error-banner">
            <span>Failed to load vaults: {error}</span>
            <button className="btn-secondary" onClick={refresh}>Retry</button>
          </div>
        )}

        <div className="tab-panel" key={activeTab}>
          {activeTab === 'explore' && (
            <>
              <StatsRow vaults={vaults} total={total} />
              <FilterBar filters={filters} onChange={setFilters} />
              <OpportunityTable
                vaults={vaults}
                loading={loading}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onSelect={setSelected}
                onClearFilters={() => setFilters({})}
              />
            </>
          )}

          {activeTab === 'treasury' && (
            <TreasuryTool onDeposit={setSelected} />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioPanel />
          )}
        </div>

        {selected && (
          <DepositModal
            vault={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </main>

      <footer className="footer">
        Live data · LI.FI Earn API · {total} depositable vaults · 
        {vaults[0]?.analytics?.updatedAt 
          ? ` Last updated: ${new Date(vaults[0].analytics.updatedAt).toLocaleTimeString()}`
          : ' Refreshes every 15 min'}
      </footer>
    </div>
  );
};

export default App;
