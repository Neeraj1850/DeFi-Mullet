import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { usePortfolioContext } from '../../../hooks/usePortfolioContext';
import Skeleton from '../../Skeleton';

const CHAIN_META: Record<number, { name: string; color: string }> = {
  1:     { name: 'Ethereum', color: '#627EEA' },
  8453:  { name: 'Base',     color: '#0052FF' },
  42161: { name: 'Arbitrum', color: '#28A0F0' },
  10:    { name: 'Optimism', color: '#FF0420' },
  137:   { name: 'Polygon',  color: '#8247E5' },
};

const Row: React.FC<{ label: string; value: string; sub?: string; accent?: boolean }> = ({
  label, value, sub, accent,
}) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 14px',
    background: '#fafaf8',
    borderRadius: 10,
    border: '1px solid #eeecea',
  }}>
    <span style={{ fontSize: 13, color: '#6b6b6b', fontWeight: 500 }}>{label}</span>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: accent ? '#00a65a' : 'var(--ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

export const SummaryPanel: React.FC = () => {
  const { summary, state, positions, refresh } = usePortfolioContext();
  const chainEntries = Object.entries(summary.chainBreakdown);

  // Show skeleton while loading
  if (state.isLoading) {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #eeecea',
        padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <Skeleton height={13} width="50%" />
        <Skeleton height={36} width="75%" />
        <Skeleton height={1} />
        <Skeleton height={46} borderRadius={10} />
        <Skeleton height={46} borderRadius={10} />
        <Skeleton height={46} borderRadius={10} />
      </div>
    );
  }

  const hasPositions = positions.positions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #eeecea',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Portfolio Value
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>
            ${summary.totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <button
          onClick={refresh}
          title="Refresh"
          style={{
            background: 'transparent', border: '1px solid #eeecea', borderRadius: 8,
            padding: '6px 8px', cursor: 'pointer', color: '#aaa',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          className="refresh-icon-btn"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div style={{ height: 1, background: '#eeecea' }} />

      {/* Balance error banner - soft, non-blocking */}
      {state.isBalanceError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', background: '#fff8f0', border: '1px solid #fde8c8',
          borderRadius: 8, fontSize: 12, color: '#b55a00',
        }}>
          <AlertTriangle size={13} />
          Wallet balance unavailable
        </div>
      )}

      <Row label="Wallet" value={`$${summary.walletValueUSD.toFixed(2)}`} />
      <Row
        label="Yield Positions"
        value={`$${summary.earnValueUSD.toFixed(2)}`}
        sub={hasPositions ? `${summary.activePositionCount} vault${summary.activePositionCount !== 1 ? 's' : ''}` : undefined}
        accent={true}
      />
      {hasPositions && (
        <Row
          label="Avg APY"
          value={`${summary.averageApy.toFixed(2)}%`}
          accent={true}
        />
      )}

      {/* Chain distribution bar */}
      {chainEntries.length > 0 && summary.totalValueUSD > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500, marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Distribution
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 6, overflow: 'hidden', gap: 2, background: '#f0efec' }}>
            {chainEntries.map(([chainId, value]) => {
              const pct = (value / summary.totalValueUSD) * 100;
              const meta = CHAIN_META[Number(chainId)] || { name: `Chain ${chainId}`, color: '#888' };
              return (
                <motion.div
                  key={chainId}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ height: '100%', background: meta.color, borderRadius: 4 }}
                  title={`${meta.name}: $${value.toFixed(2)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10 }}>
            {chainEntries.map(([chainId]) => {
              const meta = CHAIN_META[Number(chainId)] || { name: `Chain ${chainId}`, color: '#888' };
              return (
                <div key={chainId} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                  {meta.name}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
