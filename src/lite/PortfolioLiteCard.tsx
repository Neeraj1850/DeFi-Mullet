import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Layers, ArrowUpRight, CopyPlus, X, ArrowDownCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { QRCodeSVG } from 'qrcode.react';
import Skeleton from '../components/Skeleton';
import WithdrawModal from '../components/WithdrawModal';
import { usePortfolioContext } from '../hooks/usePortfolioContext';
import type { PortfolioPosition } from '../types';

const CHAIN_NAMES: Record<number, string> = {
  1: 'Mainnet',
  42161: 'Arbitrum',
  8453: 'Base',
  10: 'Optimism',
  137: 'Polygon'
};

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA',
  8453: '#0052FF',
  42161: '#28A0F0',
  10: '#FF0420',
  137: '#8247E5',
};

interface Props {
  onRequestDeposit: () => void;
}

const PortfolioLiteCard: React.FC<Props> = ({ onRequestDeposit }) => {
  const { address } = useAccount();
  const { summary, positions, state, refresh } = usePortfolioContext();

  const [showQr, setShowQr] = useState(false);
  const [showPositions, setShowPositions] = useState(false);
  const [visibleItems, setVisibleItems] = useState(10);
  const [copyLabel, setCopyLabel] = useState('Copy Address');
  const [withdrawPosition, setWithdrawPosition] = useState<PortfolioPosition | null>(null);

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy Address'), 2000);
    });
  };

  const handleProtocolClick = async (protocolName: string) => {
    try {
      const slug = protocolName.replace(/\s+/g,'-').toLowerCase();
      const res = await fetch(`https://api.llama.fi/protocol/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          window.open(data.url, '_blank', 'noopener,noreferrer');
          return;
        }
      }
    } catch {}
    window.open(`https://defillama.com/protocol/${protocolName.replace(/\s+/g,'-').toLowerCase()}`, '_blank', 'noopener,noreferrer');
  };

  if (!address) {
    return (
      <div className="lite-card portfolio-lite-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250, background: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: 'var(--text-secondary)' }}>
          <div className="spinner-small" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Initializing Wallet...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="lite-card portfolio-lite-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ background: '#fff', border: '1px solid var(--border)' }}
    >
      <div className="lite-card-header">
        <div className="lite-card-icon" style={{ background: 'var(--ink)' }}><Wallet size={20} color="#fff" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontWeight: 700 }}>Your Portfolio</h3>
          {state.isError && (
            <button 
              onClick={state.canRefresh ? refresh : undefined} 
              style={{ padding: '4px 10px', background: 'rgba(255, 68, 68, 0.05)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)', borderRadius: 8, fontSize: 11, cursor: state.canRefresh ? 'pointer' : 'default', fontWeight: 600 }}
            >
              Sync Error — Retry
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state.isLoading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="lite-portfolio-balance">
              <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
              <Skeleton width="70%" height={32} style={{ marginBottom: 16 }} />
              <Skeleton width="55%" height={14} />
            </div>
            <div className="lite-stats-grid" style={{ marginTop: 8 }}>
              <Skeleton height={68} borderRadius={16} />
              <Skeleton height={68} borderRadius={16} />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lite-portfolio-balance">
              <span className="lite-label">Total Holdings</span>
              <h2 className="lite-balance-mega" style={{ letterSpacing: '-0.03em' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.totalValueUSD)}
              </h2>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
                Wallet ${summary.walletValueUSD.toFixed(2)} · Yield <span className="green">${summary.earnValueUSD.toFixed(2)}</span>
              </div>
            </div>

            <div className="lite-stats-grid">
              <div className="lite-stat-box" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="lite-label">Average Yield</span>
                <div className="lite-stat-val">
                  <strong style={{ fontWeight: 700 }}>{summary.activePositionCount > 0 ? `${summary.averageApy.toFixed(1)}%` : "0.0%"}</strong>
                  {summary.activePositionCount > 0 && <span className="trend-up" style={{ color: '#00c97a' }}>↑</span>}
                </div>
              </div>
              <div className="lite-stat-box" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="lite-label">Active Vaults</span>
                <div className="lite-stat-val">
                  <Layers size={16} style={{ marginRight: 6, color: 'var(--text-secondary)' }} />
                  <strong style={{ fontWeight: 700 }}>{summary.activePositionCount}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lite-portfolio-actions">
        <button className="btn-primary lite-action-btn" onClick={() => setShowQr(true)}>
          <CopyPlus size={16} />
          Deposit Funds
        </button>
        <button className="btn-secondary lite-action-btn" onClick={() => setShowPositions(true)} disabled={state.isEmpty || summary.activePositionCount === 0}>
          <ArrowUpRight size={16} />
          View Positions
        </button>
      </div>

      <AnimatePresence>
        {showQr && address && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowQr(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div
              className="lite-card"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 360, width: '100%', alignItems: 'center', textAlign: 'center', position: 'relative', padding: 32 }}
            >
              <button
                onClick={() => setShowQr(false)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
              <h3 style={{ marginBottom: 12, fontSize: 18 }}>Fund Your Wallet</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                Send native tokens (ETH) on Mainnet, Arbitrum, Base, or Optimism to your secure embedded wallet.
              </p>

              <div style={{ padding: 16, background: '#fff', borderRadius: 16, display: 'inline-block', marginBottom: 24 }}>
                <QRCodeSVG value={address} size={180} />
              </div>

              <div className="lite-user-pill" style={{ margin: 0, marginBottom: 16, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {address}
              </div>

              <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigator.clipboard.writeText(address)}>
                Copy Address
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPositions && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPositions(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div
              className="lite-card"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 460, width: '100%', position: 'relative', padding: '24px 24px 0 24px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            >
              <button
                onClick={() => setShowPositions(false)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
              <h3 style={{ marginBottom: 4, fontSize: 20 }}>Your Active Vaults</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Track your real-time yielding positions.
              </p>

              <div 
                style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
                onScroll={(e) => {
                   const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
                   if (scrollHeight - scrollTop <= clientHeight + 50) {
                     setVisibleItems(prev => prev + 10);
                   }
                }}
              >
                {(() => {
                   const renderList = [...positions.positions].sort((a, b) => Number(b.balanceUsd) - Number(a.balanceUsd));
                   // Group by protocol for a clean organized view
                   const grouped: Record<string, typeof renderList> = {};
                   renderList.forEach(pos => {
                     if (!grouped[pos.protocolName]) grouped[pos.protocolName] = [];
                     grouped[pos.protocolName].push(pos);
                   });

                   const positionRow = (pos: PortfolioPosition, i: number) => (
                     <div
                       key={i}
                       style={{
                         display: 'flex', alignItems: 'center',
                         padding: '12px 0', gap: 10,
                         borderBottom: '1px solid var(--border)',
                       }}
                     >
                       {/* Info */}
                       <div
                         onClick={() => handleProtocolClick(pos.protocolName)}
                         style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                       >
                         <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {pos.vaultName || pos.asset?.symbol || 'Vault'}
                         </div>
                         <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                           <span style={{ width: 6, height: 6, borderRadius: '50%', background: CHAIN_COLORS[pos.chainId] || '#888', flexShrink: 0 }} />
                           {CHAIN_NAMES[pos.chainId] || `Chain ${pos.chainId}`}
                           {typeof pos.apy === 'number' && pos.apy > 0 && (
                             <><span>·</span><span className="green" style={{ fontWeight: 600 }}>{pos.apy.toFixed(1)}% APY</span></>
                           )}
                         </div>
                       </div>
                       {/* Value */}
                       <strong className="green" style={{ fontSize: 14, flexShrink: 0 }}>
                         ${Number(pos.balanceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </strong>
                       {/* Withdraw */}
                       {Number(pos.balanceUsd) > 0 && (
                         <button
                           onClick={(e) => { e.stopPropagation(); setWithdrawPosition(pos); }}
                           title="Withdraw"
                           style={{
                             display: 'flex', alignItems: 'center', gap: 4,
                             padding: '5px 10px',
                             background: 'transparent',
                             border: '1px solid var(--border)',
                             borderRadius: 7,
                             fontSize: 11, fontWeight: 600, color: '#666',
                             cursor: 'pointer', flexShrink: 0,
                             transition: 'all 0.15s',
                           }}
                           className="withdraw-btn"
                         >
                           <ArrowDownCircle size={11} />
                           Withdraw
                         </button>
                       )}
                     </div>
                   );

                   return Object.entries(grouped).slice(0, visibleItems).map(([proto, arr]) => (
                     <div key={proto} style={{ marginBottom: 4 }}>
                       <div style={{
                         fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                         marginBottom: 4, marginTop: 10,
                         textTransform: 'uppercase', letterSpacing: '0.06em',
                         display: 'flex', alignItems: 'center', gap: 6,
                       }}>
                         <span style={{
                           width: 20, height: 20, borderRadius: 5,
                           background: 'var(--ink)', color: '#fff',
                           display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                           fontSize: 9, fontWeight: 800,
                         }}>
                           {proto.charAt(0)}
                         </span>
                         {proto}
                         <span style={{
                           background: 'var(--border)', color: 'var(--text-secondary)',
                           fontSize: 10, padding: '1px 6px', borderRadius: 8,
                         }}>{arr.length}</span>
                       </div>
                       {arr.sort((a, b) => Number(b.balanceUsd) - Number(a.balanceUsd)).map(positionRow)}
                     </div>
                   ));
                 })()}
              </div>

              <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Total Earn Value</span>
                <strong className="green" style={{ fontSize: 18 }}>${summary.earnValueUSD.toFixed(2)}</strong>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {withdrawPosition && (
          <WithdrawModal
            position={withdrawPosition}
            onClose={() => setWithdrawPosition(null)}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default PortfolioLiteCard;
