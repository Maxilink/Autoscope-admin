import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQueues, useStore } from '../data/store.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { activeUsersDaily, CATEGORIES, gmvWeekly, liveJobs, platformTotals } from '../data/mock.js';
import { AreaLine, CATEGORY_COLORS, Legend, ShareBars, StackedBars } from '../components/charts.jsx';
import { Badge, Panel } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ago, cx, moneyShort, num, pct } from '../lib/format.js';

const KEYS = Object.entries(CATEGORIES).map(([key, label]) => ({ key, label, color: CATEGORY_COLORS[key] }));

function Lamp({ to, count, label, note, level }) {
  return (
    <Link to={to} className={cx('lamp', `lamp--${level}`)}>
      <span className="lamp__light" aria-hidden="true" />
      <span className="lamp__count">{count}</span>
      <span className="lamp__label">{label}</span>
      <span className="lamp__note">{note}</span>
    </Link>
  );
}

function Delta({ value }) {
  const up = value >= 0;
  return (
    <span className={cx('delta', up ? 'delta--up' : 'delta--down')}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} size={12} strokeWidth={2.4} />
      {pct(Math.abs(value))}
    </span>
  );
}

export default function Overview() {
  const q = useQueues();
  const { auditLog, userById, commissionRates } = useStore();
  const { user, can } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const lamps = [
    { to: '/verification', count: q.kyc, label: 'Providers awaiting verification', note: q.kycFlagged ? `${q.kycFlagged} flagged by ID check` : 'All passed ID check', level: q.kycFlagged ? 'alert' : q.kyc ? 'warn' : 'off' },
    { to: '/listings', count: q.listings, label: 'Listings to review', note: q.listingsFlagged ? `${q.listingsFlagged} with fraud signals` : 'No fraud signals', level: q.listingsFlagged ? 'alert' : q.listings ? 'warn' : 'off' },
    { to: '/disputes', count: q.disputes, label: 'Open disputes', note: q.disputesHigh ? `${q.disputesHigh} high value or urgent` : 'None urgent', level: q.disputesHigh ? 'alert' : q.disputes ? 'warn' : 'off' },
    { to: '/reports', count: q.reports, label: 'Reported content', note: 'Listings, reviews and accounts', level: q.reports ? 'warn' : 'off' },
    { to: '/finance', count: q.payouts, label: 'Payouts due Friday', note: q.payoutsHeld ? `${q.payoutsHeld} on hold` : 'None on hold', level: q.payoutsHeld ? 'warn' : 'off' },
  ].filter((l) => can(l.to));

  const last = gmvWeekly[gmvWeekly.length - 1];
  const prev = gmvWeekly[gmvWeekly.length - 2];
  const gmvDelta = ((last.total - prev.total) / prev.total) * 100;
  const dau = activeUsersDaily[activeUsersDaily.length - 1].value;
  const dauWeekAgo = activeUsersDaily[activeUsersDaily.length - 8].value;

  const chartData = gmvWeekly.map((w) => {
    const d = new Date(w.week);
    return { ...w, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), tooltipLabel: `Week ending ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` };
  });

  const share = useMemo(() => {
    const totals = Object.keys(CATEGORIES).map((key) => {
      const value = gmvWeekly.slice(-4).reduce((s, w) => s + w[key], 0);
      return { key, value };
    });
    return totals
      .sort((a, b) => b.value - a.value)
      .map(({ key, value }) => ({
        key,
        value,
        label: CATEGORIES[key],
        color: CATEGORY_COLORS[key],
        extra: <span>{commissionRates[key].rate}% fee, about {moneyShort((value * commissionRates[key].rate) / 100)} revenue</span>,
      }));
  }, [commissionRates]);

  const revenue4w = share.reduce((s, c) => s + (c.value * commissionRates[c.key].rate) / 100, 0);

  return (
    <div className="stack">
      <section className="overview-head">
        <div>
          <h1>{greeting}, {user.name.split(' ')[0]}</h1>
          <p>{lamps.every((l) => l.count === 0) ? 'Every queue is clear.' : 'Here is what needs a decision today.'}</p>
        </div>
      </section>

      <section className="lamps" aria-label="Queues needing attention" style={{ '--lamps': lamps.length }}>
        {lamps.map((l) => (
          <Lamp key={l.to} {...l} />
        ))}
      </section>

      <div className="grid grid--main">
        <Panel
          title="Gross merchandise value"
          description="Weekly, last 12 weeks"
          actions={<Legend keys={KEYS} />}
          className="span-2"
        >
          <div className="figures">
            <div>
              <span className="figures__label">This week</span>
              <span className="figures__value">{moneyShort(last.total)}</span>
              <Delta value={gmvDelta} />
            </div>
            <div>
              <span className="figures__label">Platform revenue, 4 weeks</span>
              <span className="figures__value">{moneyShort(revenue4w)}</span>
            </div>
            <div>
              <span className="figures__label">Transactions, 30 days</span>
              <span className="figures__value">{num(platformTotals.transactions30d)}</span>
            </div>
            <div>
              <span className="figures__label">Core uptime</span>
              <span className="figures__value">{platformTotals.uptime}%</span>
              <span className="figures__hint">Target 99.5%</span>
            </div>
          </div>
          <StackedBars data={chartData} keys={KEYS} />
        </Panel>

        <Panel title="Category performance" description="Share of GMV, last 4 weeks">
          <ShareBars items={share} />
        </Panel>
      </div>

      <div className="grid grid--three">
        <Panel title="Daily active users" description="Last 30 days">
          <div className="figures figures--tight">
            <div>
              <span className="figures__value">{num(dau)}</span>
              <Delta value={((dau - dauWeekAgo) / dauWeekAgo) * 100} />
              <span className="figures__hint">vs same day last week</span>
            </div>
          </div>
          <AreaLine data={activeUsersDaily} label="Daily active users, last 30 days" />
          <div className="mini-stats">
            <span>
              <strong>{num(platformTotals.registeredUsers)}</strong> registered
            </span>
            <span>
              <strong>{num(platformTotals.verifiedProviders)}</strong> verified providers
            </span>
          </div>
        </Panel>

        <Panel title="Live haulage jobs" description="Towing and haulage in progress" flush actions={<Link className="link" to="/activity?kind=haulage">All jobs</Link>}>
          <ul className="feed">
            {liveJobs.map((j) => (
              <li key={j.id} className="feed__item">
                <span className={cx('feed__icon', j.sos && 'feed__icon--sos')}>
                  <Icon name="truck" size={16} />
                </span>
                <span className="feed__body">
                  <span className="feed__title">
                    {j.sos && <span className="sos">SOS</span>}
                    {j.pickup}
                  </span>
                  <span className="feed__meta">
                    {(userById(j.providerId)?.businessName) || 'Provider'} for {userById(j.buyerId)?.name}
                  </span>
                </span>
                <span className="feed__aside">
                  <Badge status={j.status} />
                  <span className="feed__eta">{j.eta ? `ETA ${j.eta} min` : 'Finding driver'}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent admin actions" flush actions={can('/audit') && <Link className="link" to="/audit">Audit log</Link>}>
          <ul className="feed">
            {auditLog
              .filter((e) => e.kind === 'admin')
              .slice(0, 6)
              .map((e) => (
                <li key={e.id} className="feed__item">
                  <span className="feed__body">
                    <span className="feed__title">{e.action}</span>
                    <span className="feed__meta">
                      {e.actor}, {e.target}
                    </span>
                  </span>
                  <span className="feed__aside feed__time">{ago(e.at)}</span>
                </li>
              ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
