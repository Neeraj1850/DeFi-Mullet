import React from 'react';
import { useChains } from '../hooks/useChains';
import { useProtocols } from '../hooks/useProtocols';
import type { Filters } from '../types';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const FilterBar: React.FC<Props> = ({ filters, onChange }) => {
  const chains    = useChains();
  const protocols = useProtocols();

  return (
    <div className="filter-bar">
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
                style={{ width: 12, height: 12, borderRadius: '50%', verticalAlign: 'middle' }}
              />
            )}
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
