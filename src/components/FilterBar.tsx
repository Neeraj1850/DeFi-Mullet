import React from 'react';
import { useChains } from '../hooks/useChains';
import { useProtocols } from '../hooks/useProtocols';
import type { Filters } from '../types';
import CustomSelect, { Option } from './CustomSelect';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const GRADES = ['A', 'B', 'C', 'D'] as const;

const FilterBar: React.FC<Props> = ({ filters, onChange }) => {
  const chains    = useChains();
  const protocols = useProtocols();

  const chainOptions: Option[] = chains.map(c => ({
    label: c.name,
    value: c.chainId
  }));

  const protocolOptions: Option[] = protocols.map(p => ({
    label: p.name,
    value: p.name,
    icon: p.logoUri
  }));

  const gradeOptions: Option[] = GRADES.map(g => ({
    label: `Grade ${g}+`,
    value: g
  }));

  return (
    <div className="filter-dropdowns">
      <CustomSelect 
        placeholder="Chain: All"
        options={chainOptions}
        value={filters.chainId || null}
        onChange={(val) => onChange({ ...filters, chainId: val ? Number(val) : null })}
      />

      <CustomSelect 
        placeholder="Protocol: All"
        options={protocolOptions}
        value={filters.protocol || null}
        onChange={(val) => onChange({ ...filters, protocol: val })}
      />

      <CustomSelect 
        placeholder="Min Grade: All"
        options={gradeOptions}
        value={filters.minGrade || null}
        onChange={(val) => onChange({ ...filters, minGrade: val })}
      />
    </div>
  );
};

export default FilterBar;
