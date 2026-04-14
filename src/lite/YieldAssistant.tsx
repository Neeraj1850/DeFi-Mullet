import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Sparkles } from 'lucide-react';
import { useVaults } from '../hooks/useVaults';
import DepositModal from '../components/DepositModal';
import { scoreVault } from '../utils/vaultScore';
import { STABLECOIN_SYMBOLS, type EarnVault } from '../types';

interface Msg {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  vaults?: EarnVault[];   // Top 3 results (first is primary)
  intent?: string;        // What kind of query matched
}

interface Props {
  externalPrompt?: string;
  onPromptConsumed?: () => void;
}

// ── Intent Keywords ──────────────────────────────────────────────────────────
const STABLE_KEYS = ['stable', 'stablecoin', 'usdc', 'usdt', 'dai', 'frax', 'pyusd', 'crvusd', 'gho'];
const SAFE_KEYS = ['safe', 'secure', 'trusted', 'low risk', 'conservative', 'protected'];
const RISKY_KEYS = ['risky', 'aggressive', 'high risk', 'degen', 'high apy', 'max apy', 'high yield'];
const ETH_KEYS = ['eth', 'steth', 'weth', 'ether', 'ethereum', 'lido', 'etherfi'];
const LOWEST_KEYS = ['lowest', 'minimum', 'safest', 'most stable'];
const HIGHEST_KEYS = ['highest', 'best', 'maximum', 'top', 'most', 'biggest'];
const NETWORK_MAP: Record<string, string[]> = {
  arbitrum: ['arbitrum', 'arb', 'arbi'],
  base: ['base'],
  ethereum: ['ethereum', 'mainnet', 'eth mainnet', 'layer 1'],
  optimism: ['optimism', 'op', 'opt'],
  polygon: ['polygon', 'matic', 'poly'],
};

function detectNetwork(query: string): string | null {
  for (const [net, keys] of Object.entries(NETWORK_MAP)) {
    if (keys.some(k => query.includes(k))) return net;
  }
  return null;
}

function detectAsset(query: string): string | null {
  // Common explicit token mentions
  const tokens = ['usdc', 'usdt', 'dai', 'frax', 'eth', 'weth', 'steth', 'wbtc', 'btc', 'matic', 'op'];
  return tokens.find(t => query.includes(t)) ?? null;
}

// Composite "quality" score: balances APY attractiveness with safety
function qualityScore(vault: EarnVault): number {
  const score = scoreVault(vault);
  const apy = vault.analytics.apy.total ?? 0;
  // Cap APY contribution so 300% APY farms don't dominate
  const apyCap = Math.min(apy, 25);
  return score.total * 0.6 + apyCap * 0.4;
}

// ──────────────────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  '🏆 Highest APY on Arbitrum',
  '🛡️ Safest stablecoin yields',
  '⚡ ETH yield opportunities',
  '🌐 Best yields on Base',
  '💎 High-grade USDC vaults',
];

