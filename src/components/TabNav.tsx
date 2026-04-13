import React from 'react';
import type { Tab } from '../types';

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
  portfolioCount: number;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'explore',   label: 'Explore'   },
  { id: 'treasury',  label: 'Treasury'  },
  { id: 'portfolio', label: 'Portfolio' },
];

const TabNav: React.FC<Props> = ({ active, onChange, portfolioCount }) => (
  <nav className="tab-nav">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        className={`tab-btn ${active === tab.id ? 'active' : ''}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
        {tab.id === 'portfolio' && portfolioCount > 0 && (
          <span style={{
            marginLeft: 6,
            background: active === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--ink)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 10,
            verticalAlign: 'middle',
          }}>
            {portfolioCount}
          </span>
        )}
      </button>
    ))}
  </nav>
);

export default TabNav;
