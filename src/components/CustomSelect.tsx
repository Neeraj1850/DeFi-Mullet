import React, { useState, useRef, useEffect } from 'react';

export interface Option {
  label: string;
  value: string | number | null;
  icon?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: any) => void;
  placeholder: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${value !== null ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="custom-select-value">
          {selectedOption?.icon && (
            <img src={selectedOption.icon} alt="" className="custom-select-icon" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <div className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          <div className="custom-select-options">
            <div 
              className={`custom-select-option ${value === null ? 'selected' : ''}`}
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
            >
              Default (All)
            </div>
            {options.map((opt, i) => (
              <div 
                key={i}
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.icon && <img src={opt.icon} alt="" className="custom-select-icon" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
