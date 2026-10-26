import { useMemo, useState } from 'react';
import { useStore } from '../data/store.jsx';
import { Badge, Button, Empty, PageHeader, Panel, Tabs, Toolbar } from '../components/ui.jsx';
import { ago } from '../lib/format.js';

const TARGET = { listing: 'Listing', review: 'Review', user: 'Account' };

export default function Reports() {
  const { reports, userById, decideReport, toast } = useStore();
  const [tab, setTab] = useState('open');

  const rows = useMemo(
    () => reports.filter((r) => (tab === 'open' ? r.status === 'open' : r.status !== 'open')).sort((a, b) => b.reportCount - a.reportCount),
    [reports, tab],
  );
  const openCount = reports.filter((r) => r.status === 'open').length;

  const decide = (r, status) => {
    decideReport(r.id, status);
    toast(status === 'removed' ? `${TARGET[r.targetType]} removed. The reporter has been told.` : 'Report dismissed.', status === 'removed' ? 'warn' : 'ok');
  };

  return (
    <div className="stack">
      <PageHeader title="Reported content" description="Listings, reviews and accounts flagged by users as abusive, fraudulent or inappropriate. Most-reported first." />
      <Panel flush>
        <Toolbar>
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'open', label: 'Needs review', count: openCount },
              { value: 'closed', label: 'Closed', count: reports.length - openCount },
            ]}
          />
        </Toolbar>
        {rows.length === 0 ? (
          <Empty title="Nothing to review">When users report content it will appear here.</Empty>
        ) : (
          <ul className="reports">
            {rows.map((r) => (
              <li key={r.id} className="report">
                <div className="report__count" title={`${r.reportCount} reports`}>
                  <strong>{r.reportCount}</strong>
                  <small>{r.reportCount === 1 ? 'report' : 'reports'}</small>
                </div>
                <div className="report__body">
                  <div className="report__top">
                    <Badge tone="neutral" status="x">{TARGET[r.targetType]}</Badge>
                    <strong>{r.target}</strong>
                  </div>
                  <blockquote>{r.excerpt}</blockquote>
                  <p className="report__meta">
                    {r.reason}, first reported by {userById(r.reporterId)?.name} {ago(r.createdAt)}
                  </p>
                </div>
                <div className="report__actions">
                  {r.status === 'open' ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => decide(r, 'dismissed')}>Dismiss</Button>
                      <Button size="sm" variant="danger" onClick={() => decide(r, 'removed')}>Remove {TARGET[r.targetType].toLowerCase()}</Button>
                    </>
                  ) : (
                    <Badge status={r.status} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
