import React, { useState } from 'react';
import { useChains } from '../hooks/useChains';
import { useProtocols } from '../hooks/useProtocols';
import type { Filters } from '../types';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const GRADES = ['A', 'B', 'C', 'D'] as const;

const FilterBar: React.FC<Props> = ({ filters, onChange }) => {
  const chains    = useChains();
  const protocols = useProtocols();
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = (filters.chainId ? 1 : 0) + (filters.protocol ? 1 : 0);

  return (
    <div className="filter-bar">
      <button 
        className="mobile-filter-toggle desktop-hide" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'none', // Overridden in app.css
          padding: '8px 12px',
          background: '#fff',
          border: '1px solid #dddbd4',
          borderRadius: '8px',
          fontFamily: 'var(--font-display)',
          cursor: 'pointer',
          marginBottom: '8px', 
          width: '100%',
          textAlign: 'left',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>

      <div className={`filter-groups-wrap ${!isOpen ? 'mobile-hide' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="filter-group">
          <span className="filter-label">Chain</span>
          <button
            className={`pill ${!filters.chainId ? 'active' : ''}`}
            onClick={() => onChange({ ...filters, chainId: null })}
          >
            All
          </button>
          {chains.map((c) => (
            <button
              key={c.chainId}
              className={`pill ${filters.chainId === c.chainId ? 'active' : ''}`}
              onClick={() => onChange({ ...filters, chainId: c.chainId })}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-label">Protocol</span>
          <button
            className={`pill ${!filters.protocol ? 'active' : ''}`}
            onClick={() => onChange({ ...filters, protocol: null })}
          >
            All
          </button>
          {protocols.map((p) => (
            <button
              key={p.name}
              className={`pill ${filters.protocol === p.name ? 'active' : ''}`}
              onClick={() => onChange({ ...filters, protocol: p.name })}
            >
              {p.logoUri && (
                <img
                  src={p.logoUri}
                  alt={p.name}
                  style={{ width: 12, height: 12, borderRadius: '50%', verticalAlign: 'middle', marginRight: '4px' }}
                />
              )}
              {p.name}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-label">Min grade</span>
          <button
            className={`pill ${!filters.minGrade ? 'active' : ''}`}
            onClick={() => onChange({ ...filters, minGrade: null })}
          >
            All
          </button>
          {GRADES.map((g) => (
            <button
              key={g}
              className={`pill grade-pill grade-${g} ${filters.minGrade === g ? 'active' : ''}`}
              onClick={() => onChange({ ...filters, minGrade: g })}
              title={`Show only grade ${g} and above`}
            >
              {g}+
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
