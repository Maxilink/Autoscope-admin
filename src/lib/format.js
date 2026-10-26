const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export const money = (n) => naira.format(n);

/** Compact money for charts and tight spaces: ₦1.2m, ₦840k */
export function moneyShort(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `₦${(n / 1e9).toFixed(1)}bn`;
  if (abs >= 1e6) return `₦${(n / 1e6).toFixed(1)}m`;
  if (abs >= 1e3) return `₦${Math.round(n / 1e3)}k`;
  return `₦${n}`;
}

export const num = (n) => new Intl.NumberFormat('en-NG').format(n);

export const pct = (n, digits = 1) => `${n.toFixed(digits)}%`;

export function date(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(d) {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ago(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} d ago`;
  return date(d);
}

export const initials = (name) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const cx = (...parts) => parts.filter(Boolean).join(' ');