// ──────────────────────────────────────────────────────────────────────────────
const VaultCard: React.FC<{ vault: EarnVault; onDeposit: () => void; rank?: number }> = ({ vault, onDeposit, rank }) => {
  const score = useMemo(() => scoreVault(vault), [vault]);
  const apy = (vault.analytics.apy.total ?? 0).toFixed(2);
  const tvl = parseFloat(vault.analytics.tvl.usd);
  const tvlLabel = tvl >= 1e9 ? `$${(tvl / 1e9).toFixed(1)}B` : tvl >= 1e6 ? `$${(tvl / 1e6).toFixed(1)}M` : `$${(tvl / 1e3).toFixed(0)}K`;
  const isStable = vault.underlyingTokens?.some(t => STABLECOIN_SYMBOLS.includes(t.symbol));

  return (
    <div style={{
      background: 'rgba(163, 157, 157, 0.25)',
      border: `1px solid ${score.gradeColor}30`,
      borderRadius: 10,
      padding: 12,
      marginTop: rank === 1 ? 12 : 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {vault.protocol.logoUri && (
            <img src={vault.protocol.logoUri} alt={vault.protocol.name} style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{vault.protocol.name}</div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{vault.network} {isStable ? '· Stablecoin' : ''}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00C97A', fontWeight: 800, fontSize: 15 }}>{apy}%</div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>APY</div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 11 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: score.gradeColor, fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: score.gradeColor, display: 'inline-block' }} />
          Grade {score.grade} · {score.total}/100
        </span>
        <span style={{ opacity: 0.5 }}>TVL {tvlLabel}</span>
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 600 }}
        onClick={onDeposit}
      >
        Deposit Now →
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────

const YieldAssistant: React.FC<Props> = ({ externalPrompt, onPromptConsumed }) => {
  const { vaults, loading } = useVaults({}, 'apy', 'desc');
  const [selectedVault, setSelectedVault] = useState<EarnVault | null>(null);

  const [messages, setMessages] = useState<Msg[]>([{
    id: '1',
    sender: 'ai',
    text: "Hi! I'm your **Yield Assistant** — powered by live LI.FI Earn data. I can find the best stablecoin vaults, safest yields, highest APY opportunities, and more. What are you looking for?",
  }]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const processMessage = useCallback((userText: string) => {
    if (!userText.trim() || loading) return;

    if (onPromptConsumed) onPromptConsumed();

    const userMsg: Msg = { id: Date.now().toString(), sender: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const q = userText.toLowerCase().trim();

      // ── 1. Detect intents ────────────────────────────────────────────────
      const wantsStable = STABLE_KEYS.some(k => q.includes(k));
      const wantsSafe = SAFE_KEYS.some(k => q.includes(k));
      const wantsRisky = RISKY_KEYS.some(k => q.includes(k));
      const wantsEth = ETH_KEYS.some(k => q.includes(k)) && !wantsStable;
      const wantsLowest = LOWEST_KEYS.some(k => q.includes(k));
      const wantsHighest = HIGHEST_KEYS.some(k => q.includes(k)) || (!wantsLowest && !wantsSafe);
      const network = detectNetwork(q);
      const assetToken = detectAsset(q);

      // ── 2. Filter pool ────────────────────────────────────────────────────
      let pool = [...vaults].filter(v => (v.analytics.apy.total ?? 0) > 0);

      // Network filter
      if (network) {
        const netFiltered = pool.filter(v => v.network.toLowerCase().includes(network));
        if (netFiltered.length > 0) pool = netFiltered;
      }

      // Stablecoin filter (explicit token or generic stable)
      if (wantsStable) {
        if (assetToken && ['usdc', 'usdt', 'dai', 'frax'].includes(assetToken)) {
          const specific = pool.filter(v => v.underlyingTokens?.some(t => t.symbol.toLowerCase() === assetToken));
          pool = specific.length > 0 ? specific : pool.filter(v => v.underlyingTokens?.some(t => STABLECOIN_SYMBOLS.includes(t.symbol)));
        } else {
          pool = pool.filter(v => v.underlyingTokens?.some(t => STABLECOIN_SYMBOLS.includes(t.symbol)));
        }
      }

      // ETH filter
      if (wantsEth) {
        const ethPool = pool.filter(v => v.underlyingTokens?.some(t => ETH_KEYS.some(k => t.symbol.toLowerCase().includes(k))));
        if (ethPool.length > 0) pool = ethPool;
      }

      // Non-stable specific asset
      if (assetToken && !wantsStable && !wantsEth) {
        const tokenPool = pool.filter(v => v.underlyingTokens?.some(t => t.symbol.toLowerCase().includes(assetToken)));
        if (tokenPool.length > 0) pool = tokenPool;
      }

      // Safety filter
      if (wantsSafe) {
        const safePool = pool.filter(v => scoreVault(v).total >= 65);
        if (safePool.length > 0) pool = safePool;
      } else if (wantsRisky) {
        const riskyPool = pool.filter(v => scoreVault(v).total < 55 || (v.analytics.apy.total ?? 0) > 25);
        if (riskyPool.length > 0) pool = riskyPool;
      }

      // ── 3. Sort pool ─────────────────────────────────────────────────────
      if (wantsLowest) {
        pool.sort((a, b) => (a.analytics.apy.total ?? 0) - (b.analytics.apy.total ?? 0));
      } else if (wantsRisky || wantsHighest) {
        pool.sort((a, b) => (b.analytics.apy.total ?? 0) - (a.analytics.apy.total ?? 0));
      } else {
        // Default: quality sort (balanced APY + safety)
        pool.sort((a, b) => qualityScore(b) - qualityScore(a));
      }

      // ── 4. Fallback if no results ─────────────────────────────────────────
      let intent = 'general';
      if (pool.length === 0) {
        // Relax filters progressively
        pool = [...vaults].filter(v => (v.analytics.apy.total ?? 0) > 0);
        if (wantsStable) pool = pool.filter(v => v.underlyingTokens?.some(t => STABLECOIN_SYMBOLS.includes(t.symbol)));
        pool.sort((a, b) => qualityScore(b) - qualityScore(a));
        intent = 'fallback';
      } else if (wantsSafe) intent = 'safe';
      else if (wantsRisky) intent = 'risky';
      else if (wantsStable) intent = 'stable';
      else if (wantsEth) intent = 'eth';
      else if (wantsLowest) intent = 'lowest';
      else if (network) intent = 'network';

      const topVaults = pool.slice(0, 3);
      const primary = topVaults[0];

      // ── 5. Build contextual response ─────────────────────────────────────
      let responseText = '';
      if (!primary) {
        responseText = "I couldn't find any matching vaults right now. The data might still be loading — please try again in a moment. You can also ask about **USDC on Arbitrum**, **ETH yields**, or **safest stablecoin vaults**.";
      } else {
        const score = scoreVault(primary);
        const apy = (primary.analytics.apy.total ?? 0).toFixed(2);
        const net = primary.network;
        const proto = primary.protocol.name;
        const netPhrase = network ? ` on **${net}**` : ` on **${net}**`;

        if (intent === 'safe') {
          responseText = `Here's the safest option I found${netPhrase}. **${proto}** holds a **Grade ${score.grade}** trust score with **${apy}% APY** — a strong balance of security and returns. ${topVaults.length > 1 ? `I've also listed ${topVaults.length - 1} more alternatives below.` : ''}`;
        } else if (intent === 'risky') {
          responseText = `⚡ High-octane alert! **${proto}**${netPhrase} is pushing **${apy}% APY**. Higher reward always carries higher risk (Grade **${score.grade}**) — make sure you understand the protocol before depositing.`;
        } else if (intent === 'stable') {
          const sym = primary.underlyingTokens?.find(t => STABLECOIN_SYMBOLS.includes(t.symbol))?.symbol ?? 'stablecoin';
          responseText = `Top stablecoin pick: **${proto}** (${sym})${netPhrase} is yielding **${apy}% APY** with a **Grade ${score.grade}** trust rating — solid and battle-tested. ${topVaults.length > 1 ? `${topVaults.length - 1} more options shown below.` : ''}`;
        } else if (intent === 'eth') {
          responseText = `Best ETH yield I found: **${proto}**${netPhrase} at **${apy}% APY** with a trust score of **${score.total}/100** (Grade **${score.grade}**). ${topVaults.length > 1 ? `Showing ${topVaults.length} options total.` : ''}`;
        } else if (intent === 'lowest') {
          responseText = `Looking for conservative yield? **${proto}**${netPhrase} currently offers **${apy}% APY** with excellent stability. Lower risk, lower reward — but your capital stays safe.`;
        } else if (intent === 'network') {
          responseText = `Best overall pick on **${net}**: **${proto}** at **${apy}% APY** (Grade **${score.grade}**, TVL-backed). ${topVaults.length > 1 ? `Here are the top ${topVaults.length} options:` : ''}`;
        } else if (intent === 'fallback') {
          responseText = `I couldn't find an exact match, so here's the best overall option I have: **${proto}**${netPhrase} at **${apy}% APY** (Grade **${score.grade}**). Try being more specific — e.g. "safe USDC on Arbitrum".`;
        } else {
          responseText = `🏆 Top pick: **${proto}**${netPhrase} — **${apy}% APY** with a **Grade ${score.grade}** trust rating. ${topVaults.length > 1 ? `I've found ${topVaults.length} strong options for you:` : 'Ready to earn?'}`;
        }
      }

      const aiMsg: Msg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        vaults: topVaults.length > 0 ? topVaults : undefined,
        intent,
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 900);
  }, [vaults, loading, onPromptConsumed]);

  const handleSend = () => processMessage(input);

  useEffect(() => {
    if (externalPrompt) processMessage(externalPrompt);
  }, [externalPrompt, processMessage]);

  const isOnlyGreeting = messages.length === 1;

  return (
    <motion.div
      className="lite-card ai-chat-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="lite-card-header chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="lite-card-icon ai-bot-icon"><Bot size={20} /></div>
          <div>
            <h3 style={{ margin: 0 }}>Yield Assistant</h3>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>
              {loading ? 'Loading live data…' : `${vaults.length.toLocaleString()} vaults indexed`}
            </div>
          </div>
        </div>
        <span className="live-pill">Live</span>
      </div>

      <div className="chat-window">
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              className={`chat-bubble-wrap ${m.sender}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className={`chat-bubble ${m.sender}`}>
                <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />

                {m.vaults && m.vaults.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {m.vaults.map((vault, idx) => (
                      <VaultCard
                        key={vault.address + vault.chainId}
                        vault={vault}
                        rank={idx + 1}
                        onDeposit={() => setSelectedVault(vault)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Suggested prompts shown only on first message */}
          {isOnlyGreeting && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 8px 12px', marginTop: -4 }}
            >
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => processMessage(prompt.replace(/^[\p{Emoji}\s]+/u, '').trim())}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '6px 11px',
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                >
                  {prompt}
                </button>
              ))}
            </motion.div>
          )}

          {isTyping && (
            <motion.div
              key="typing"
              className="chat-bubble-wrap ai"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="chat-bubble ai" style={{ display: 'flex', gap: 4, padding: '12px 16px', alignItems: 'center' }}>
                <Sparkles size={12} style={{ opacity: 0.5, marginRight: 4 }} />
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay }}
                    style={{ fontWeight: 800, fontSize: 16, lineHeight: 1 }}
                  >·</motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          placeholder={loading ? 'Loading vault data…' : 'Ask e.g. "safest USDC on Arbitrum"'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={loading}
          style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', outline: 'none' }}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={18} />
        </button>
      </div>

      {selectedVault && (
        <DepositModal vault={selectedVault} onClose={() => setSelectedVault(null)} />
      )}
    </motion.div>
  );
};

export default YieldAssistant;
