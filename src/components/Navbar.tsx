import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ModeToggle from './ModeToggle';

interface Props {
  mode: 'lite' | 'pro';
  onToggleMode?: () => void;
  onRefresh?: () => void;
}

const Navbar: React.FC<Props> = ({ mode, onToggleMode, onRefresh }) => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="lifi-logo-text">LI.FI</div>
        <h1>Yield Explorer</h1>
      </div>
      <div className="topbar-right" style={{ height: '40px' }}>
        <div style={{ marginRight: '16px', display: 'flex', alignItems: 'center', height: '100%' }}>
          {onToggleMode && <ModeToggle mode={mode} onToggle={onToggleMode} />}
        </div>
        <ConnectButton />
      </div>
    </header>
  );
};

export default Navbar;
