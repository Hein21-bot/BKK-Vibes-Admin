const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// Amounts are in Myanmar Kyat.
export const money = (n) => `${number.format(Math.round(Number(n || 0)))} Ks`;

// Cargo fees and product costs paid in Bangkok are in Thai baht.
const baht2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const baht = (n) => `${baht2.format(Number(n || 0))} THB`;

export const dateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const dateOnly = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—';

export const titleCase = (s) =>
  String(s || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const initials = (name) =>
  String(name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
