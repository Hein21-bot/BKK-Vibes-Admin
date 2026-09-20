const mmk = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const thb = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const fmtMMK = (n) => (Number.isFinite(n) ? `${mmk.format(Math.round(n))} MMK` : '—');
export const fmtTHB = (n) => (Number.isFinite(n) ? `${thb.format(n)} THB` : '—');
export const fmtPct = (n) => (Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—');
export const fmtNum = (n, dp = 2) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: dp }) : '—';
