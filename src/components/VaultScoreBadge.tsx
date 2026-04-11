import React, { useState } from 'react';
import { scoreVault } from '../utils/vaultScore';
import type { EarnVault } from '../types';

interface Props {
  vault: EarnVault;
}

const VaultScoreBadge: React.FC<Props> = ({ vault }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const score = scoreVault(vault);

  return (
    <div
      className="score-badge-wrap"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="score-badge"
        style={{
          background: `${score.gradeColor}18`,
          border: `1.5px solid ${score.gradeColor}40`,
          color: score.gradeColor,
        }}
      >
        <span className="score-grade">{score.grade}</span>
        <span className="score-number">{score.total}</span>
      </div>

      {showTooltip && (
        <div className="score-tooltip">
          <div className="score-tooltip-header">
            Trust score: {score.total}/100
          </div>

          <div className="score-breakdown">
            <div className="score-row">
              <span>TVL</span>
              <div className="score-bar-wrap">
                <div className="score-bar" style={{ width: `${(score.breakdown.tvl / 30) * 100}%`, background: score.gradeColor }} />
              </div>
              <span>{score.breakdown.tvl}/30</span>
            </div>
            <div className="score-row">
              <span>APY stability</span>
              <div className="score-bar-wrap">
                <div className="score-bar" style={{ width: `${(score.breakdown.apyStability / 25) * 100}%`, background: score.gradeColor }} />
              </div>
              <span>{score.breakdown.apyStability}/25</span>
            </div>
            <div className="score-row">
              <span>APY level</span>
              <div className="score-bar-wrap">
                <div className="score-bar" style={{ width: `${(score.breakdown.apyLevel / 20) * 100}%`, background: score.gradeColor }} />
              </div>
              <span>{score.breakdown.apyLevel}/20</span>
            </div>
            <div className="score-row">
              <span>Protocol</span>
              <div className="score-bar-wrap">
                <div className="score-bar" style={{ width: `${(score.breakdown.protocol / 15) * 100}%`, background: score.gradeColor }} />
              </div>
              <span>{score.breakdown.protocol}/15</span>
            </div>
            <div className="score-row">
              <span>Liquidity</span>
              <div className="score-bar-wrap">
                <div className="score-bar" style={{ width: `${(score.breakdown.liquidity / 10) * 100}%`, background: score.gradeColor }} />
              </div>
              <span>{score.breakdown.liquidity}/10</span>
            </div>
          </div>

          {score.flags.length > 0 && (
            <div className="score-flags">
              {score.flags.map((f, i) => (
                <span key={i} className="score-flag">⚠ {f}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VaultScoreBadge;
