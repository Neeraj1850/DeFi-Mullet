import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, AlertTriangle, ChevronDown, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { usePortfolioContext } from '../../../hooks/usePortfolioContext';
import Skeleton from '../../Skeleton';
import WithdrawModal from '../../WithdrawModal';
import type { PortfolioPosition } from '../../../types';

/* ─── Chain metadata ──────────────────────────────────────────── */
const CHAIN_META: Record<number, { name: string; color: string; explorer: string }> = {
  1:     { name: 'Ethereum', color: '#627EEA', explorer: 'https://etherscan.io' },
  8453:  { name: 'Base',     color: '#0052FF', explorer: 'https://basescan.org' },
  42161: { name: 'Arbitrum', color: '#28A0F0', explorer: 'https://arbiscan.io' },
  10:    { name: 'Optimism', color: '#FF0420', explorer: 'https://optimistic.etherscan.io' },
  137:   { name: 'Polygon',  color: '#8247E5', explorer: 'https://polygonscan.com' },
};

function getVaultUrl(protocolName: string): string {
  const slug = protocolName.toLowerCase().replace(/\s+/g, '-');
  return `https://defillama.com/protocol/${slug}`;
}

const PAGE_SIZE = 8;

/* ─── Loading skeleton ────────────────────────────────────────── */
const LoadingSkeleton: React.FC = () => (
  <div style={{
    background: '#fff', borderRadius: 16, border: '1px solid #eeecea',
    overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  }}>
    {/* header */}
    <div style={{ padding: '14px 20px', borderBottom: '1px solid #eeecea', background: '#fafaf8' }}>
      <Skeleton width={120} height={13} />
    </div>
    {/* rows */}
    {[...Array(4)].map((_, i) => (
      <div key={i} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 20px',
        borderBottom: i < 3 ? '1px solid #f5f4f1' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Skeleton width={130} height={13} />
            <Skeleton width={80} height={11} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
          <Skeleton width={72} height={14} />
          <Skeleton width={56} height={20} borderRadius={5} />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Single position row ─────────────────────────────────────── */
const PositionRow: React.FC<{
  pos: PortfolioPosition;
  isLast: boolean;
  onWithdraw: (p: PortfolioPosition) => void;
}> = ({ pos, isLast, onWithdraw }) => {
  const chain  = CHAIN_META[pos.chainId] ?? { name: `Chain ${pos.chainId}`, color: '#888', explorer: 'https://etherscan.io' };
  const usd    = Number(pos.balanceUsd) || 0;
  const apy    = typeof pos.apy === 'number' && pos.apy > 0 ? pos.apy : null;

  // balanceNative is raw integer units (per LI.FI API docs).
  // Sanity check: if it implies a token amount > 10000x the USD value, the data is corrupted.
  const decimals = pos.asset?.decimals ?? 18;
  const rawNative = Number(pos.balanceNative ?? '0');
  const derivedFromRaw = rawNative / 10 ** decimals;
  const isSane = usd === 0 || (derivedFromRaw / Math.max(usd, 0.0001)) < 10000;
  const native = derivedFromRaw > 0 ? (isSane ? derivedFromRaw : usd) : null;

  return (
    <div
      className="pos-row-hover"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '18px 22px',
        borderBottom: isLast ? 'none' : '1px solid #f5f4f1',
        transition: 'background 0.15s',
        minHeight: 72,
      }}
    >
      {/* Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 13.5, color: 'var(--ink)',
          marginBottom: 5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {pos.vaultName || pos.asset?.symbol || 'Vault'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 7px', borderRadius: 12,
            background: '#f0f0ec', fontSize: 11, color: '#777', fontWeight: 500,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: chain.color, flexShrink: 0 }} />
            {chain.name}
          </span>
          {native !== null && (
            <span style={{ fontSize: 11, color: '#bbb' }}>
              {native.toFixed(4)} {pos.asset?.symbol}
            </span>
          )}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', marginBottom: 4 }}>
            ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {apy !== null && (
            <span style={{
              display: 'inline-block',
              padding: '2px 7px', background: 'rgba(0,201,122,0.1)',
              color: '#00a65a', borderRadius: 5, fontSize: 11, fontWeight: 700,
            }}>
              {apy.toFixed(2)}% APY
            </span>
          )}
        </div>

        {usd > 0 && (
          <button
            onClick={() => onWithdraw(pos)}
            title="Withdraw position"
            className="withdraw-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px',
              background: 'transparent',
              border: '1px solid #e0deda',
              borderRadius: 8,
              fontSize: 11, fontWeight: 600, color: '#777',
              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            <ArrowDownCircle size={12} />
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────── */
export const PositionsList: React.FC = () => {
  const { positions, state, refresh } = usePortfolioContext();
  const [visible, setVisible]         = useState(PAGE_SIZE);
  const [withdrawPosition, setWithdrawPosition] = useState<PortfolioPosition | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver-based infinite scroll — no layout flicker
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(v => v + PAGE_SIZE); },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleWithdraw = useCallback((pos: PortfolioPosition) => setWithdrawPosition(pos), []);

  /* ── Loading ─────────────────────────────────────────────── */
  if (state.isLoading) return <LoadingSkeleton />;

  /* ── Error ───────────────────────────────────────────────── */
  if (state.isPositionError) {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #eeecea',
        padding: '52px 32px', textAlign: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <AlertTriangle size={28} color="#f59e0b" style={{ margin: '0 auto 14px' }} />
        <h4 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Positions unavailable</h4>
        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 22, lineHeight: 1.6, maxWidth: 280, margin: '0 auto 22px' }}>
          Could not load your yield positions. This may be a temporary API issue.
        </p>
        <button
          onClick={refresh}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', background: 'var(--ink)', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  /* ── Empty ───────────────────────────────────────────────── */
  const protocolEntries = Object.entries(positions.positionsByProtocol);

  if (protocolEntries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: '#fff', borderRadius: 16, border: '1px dashed #e0ded9',
          padding: '64px 32px', textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: 38, marginBottom: 18 }}>🌱</div>
        <h4 style={{ fontWeight: 700, marginBottom: 8, fontSize: 17 }}>No yield positions yet</h4>
        <p style={{ color: '#aaa', fontSize: 13.5, lineHeight: 1.7, maxWidth: 290, margin: '0 auto' }}>
          Deposit into a vault from the Explore tab to start earning yield.
        </p>
      </motion.div>
    );
  }

  /* ── Data ────────────────────────────────────────────────── */
  const sliced  = protocolEntries.slice(0, visible);
  const hasMore = visible < protocolEntries.length;

  return (
    <>
      {/*
        ─ Single outer container card ─
        All protocol groups live inside one scrollable card.
        This eliminates the "congested cards" look and gives a unified list feel.
      */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #eeecea',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Sticky header */}
        <div style={{
          padding: '14px 22px',
          borderBottom: '1px solid #eeecea',
          background: '#fafaf8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#999' }}>
            Your Positions
          </span>
          <span style={{
            background: '#eeecea', color: '#777', fontSize: 11, fontWeight: 700,
            padding: '2px 9px', borderRadius: 20,
          }}>
            {positions.positions.length}
          </span>
        </div>

        {/* Scrollable body */}
        <div style={{
          maxHeight: 'calc(100vh - 260px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin' as const,
          scrollbarColor: '#e0deda transparent',
        }}>
          <AnimatePresence initial={false}>
            {sliced.map(([protocolName, posArray], groupIndex) => {
              const totalUSD = posArray.reduce((s, p) => s + (Number(p.balanceUsd) || 0), 0);
              const vaultUrl = getVaultUrl(protocolName);

              return (
                <motion.div
                  key={protocolName}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, delay: groupIndex * 0.035 }}
                >
                  {/* Protocol subheader */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 22px 10px',
                    borderBottom: '1px solid #f5f4f1',
                    background: '#fcfcfb',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'var(--ink)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, flexShrink: 0,
                      }}>
                        {protocolName.charAt(0).toUpperCase()}
                      </div>
                      <a
                        href={vaultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="protocol-link"
                        style={{
                          fontWeight: 700, fontSize: 13.5, color: 'var(--ink)',
                          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {protocolName}
                        <ExternalLink size={10} style={{ opacity: 0.35 }} />
                      </a>
                      <span style={{
                        background: '#eeecea', color: '#777', fontSize: 10, fontWeight: 700,
                        padding: '1px 7px', borderRadius: 20,
                      }}>
                        {posArray.length}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                      ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Position rows */}
                  {posArray.map((pos, i) => (
                    <PositionRow
                      key={`${pos.chainId}-${pos.asset?.address}-${i}`}
                      pos={pos}
                      isLast={i === posArray.length - 1 && groupIndex === sliced.length - 1 && !hasMore}
                      onWithdraw={handleWithdraw}
                    />
                  ))}

                  {/* Protocol group divider */}
                  {groupIndex < sliced.length - 1 && (
                    <div style={{ height: 1, background: '#eeecea', margin: '0 22px' }} />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* IntersectionObserver sentinel — triggers next page load */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {hasMore && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '14px 0', color: '#ccc', fontSize: 12,
            }}>
              <ChevronDown size={14} />
              Loading more…
            </div>
          )}
        </div>
      </div>

      {/* WithdrawModal — rendered outside the scroll container */}
      <AnimatePresence>
        {withdrawPosition && (
          <WithdrawModal
            position={withdrawPosition}
            onClose={() => setWithdrawPosition(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
