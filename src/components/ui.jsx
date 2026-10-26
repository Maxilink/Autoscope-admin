import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { cx, initials } from '../lib/format.js';

/* ---------- Status badges ---------- */
const TONE = {
  ok: ['approved', 'active', 'completed', 'delivered', 'released', 'paid', 'resolved', 'sent', 'passed'],
  warn: ['pending', 'held', 'scheduled', 'investigating', 'in progress', 'processing', 'reserved', 'quote sent', 'en route', 'in transit', 'awaiting insurer', 'flagged', 'open', 'requested', 'confirmed', 'quote requested', 'offer accepted', 'in escrow', 'shipped', 'draft', 'high'],
  bad: ['rejected', 'suspended', 'cancelled', 'declined', 'removed', 'on hold', 'searching'],
};
const LABEL = { not_required: 'Not required', 'n/a': 'n/a' };

export function toneOf(status) {
  for (const [tone, list] of Object.entries(TONE)) if (list.includes(status)) return tone;
  return 'neutral';
}

export function Badge({ status, children, tone }) {
  const t = tone || toneOf(status);
  const text = children ?? LABEL[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge badge--${t}`}>{text}</span>;
}

/* ---------- Buttons ---------- */
export function Button({ variant = 'default', size, icon, children, className, ...rest }) {
  return (
    <button type="button" className={cx('btn', `btn--${variant}`, size && `btn--${size}`, className)} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/* ---------- Layout pieces ---------- */
export function PageHeader({ title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, description, actions, children, className, flush }) {
  return (
    <section className={cx('panel', flush && 'panel--flush', className)}>
      {(title || actions) && (
        <div className="panel__head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Avatar({ name, size = 32 }) {
  // Stable hue from the name so each person keeps their colour
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${h} 32% 88%)`, color: `hsl(${h} 45% 28%)` }}>
      {initials(name)}
    </span>
  );
}

export function Person({ user, sub }) {
  if (!user) return <span className="muted">Unknown</span>;
  return (
    <span className="person">
      <Avatar name={user.businessName || user.name} size={30} />
      <span className="person__text">
        <span className="person__name">{user.businessName || user.name}</span>
        <span className="person__sub">{sub ?? (user.businessName ? user.name : user.city)}</span>
      </span>
    </span>
  );
}

/* ---------- Inputs ---------- */
export function SearchField({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="search">
      <Icon name="search" size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="x" size={14} />
        </button>
      )}
    </label>
  );
}

export function Select({ value, onChange, options, label }) {
  return (
    <label className="select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={cx('tabs__tab', value === o.value && 'is-active')} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className="tabs__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>;
}

/* ---------- Side drawer for record details ---------- */
export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-wrap">
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="drawer__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__foot">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Details({ items }) {
  return (
    <dl className="details">
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Toasts({ items }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <Icon name={t.tone === 'ok' ? 'check' : 'alert'} size={16} />
          {t.text}
        </div>
      ))}
    </div>
  );
}
