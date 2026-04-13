import React from 'react';
import { scoreVault } from '../utils/vaultScore';
import type { EarnVault } from '../types';

interface Props {
  vault: EarnVault;
}

const VaultScoreBadge: React.FC<Props> = ({ vault }) => {
  const score = scoreVault(vault);

  return (
    <div className="score-badge-wrap">
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
    </div>
  );
};

export default VaultScoreBadge;
