import React, { useState, useEffect } from 'react';
import StatsRow from './components/StatsRow';
import FilterBar from './components/FilterBar';
import OpportunityTable from './components/OpportunityTable';
import DepositModal from './components/DepositModal';
import TabNav from './components/TabNav';
import TreasuryTool from './components/TreasuryTool';
import { ProDashboard } from './components/portfolio/ProDashboard';
import { useVaults } from './hooks/useVaults';
import { usePortfolioContext } from './hooks/usePortfolioContext';
import { syncLiFiChains } from './config/lifi';
import type { EarnVault, Filters, SortKey, SortDir, Tab } from './types';
import './styles/app.css';
import Navbar from './components/Navbar';

interface Props {
  onToggleMode?: () => void;
}

const App: React.FC<Props> = ({ onToggleMode }) => {
  const [activeTab, setActiveTab] = useState<Tab>('explore');
  const [filters, setFilters]     = useState<Filters>({});
  const [sortBy, setSortBy]       = useState<SortKey>('apy');
  const [sortDir, setSortDir]     = useState<SortDir>('desc');
  const [selected, setSelected]   = useState<EarnVault | null>(null);

  const { vaults, loading, error, total, refresh } = useVaults(filters, sortBy, sortDir);
  const { summary } = usePortfolioContext();

  const handleSortChange = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  useEffect(() => {
    syncLiFiChains().catch(() => {});
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // Only reset filters when leaving explore tab
    if (tab !== 'explore') setFilters({});
  };

  return (
    <div className="app">
      {loading && <div className="global-loading" />}
      <Navbar mode="pro" onToggleMode={onToggleMode} onRefresh={refresh} />

      <main className="content">
        <TabNav
          active={activeTab}
          onChange={handleTabChange}
          portfolioCount={summary.activePositionCount}
        />

        {error && (
          <div className="global-error-banner">
            <span>Failed to load vaults: {error}</span>
            <button className="btn-secondary" onClick={refresh}>Retry</button>
          </div>
        )}

        {/* ── Explore tab ──────────────────────────────────────── */}
        {/* Mounted/unmounted so filter state resets cleanly on leave */}
        {activeTab === 'explore' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <StatsRow vaults={vaults} total={total} />
            <FilterBar filters={filters} onChange={setFilters} />
            <OpportunityTable
              vaults={vaults}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onSelect={setSelected}
              onClearFilters={() => setFilters({})}
            />
          </div>
        )}

        {/* ── Treasury tab ─────────────────────────────────────── */}
        {activeTab === 'treasury' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <TreasuryTool onDeposit={setSelected} vaults={vaults} loading={loading} />
          </div>
        )}

        {/* ── Portfolio tab — stays mounted, CSS-toggled ──────── */}
        {/* Keeps provider state alive so no re-fetch on tab switch */}
        <div
          className="tab-panel"
          style={{ display: activeTab === 'portfolio' ? 'flex' : 'none' }}
        >
          <ProDashboard />
        </div>

        {selected && (
          <DepositModal
            vault={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </main>

      <footer className="footer">
        Live data · LI.FI Earn API · {total} vaults ·{' '}
        {vaults[0]?.analytics?.updatedAt
          ? `Updated ${new Date(vaults[0].analytics.updatedAt).toLocaleTimeString()}`
          : 'Refreshes every 15 min'}
      </footer>
    </div>
  );
};

export default App;
