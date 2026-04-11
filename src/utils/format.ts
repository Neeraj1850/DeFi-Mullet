export const fmtTVL = (usd: string): string => {
  const n = parseFloat(usd);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

export const fmtAPY = (v: number | null | undefined): string =>
  v != null ? `${v.toFixed(2)}%` : '—';

export const fmtYield = (apy: number | null, amount: number): string => {
  if (!apy || !amount) return '—';
  const annual = amount * (apy / 100);
  const monthly = annual / 12;
  const daily = annual / 365;
  return `$${annual.toFixed(0)}/yr · $${monthly.toFixed(0)}/mo · $${daily.toFixed(2)}/day`;
};
