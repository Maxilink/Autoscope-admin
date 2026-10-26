import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../data/store.jsx';
import DataTable from '../components/DataTable.jsx';
import { Badge, Details, Drawer, PageHeader, Panel, Person, SearchField, Select, Tabs, Toolbar } from '../components/ui.jsx';
import { dateTime, money, moneyShort } from '../lib/format.js';

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'order', label: 'Parts orders' },
  { value: 'vehicle', label: 'Vehicle sales' },
  { value: 'booking', label: 'Service bookings' },
  { value: 'haulage', label: 'Haulage jobs' },
  { value: 'policy', label: 'Insurance' },
];

export default function Activity() {
  const { activity, userById, commissionRates, disputes } = useStore();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') || 'all';
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const ofKind = useMemo(() => activity.filter((a) => kind === 'all' || a.kind === kind), [activity, kind]);
  const statuses = useMemo(() => [...new Set(ofKind.map((a) => a.status))].sort(), [ofKind]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return ofKind.filter((a) => {
      if (status !== 'all' && a.status !== status) return false;
      if (!q) return true;
      const b = userById(a.buyerId);
      const p = userById(a.providerId);
      return `${a.id} ${b?.name} ${p?.businessName} ${a.city}`.toLowerCase().includes(q);
    });
  }, [ofKind, status, query, userById]);

  const held = ofKind.filter((a) => a.escrow === 'held').reduce((s, a) => s + a.amount, 0);
  const volume = ofKind.filter((a) => a.escrow !== 'refunded').reduce((s, a) => s + a.amount, 0);

  const open = activity.find((a) => a.id === openId);
  const dispute = open && disputes.find((d) => d.txId === open.id);

  const columns = [
    { key: 'id', header: 'Reference', render: (a) => <span className="mono-id">{a.id}{a.sos && <span className="sos">SOS</span>}</span>, sort: (a) => a.id },
    { key: 'kind', header: 'Type', render: (a) => a.kindLabel },
    { key: 'buyer', header: 'Customer', render: (a) => userById(a.buyerId)?.name },
    { key: 'provider', header: 'Provider', render: (a) => userById(a.providerId)?.businessName },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => <span className="num">{money(a.amount)}</span>, sort: (a) => a.amount },
    { key: 'status', header: 'Status', render: (a) => <Badge status={a.status} /> },
    { key: 'escrow', header: 'Escrow', render: (a) => <Badge status={a.escrow} /> },
    { key: 'at', header: 'Created', render: (a) => dateTime(a.createdAt), sort: (a) => a.createdAt },
  ];

  return (
    <div className="stack">
      <PageHeader title="Orders, bookings and jobs" description="Every transaction on the platform, from parts orders to towing jobs and policy purchases." />
      <div className="summary">
        <div>
          <span className="summary__label">Transactions shown</span>
          <span className="summary__value">{ofKind.length}</span>
        </div>
        <div>
          <span className="summary__label">Volume</span>
          <span className="summary__value">{moneyShort(volume)}</span>
        </div>
        <div>
          <span className="summary__label">Held in escrow</span>
          <span className="summary__value">{moneyShort(held)}</span>
        </div>
      </div>
      <Panel flush>
        <Toolbar>
          <Tabs
            value={kind}
            onChange={(v) => {
              setStatus('all');
              setParams(v === 'all' ? {} : { kind: v });
            }}
            options={KINDS}
          />
          <div className="toolbar__right">
            <Select label="Status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Any status' }, ...statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
            <SearchField value={query} onChange={setQuery} placeholder="Reference, name or city" />
          </div>
        </Toolbar>
        <DataTable columns={columns} rows={rows} onRowClick={(a) => setOpenId(a.id)} activeId={openId} pageSize={15} empty={{ title: 'No transactions match', body: 'Try a different status or search.' }} />
      </Panel>

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.id} subtitle={open?.kindLabel}>
        {open && (
          <>
            <div className="price-line">
              <span className="num">{money(open.amount)}</span>
              <Badge status={open.status} />
            </div>
            <h3 className="drawer__section">Parties</h3>
            <div className="parties">
              <div>
                <small>Customer</small>
                <Link to={`/users/${open.buyerId}`}><Person user={userById(open.buyerId)} /></Link>
              </div>
              <div>
                <small>Provider</small>
                <Link to={`/users/${open.providerId}`}><Person user={userById(open.providerId)} /></Link>
              </div>
            </div>
            <h3 className="drawer__section">Payment</h3>
            <Details
              items={[
                ['Method', open.method],
                ['Escrow', <Badge key="e" status={open.escrow} />],
                ['Platform fee', `${money(Math.round((open.amount * commissionRates[open.category].rate) / 100))} (${commissionRates[open.category].rate}%)`],
                ['Created', dateTime(open.createdAt)],
                ['City', open.city],
                open.sos && ['Priority', 'Emergency (SOS) dispatch'],
              ]}
            />
            {dispute && (
              <div className="callout callout--warn">
                <div>
                  <strong>This transaction has a dispute</strong>
                  <p>
                    {dispute.reason}. <Link className="link" to={`/disputes?open=${dispute.id}`}>Open {dispute.id}</Link>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
