import type { EarnVault } from '../types';

export interface VaultScore {
  total: number;        // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeColor: string;
  breakdown: {
    tvl:         number; // 0–30
    apyStability: number; // 0–25
    apyLevel:    number; // 0–20
    protocol:    number; // 0–15
    liquidity:   number; // 0–10
  };
  flags: string[];      // human-readable warnings
}

// Protocols with long track records and audits
const TRUSTED_PROTOCOLS = new Set([
  'Morpho', 'Morpho V1', 'Morpho V2',
  'Aave', 'Aave V3', 'Aave v3',
  'Compound', 'Compound V3',
  'Euler',
  'Pendle',
  'Lido',
  'EtherFi',
  'Ethena',
  'Spark',
  'Sky',
  'Fluid',
  'Seamless',
]);

export const scoreVault = (vault: EarnVault): VaultScore => {
  const flags: string[] = [];
  const breakdown = { tvl: 0, apyStability: 0, apyLevel: 0, protocol: 0, liquidity: 0 };

  const tvl    = parseFloat(vault.analytics.tvl.usd);
  const apy    = vault.analytics.apy.total;
  const apy30d = vault.analytics.apy30d;
  const apy7d  = vault.analytics.apy7d;

  // ── 1. TVL score (0–30) ─────────────────────────────────────────────────
  if      (tvl >= 100_000_000) breakdown.tvl = 30;
  else if (tvl >= 10_000_000)  breakdown.tvl = 25;
  else if (tvl >= 1_000_000)   breakdown.tvl = 18;
  else if (tvl >= 100_000)     breakdown.tvl = 10;
  else {
    breakdown.tvl = 3;
    flags.push('Very low TVL');
  }

  // ── 2. APY stability score (0–25) ───────────────────────────────────────
  // Compare current APY to 30d average — big divergence = unstable
  if (apy !== null && apy30d !== null && apy30d > 0) {
    const divergence = Math.abs(apy - apy30d) / apy30d;
    if      (divergence < 0.10) breakdown.apyStability = 25;
    else if (divergence < 0.25) breakdown.apyStability = 20;
    else if (divergence < 0.50) breakdown.apyStability = 15;
    else if (divergence < 1.00) breakdown.apyStability = 8;
    else {
      breakdown.apyStability = 2;
      flags.push('Highly unstable APY');
    }
  } else if (apy !== null && apy7d !== null && apy7d > 0) {
    // Fallback to 7d if no 30d data
    const divergence = Math.abs(apy - apy7d) / apy7d;
    breakdown.apyStability = divergence < 0.25 ? 18 : divergence < 0.5 ? 12 : 5;
  } else {
    // No historical data — new vault
    breakdown.apyStability = 5;
    flags.push('No APY history — recently created');
  }

  // ── 3. APY level score (0–20) ───────────────────────────────────────────
  if (apy === null) {
    breakdown.apyLevel = 10; // unknown, neutral
  } else if (apy <= 15) {
    breakdown.apyLevel = 20; // realistic sustainable yield
  } else if (apy <= 30) {
    breakdown.apyLevel = 15;
    flags.push('Above-average APY — verify source');
  } else if (apy <= 60) {
    breakdown.apyLevel = 8;
    flags.push('High APY — likely reward emissions');
  } else if (apy <= 150) {
    breakdown.apyLevel = 3;
    flags.push('Very high APY — high risk');
  } else {
    breakdown.apyLevel = 0;
    flags.push('Extreme APY — possibly bad data or Ponzi');
  }

  // ── 4. Protocol trust score (0–15) ──────────────────────────────────────
  const protocolName = vault.protocol.name;
  const isTrusted = Array.from(TRUSTED_PROTOCOLS).some((p) =>
    protocolName.toLowerCase().includes(p.toLowerCase())
  );

  if (isTrusted) {
    breakdown.protocol = 15;
  } else {
    breakdown.protocol = 5;
    flags.push('Unknown or newer protocol');
  }

  // ── 5. Liquidity score (0–10) ───────────────────────────────────────────
  if (vault.isRedeemable && (vault.timeLock ?? 0) === 0) {
    breakdown.liquidity = 10; // instant withdrawal
  } else if (vault.isRedeemable && (vault.timeLock ?? 0) <= 86400) {
    breakdown.liquidity = 7; // up to 1 day lock
    flags.push('Short withdrawal delay');
  } else if (vault.isRedeemable) {
    breakdown.liquidity = 4;
    const days = Math.floor((vault.timeLock ?? 0) / 86400);
    flags.push(`${days}-day withdrawal lock`);
  } else {
    breakdown.liquidity = 0;
    flags.push('Withdrawals not available via Composer');
  }

  if (vault.kyc) {
    flags.push('KYC required');
  }

  // ── Total & grade ────────────────────────────────────────────────────────
  const total =
    breakdown.tvl +
    breakdown.apyStability +
    breakdown.apyLevel +
    breakdown.protocol +
    breakdown.liquidity;

  let grade: VaultScore['grade'];
  let gradeColor: string;

  if      (total >= 80) { grade = 'A'; gradeColor = '#00C97A'; }
  else if (total >= 65) { grade = 'B'; gradeColor = '#22C55E'; }
  else if (total >= 50) { grade = 'C'; gradeColor = '#F59E0B'; }
  else if (total >= 35) { grade = 'D'; gradeColor = '#EF4444'; }
  else                  { grade = 'F'; gradeColor = '#991B1B'; }

  return { total, grade, gradeColor, breakdown, flags };
};

export const gradeFilter = (score: VaultScore, minGrade: 'A' | 'B' | 'C' | 'D' | 'F'): boolean => {
  const order = { A: 5, B: 4, C: 3, D: 2, F: 1 };
  return order[score.grade] >= order[minGrade];
};
