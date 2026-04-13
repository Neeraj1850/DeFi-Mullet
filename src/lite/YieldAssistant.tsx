import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot } from 'lucide-react';
import { useVaults } from '../hooks/useVaults';
import DepositModal from '../components/DepositModal';
import { scoreVault } from '../utils/vaultScore';
import { STABLECOIN_SYMBOLS, type EarnVault } from '../types';

interface Msg {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  vault?: EarnVault;
}

interface Props {
  externalPrompt?: string;
  onPromptConsumed?: () => void;
}

const YieldAssistant: React.FC<Props> = ({ externalPrompt, onPromptConsumed }) => {
  const { vaults, loading } = useVaults({}, 'apy', 'desc');
  const [selectedVault, setSelectedVault] = useState<EarnVault | null>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am your Yield Assistant. Ask me to find the best yields for stablecoins like USDC on Arbitrum or Base.' }
  ]);
  
  const SUGGESTED_PROMPTS = [
    "Highest APY on Arbitrum",
    "Best stablecoin yields",
    "Delta-neutral options"
  ];
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
      const query = userText.toLowerCase();
      
      // ── Categorizers ────────────────────────────────────────────────────────
      const isStableQuery = query.includes('stable') || query.includes('usdc') || query.includes('usdt') || query.includes('dai');
      const isSafeQuery   = query.includes('safe') || query.includes('secure') || query.includes('trust') || query.includes('low risk');
      const isRiskyQuery  = query.includes('risky') || query.includes('aggressive') || query.includes('high risk') || query.includes('degen');
      const isLowestQuery = query.includes('lowest') || query.includes('conservative') || query.includes('minimum');
      const isHighestQuery = query.includes('best') || query.includes('highest') || query.includes('max') || query.includes('top');

      // ── Filter Data ────────────────────────────────────────────────────────
      let candidates = [...vaults];

      // 1. Filter by Network
      const networkMatch = vaults.find(v => query.includes(v.network.toLowerCase()));
      if (networkMatch) {
        candidates = candidates.filter(v => query.includes(v.network.toLowerCase()));
      }

      // 2. Filter by Asset
      const assetMatch = vaults.find(v => v.underlyingTokens?.some(t => query.includes(t.symbol.toLowerCase())));
      if (assetMatch) {
        candidates = candidates.filter(v => v.underlyingTokens?.some(t => query.includes(t.symbol.toLowerCase())));
      }

      // 3. Filter by Stablecoin status
      if (isStableQuery) {
        candidates = candidates.filter(v => 
          v.underlyingTokens?.some(t => STABLECOIN_SYMBOLS.includes(t.symbol))
        );
      }

      // 4. Filter by Safety/Risk
      if (isSafeQuery) {
        candidates = candidates.filter(v => scoreVault(v).total >= 65); // Grade A/B
      } else if (isRiskyQuery) {
        candidates = candidates.filter(v => scoreVault(v).total < 50 || (v.analytics.apy.total ?? 0) > 30);
      }

      // ── Sort & Select ────────────────────────────────────────────────────────
      if (isLowestQuery) {
        candidates.sort((a, b) => (a.analytics.apy.total ?? 0) - (b.analytics.apy.total ?? 0));
      } else {
        // Default to highest APY for everything else
        candidates.sort((a, b) => (b.analytics.apy.total ?? 0) - (a.analytics.apy.total ?? 0));
      }

      const matchedVault = candidates[0] ?? null;

      // ── Build Response ───────────────────────────────────────────────────────
      let responseText = "";
      if (matchedVault) {
        const score = scoreVault(matchedVault);
        const apy = (matchedVault.analytics.apy.total ?? 0).toFixed(2);
        
        if (isSafeQuery) {
          responseText = `I prioritized safety for you. The **${matchedVault.name}** vault on **${matchedVault.network}** is highly rated (**Grade ${score.grade}**) and yields **${apy}% APY**.`;
        } else if (isRiskyQuery) {
          responseText = `Looking for high growth? The **${matchedVault.name}** vault on **${matchedVault.network}** offers an aggressive **${apy}% APY**, though it carries a lower safety score (**${score.grade}**).`;
        } else if (isStableQuery) {
          responseText = `For stablecoin yields, the **${matchedVault.name}** vault on **${matchedVault.network}** is a top choice with **${apy}% APY**.`;
        } else {
          responseText = `I found a great opportunity! The **${matchedVault.name}** vault on **${matchedVault.network}** is currently yielding **${apy}% APY**. It has a Trust Grade of **${score.grade}**.`;
        }
      } else {
        responseText = "I couldn't find a vault that matches *every* specific criteria. I'd suggest checking out our top-rated USDC vaults on Arbitrum for a balance of yield and safety!";
      }

      const aiMsg: Msg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        vault: matchedVault ?? undefined,
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  }, [vaults, loading, onPromptConsumed]);

  const handleSend = () => processMessage(input);

  useEffect(() => {
    if (externalPrompt) {
      processMessage(externalPrompt);
    }
  }, [externalPrompt, processMessage]);

  return (
    <motion.div 
      className="lite-card ai-chat-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="lite-card-header chat-header">
        <div className="lite-card-icon ai-bot-icon"><Bot size={20} /></div>
        <h3>Yield Assistant</h3>
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
            >
              <div className={`chat-bubble ${m.sender}`}>
                <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                
                {m.vault && (
                  <div className="chat-vault-card" style={{ marginTop: 12, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         {m.vault.protocol.logoUri && <img src={m.vault.protocol.logoUri} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                         <span style={{ fontWeight: 600 }}>{m.vault.protocol.name}</span>
                      </div>
                      <span className="green" style={{ fontWeight: 'bold' }}>{(m.vault.analytics.apy.total ?? 0).toFixed(2)}% APY</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 11, opacity: 0.8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: scoreVault(m.vault).gradeColor }} />
                        Trust Grade: {scoreVault(m.vault).grade}
                      </span>
                      <span>{m.vault.network}</span>
                    </div>

                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', padding: 8, fontSize: 13 }}
                      onClick={() => setSelectedVault(m.vault!)}
                    >
                      Deposit Now
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {messages.length === 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 8px', marginTop: '-8px', marginBottom: 16 }}
            >
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => processMessage(prompt)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                >
                  {prompt}
                </button>
              ))}
            </motion.div>
          )}

          {isTyping && (
             <motion.div 
               className="chat-bubble-wrap ai"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             >
               <div className="chat-bubble ai typing-indicator" style={{ display: 'flex', gap: 4, padding: '12px 16px', background: 'var(--card-bg)' }}>
                 <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}>.</motion.span>
                 <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }}>.</motion.span>
                 <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }}>.</motion.span>
               </div>
             </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <input 
          type="text" 
          placeholder={loading ? "Loading yield data..." : "Ask about yield opportunities..."} 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
