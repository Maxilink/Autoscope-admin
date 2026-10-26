import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Toasts } from './ui.jsx';
import { useQueues, useStore } from '../data/store.jsx';
import { cx } from '../lib/format.js';

const NAV = [
  { items: [{ to: '/', label: 'Overview', icon: 'gauge', end: true }] },
  {
    group: 'Trust & safety',
    items: [
      { to: '/verification', label: 'Verification', icon: 'shield', count: 'kyc' },
      { to: '/listings', label: 'Listing review', icon: 'tag', count: 'listings' },
      { to: '/reports', label: 'Reports', icon: 'flag', count: 'reports' },
      { to: '/disputes', label: 'Disputes', icon: 'scale', count: 'disputes' },
    ],
  },
  {
    group: 'Marketplace',
    items: [
      { to: '/users', label: 'Users', icon: 'users' },
      { to: '/activity', label: 'Orders & jobs', icon: 'list' },
    ],
  },
  {
    group: 'Platform',
    items: [
      { to: '/finance', label: 'Payouts & fees', icon: 'wallet', count: 'payouts' },
      { to: '/announcements', label: 'Announcements', icon: 'megaphone' },
      { to: '/audit', label: 'Audit log', icon: 'log' },
    ],
  },
];

export default function Layout({ children }) {
  const queues = useQueues();
  const { toasts } = useStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    document.querySelector('.main')?.scrollTo?.(0, 0);
  }, [location.pathname]);

  return (
    <div className={cx('shell', open && 'nav-open')}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <path d="M5 22a11 11 0 0 1 22 0" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 22l5.5-6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="22" r="2.4" fill="currentColor" />
          </svg>
          <span>
            <strong>AutoScope</strong>
            <small>Admin console</small>
          </span>
        </div>

        <nav>
          {NAV.map((section, i) => (
            <div key={i} className="nav-group">
              {section.group && <p className="nav-group__title">{section.group}</p>}
              {section.items.map((item) => {
                const count = item.count ? queues[item.count] : 0;
                return (
                  <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('nav-link', isActive && 'is-active')}>
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                    {count > 0 && <span className="nav-link__count">{count}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <span className="avatar avatar--me">AN</span>
          <span>
            <strong>Adaora Nwankwo</strong>
            <small>Operations admin</small>
          </span>
        </div>
      </aside>

      <div className="scrim" onClick={() => setOpen(false)} />

      <div className="main">
        <div className="topbar">
          <button type="button" className="icon-btn topbar__menu" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <span className="env-pill" title="Data comes from src/data/mock.js until the API is connected">
            Demo data
          </span>
        </div>
        <main className="content">{children}</main>
      </div>
      <Toasts items={toasts} />
    </div>
  );
}
