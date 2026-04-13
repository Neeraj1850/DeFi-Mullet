import React, { useState } from 'react';
import App from './App';
import LiteApp from './lite/LiteApp';
import { PortfolioProvider } from './providers/PortfolioProvider';

export const RootSwitch: React.FC = () => {
  const [mode, setMode] = useState<'lite' | 'pro'>(() => {
    try {
      const saved = localStorage.getItem('yieldExplorerMode');
      return saved === 'pro' ? 'pro' : 'lite';
    } catch {
      return 'lite';
    }
  });

  const handleToggleMode = (newMode: 'lite' | 'pro') => {
    setMode(newMode);
    localStorage.setItem('yieldExplorerMode', newMode);
  };

  return (
    <PortfolioProvider>
      {mode === 'pro' ? (
        <App onToggleMode={() => handleToggleMode('lite')} />
      ) : (
        <LiteApp onToggleMode={() => handleToggleMode('pro')} />
      )}
    </PortfolioProvider>
  );
};

export default RootSwitch;
