import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../data/store.jsx';
import { ROLES } from '../data/mock.js';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, Badge, Button, Details, Empty, Field, Panel } from '../components/ui.jsx';
import { ago, date, dateTime, money } from '../lib/format.js';

const SUSPEND_REASONS = ['Fraudulent listings', 'Repeated abusive behaviour', 'Off-platform payment requests', 'Chargeback abuse', 'Impersonation'];

export default function UserDetail() {
  const { id } = useParams();
  const { userById, activity, listings, auditLog, setUserStatus, toast } = useStore();
  const user = userById(id);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState(SUSPEND_REASONS[0]);

  if (!user) {
    return (
      <Empty title="User not found">
        <Link className="link" to="/users">Back to users</Link>
      </Empty>
    );
  }

  const tx = activity.filter((a) => a.buyerId === id || a.providerId === id);
  const own = listings.filter((l) => l.sellerId === id);
  const spend = tx.filter((a) => a.buyerId === id && a.escrow !== 'refunded').reduce((s, a) => s + a.amount, 0);
  const earned = tx.filter((a) => a.providerId === id && a.escrow === 'released').reduce((s, a) => s + a.amount, 0);
  const events = auditLog.filter((e) => e.actor === user.name || e.target === id).slice(0, 8);

  const suspend = () => {
    setUserStatus(id, 'suspended', reason);
    toast(`${user.businessName || user.name} suspended. Their listings are hidden.`, 'warn');
    setSuspending(false);
  };
  const reinstate = () => {
    setUserStatus(id, 'active');
    toast(`${user.businessName || user.name} reinstated.`);
  };

  return (
    <div className="stack">
      <Link to="/users" className="back-link">
        <Icon name="chevronLeft" size={16} /> Users
      </Link>

      <section className="profile">
        <Avatar name={user.businessName || user.name} size={64} />
        <div className="profile__main">
          <h1>{user.businessName || user.name}</h1>
          <p>
            {user.businessName && <>{user.name}, </>}
            {user.roles.map((r) => ROLES[r]).join(' and ')} in {user.city}
          </p>
          <div className="profile__badges">
            <Badge status={user.status} />
            {user.kycStatus !== 'not_required' && <Badge status={user.kycStatus}>{`KYC ${user.kycStatus}`}</Badge>}
            {user.rating && <span className="rating">★ {user.rating} ({user.reviewCount})</span>}
          </div>
        </div>
        <div className="profile__actions">
          {user.status === 'active' ? (
            !suspending && <Button variant="danger" onClick={() => setSuspending(true)}>Suspend account</Button>
          ) : (
            <Button variant="primary" onClick={reinstate}>Reinstate account</Button>
          )}
        </div>
      </section>

      {suspending && (
        <Panel className="suspend-panel">
          <Field label="Why are you suspending this account?" hint="The user is signed out, their listings are hidden and open escrow is frozen.">
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {SUSPEND_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <div className="row-actions">
            <Button variant="ghost" onClick={() => setSuspending(false)}>Cancel</Button>
            <Button variant="danger" onClick={suspend}>Suspend account</Button>
          </div>
        </Panel>
      )}

      <div className="grid grid--side">
        <Panel title="Account">
          <Details
            items={[
              ['User ID', user.id],
              ['Email', user.email],
              ['Phone', user.phone],
              ['Joined', date(user.joinedAt)],
              ['Last active', ago(user.lastActive)],
              ['Two-factor', user.twoFactor ? 'On' : 'Off'],
              user.vehicles > 0 && ['Vehicles in garage', user.vehicles],
              ['Total spent', money(spend)],
              user.primaryRole !== 'owner' && ['Paid out', money(earned)],
            ]}
          />
        </Panel>

        <div className="stack">
          <Panel title="Orders, bookings and jobs" flush>
            <DataTable
              pageSize={6}
              rows={tx}
              empty={{ title: 'No transactions yet' }}
              columns={[
                { key: 'id', header: 'Reference', render: (a) => <span className="mono-id">{a.id}</span> },
                { key: 'kind', header: 'Type', render: (a) => a.kindLabel },
                { key: 'side', header: 'Side', render: (a) => (a.buyerId === id ? 'Buyer' : 'Provider') },
                { key: 'amount', header: 'Amount', align: 'right', render: (a) => <span className="num">{money(a.amount)}</span> },
                { key: 'status', header: 'Status', render: (a) => <Badge status={a.status} /> },
                { key: 'at', header: 'Date', render: (a) => date(a.createdAt) },
              ]}
            />
          </Panel>

          {own.length > 0 && (
            <Panel title="Listings" flush>
              <DataTable
                pageSize={5}
                rows={own}
                columns={[
                  { key: 'title', header: 'Title', render: (l) => <strong>{l.title}</strong> },
                  { key: 'price', header: 'Price', align: 'right', render: (l) => <span className="num">{money(l.price)}</span> },
                  { key: 'status', header: 'Status', render: (l) => <Badge status={l.status} /> },
                ]}
              />
            </Panel>
          )}

          <Panel title="Security events" description="Sign-ins and admin actions on this account" flush>
            {events.length ? (
              <ul className="feed">
                {events.map((e) => (
                  <li key={e.id} className="feed__item">
                    <span className="feed__body">
                      <span className="feed__title">{e.action}</span>
                      <span className="feed__meta">
                        {e.actor === user.name ? e.target : `By ${e.actor}`}, IP {e.ip}
                      </span>
                    </span>
                    <span className="feed__aside feed__time">{dateTime(e.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No events in the last 30 days" />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
