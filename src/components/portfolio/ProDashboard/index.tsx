import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { SummaryPanel } from './SummaryPanel';
import { PositionsList } from './PositionsList';
import { trackPortfolioPageOverviewEvent } from '../../../utils/tracking';
import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

export const ProDashboard: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { summary, state } = usePortfolioContext();

  useEffect(() => {
    if (isConnected && address && !state.isLoading && !state.isEmpty) {
      trackPortfolioPageOverviewEvent([address], summary);
    }
  }, [isConnected, address, state.isLoading, state.isEmpty, summary]);

  if (!isConnected) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 16,
        padding: 48,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(0, 201, 122, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, marginBottom: 8,
        }}>🏦</div>
        <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Connect your wallet
        </h3>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          View your real-time yield positions across all supported DeFi protocols.
        </p>
        <div style={{ marginTop: 8 }}>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 20,
        flex: 1,
        minHeight: 0,
        alignItems: 'start',
      }}
    >
      <SummaryPanel />
      <PositionsList />
    </motion.div>
  );
};
