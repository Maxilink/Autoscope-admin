import { useMemo, useState } from 'react';
import { useStore } from '../data/store.jsx';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import { Badge, Button, Details, Drawer, Field, PageHeader, Panel, Person, SearchField, Select, Tabs, Toolbar } from '../components/ui.jsx';
import { ago, date, money, num } from '../lib/format.js';

const TYPES = { vehicle: ['Vehicle', 'car'], part: ['Part', 'cog'], service: ['Mechanic service', 'wrench'], insurance: ['Insurance product', 'umbrella'] };
const TAB_STATUSES = { review: ['pending'], live: ['active', 'reserved', 'sold'], removed: ['suspended', 'rejected'] };

export default function Listings() {
  const { listings, userById, setListingStatus, toast } = useStore();
  const [tab, setTab] = useState('review');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState('');

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return listings.filter(
      (l) => TAB_STATUSES[tab].includes(l.status) && (type === 'all' || l.type === type) && (!q || `${l.title} ${l.id} ${userById(l.sellerId)?.businessName ?? ''}`.toLowerCase().includes(q)),
    );
  }, [listings, tab, type, query, userById]);

  const count = (t) => listings.filter((l) => TAB_STATUSES[t].includes(l.status)).length;
  const open = listings.find((l) => l.id === openId);
  const seller = open && userById(open.sellerId);

  const act = (status, message, tone) => {
    setListingStatus(open.id, status, note.trim() || undefined);
    toast(message, tone);
    setNote('');
    setOpenId(null);
  };

  const columns = [
    {
      key: 'title',
      header: 'Listing',
      render: (l) => (
        <span className="cell-title">
          <span className="type-icon"><Icon name={TYPES[l.type][1]} size={16} /></span>
          <span>
            <strong>{l.title}</strong>
            <small>{l.id}</small>
          </span>
        </span>
      ),
      sort: (l) => l.title,
    },
    { key: 'seller', header: 'Seller', render: (l) => <Person user={userById(l.sellerId)} /> },
    { key: 'price', header: 'Price', align: 'right', render: (l) => <span className="num">{money(l.price)}</span>, sort: (l) => l.price },
    tab === 'review'
      ? { key: 'signal', header: 'Signals', render: (l) => (l.autoCheck ? <span className="flag-text"><Icon name="alert" size={14} /> {l.autoCheck}</span> : <span className="muted">None</span>) }
      : { key: 'perf', header: 'Views / inquiries', align: 'right', render: (l) => <span className="num">{num(l.views)} / {l.inquiries}</span>, sort: (l) => l.views },
    { key: 'status', header: 'Status', render: (l) => <Badge status={l.status} /> },
    { key: 'created', header: 'Created', render: (l) => ago(l.createdAt), sort: (l) => l.createdAt },
  ];

  return (
    <div className="stack">
      <PageHeader title="Listing review" description="Vehicles, parts, services and insurance products go live after passing automated checks and your review." />
      <Panel flush>
        <Toolbar>
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'review', label: 'To review', count: count('review') },
              { value: 'live', label: 'Live', count: count('live') },
              { value: 'removed', label: 'Suspended or rejected', count: count('removed') },
            ]}
          />
          <div className="toolbar__right">
            <Select label="Type" value={type} onChange={setType} options={[{ value: 'all', label: 'All types' }, ...Object.entries(TYPES).map(([value, [label]]) => ({ value, label }))]} />
            <SearchField value={query} onChange={setQuery} placeholder="Search listings" />
          </div>
        </Toolbar>
        <DataTable columns={columns} rows={rows} onRowClick={(l) => setOpenId(l.id)} activeId={openId} empty={{ title: 'No listings here', body: 'Try another type or clear the search.' }} />
      </Panel>

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open?.title}
        subtitle={open && `${open.id}, ${TYPES[open.type][0]}`}
        footer={
          open && (
            <>
              {open.status === 'pending' && (
                <>
                  <Button variant="ghost" onClick={() => act('rejected', 'Listing rejected. The seller has been notified.', 'warn')}>Reject</Button>
                  <Button variant="primary" icon="check" onClick={() => act('active', 'Listing approved and now live.')}>Approve and publish</Button>
                </>
              )}
              {['active', 'reserved', 'sold'].includes(open.status) && (
                <Button variant="danger" onClick={() => act('suspended', 'Listing suspended and hidden from search.', 'warn')}>Suspend listing</Button>
              )}
              {['suspended', 'rejected'].includes(open.status) && (
                <Button variant="primary" onClick={() => act('active', 'Listing reinstated.')}>Reinstate listing</Button>
              )}
            </>
          )
        }
      >
        {open && (
          <>
            {open.autoCheck && (
              <div className="callout callout--warn">
                <Icon name="alert" size={18} />
                <div>
                  <strong>Fraud signal</strong>
                  <p>{open.autoCheck}</p>
                </div>
              </div>
            )}
            <div className="price-line">
              <span className="num">{money(open.price)}</span>
              <Badge status={open.status} />
            </div>
            <div className="photo-strip" aria-label={`${open.photos} photos`}>
              {Array.from({ length: Math.min(open.photos, 4) }, (_, i) => (
                <span key={i} className="photo-strip__ph">
                  <Icon name={TYPES[open.type][1]} size={22} />
                </span>
              ))}
              {open.photos > 4 && <span className="photo-strip__more">+{open.photos - 4}</span>}
            </div>
            <h3 className="drawer__section">Details</h3>
            <Details items={[...Object.entries(open.meta), ['Created', date(open.createdAt)], open.status !== 'pending' && ['Views', num(open.views)], open.status !== 'pending' && ['Inquiries', open.inquiries], open.moderationNote && ['Moderation note', open.moderationNote]]} />
            <h3 className="drawer__section">Seller</h3>
            <div className="seller-row">
              <Person user={seller} />
              <Badge status={seller.kycStatus} />
            </div>
            {seller.rating && (
              <p className="muted small">
                {seller.rating} average from {seller.reviewCount} reviews
              </p>
            )}
            <div className="reject-box">
              <Field label="Note to seller (optional)" hint="Included in the notification when you approve, reject or suspend.">
                <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please upload clear photos of the VIN plate" />
              </Field>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
