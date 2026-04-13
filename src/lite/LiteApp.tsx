import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import PortfolioLiteCard from './PortfolioLiteCard';
import YieldAssistant from './YieldAssistant';
import Navbar from '../components/Navbar';
import ModeToggle from '../components/ModeToggle';
import '../styles/app.css';

interface Props {
  onToggleMode: () => void;
}

const LiteApp: React.FC<Props> = ({ onToggleMode }) => {
  const { isConnected } = useAccount();
  const [aiPrompt, setAiPrompt] = React.useState('');

  if (!isConnected) {
    return (
      <div className="lite-splash">
        <motion.div
          className="lite-login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="lite-logo-mark">
             <Zap size={32} stroke="#1d1d1d" fill="none" />
          </div>
          <h1>Yield Explorer</h1>
          <p>Discover optimized DeFi yield opportunities effortlessly. Connect your Web3 wallet to begin.</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <ConnectButton />
          </div>
        </motion.div>
      </div>
    );
  }



  return (
    <div className="lite-app-layout">
      {/* HEADER */}
      <Navbar mode="lite" onToggleMode={onToggleMode} />

      {/* DASHBOARD GRID */}
      <main className="lite-main-content">
        <div className="lite-grid">
           <PortfolioLiteCard onRequestDeposit={() => setAiPrompt("Show me the absolute best deposit yields")} />
           <YieldAssistant externalPrompt={aiPrompt} onPromptConsumed={() => setAiPrompt('')} />
        </div>
      </main>
    </div>
  );
};

export default LiteApp;
