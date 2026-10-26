import { useMemo, useState } from 'react';
import { useStore } from '../data/store.jsx';
import { ROLES } from '../data/mock.js';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import { Badge, Button, Details, Drawer, Field, PageHeader, Panel, Person, SearchField, Select, Tabs, Toolbar } from '../components/ui.jsx';
import { ago, dateTime } from '../lib/format.js';

const REJECT_REASONS = [
  'Document is unreadable or blurred',
  'Name does not match business registration',
  'Document has expired',
  'Business registration number not found',
  'Licence does not cover this service',
];

export default function Verification() {
  const { kyc, userById, decideKyc, toast } = useStore();
  const [tab, setTab] = useState('pending');
  const [role, setRole] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  kyc.forEach((k) => counts[k.status]++);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return kyc
      .filter((k) => k.status === tab && (role === 'all' || k.role === role))
      .filter((k) => {
        const u = userById(k.userId);
        return !q || `${u.name} ${u.businessName} ${k.id} ${u.city}`.toLowerCase().includes(q);
      });
  }, [kyc, tab, role, query, userById]);

  const open = kyc.find((k) => k.id === openId);
  const user = open && userById(open.userId);

  const close = () => {
    setOpenId(null);
    setRejecting(false);
  };

  const approve = () => {
    decideKyc(open.id, 'approve');
    toast(`${user.businessName} approved. Their listings can now go live.`);
    close();
  };
  const reject = () => {
    decideKyc(open.id, 'reject', reason);
    toast(`${user.businessName} rejected. They've been asked to resubmit.`, 'warn');
    close();
  };

  const columns = [
    { key: 'provider', header: 'Provider', render: (k) => <Person user={userById(k.userId)} />, sort: (k) => userById(k.userId).businessName },
    { key: 'role', header: 'Role', render: (k) => ROLES[k.role], sort: (k) => k.role },
    { key: 'city', header: 'City', render: (k) => userById(k.userId).city },
    {
      key: 'check',
      header: 'ID check',
      render: (k) =>
        k.autoCheck === 'flagged' ? (
          <span className="flag-text">
            <Icon name="alert" size={14} /> {k.autoCheckNote}
          </span>
        ) : (
          <span className="muted">Passed</span>
        ),
    },
    { key: 'submitted', header: 'Submitted', render: (k) => ago(k.submittedAt), sort: (k) => k.submittedAt },
  ];

  return (
    <div className="stack">
      <PageHeader title="Provider verification" description="Review KYC documents before a provider's listings go live. Automated ID checks run first; anything flagged needs a closer look." />
      <Panel flush>
        <Toolbar>
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pending', label: 'Pending', count: counts.pending },
              { value: 'approved', label: 'Approved', count: counts.approved },
              { value: 'rejected', label: 'Rejected', count: counts.rejected },
            ]}
          />
          <div className="toolbar__right">
            <Select label="Role" value={role} onChange={setRole} options={[{ value: 'all', label: 'All roles' }, ...Object.entries(ROLES).filter(([k]) => k !== 'owner').map(([value, label]) => ({ value, label }))]} />
            <SearchField value={query} onChange={setQuery} placeholder="Search providers" />
          </div>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(k) => setOpenId(k.id)}
          activeId={openId}
          initialSort={{ key: 'submitted', dir: 'asc' }}
          empty={{ title: tab === 'pending' ? 'No providers waiting' : `No ${tab} submissions`, body: tab === 'pending' ? 'New KYC submissions will appear here.' : 'Decisions you make will show up here.' }}
        />
      </Panel>

      <Drawer
        open={!!open}
        onClose={close}
        title={user?.businessName}
        subtitle={open && `${open.id}, ${ROLES[open.role]}`}
        footer={
          open?.status === 'pending' &&
          (rejecting ? (
            <>
              <Button variant="ghost" onClick={() => setRejecting(false)}>Back</Button>
              <Button variant="danger" onClick={reject}>Reject submission</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setRejecting(true)}>Reject</Button>
              <Button variant="primary" icon="check" onClick={approve}>Approve provider</Button>
            </>
          ))
        }
      >
        {open && (
          <>
            {open.autoCheck === 'flagged' ? (
              <div className="callout callout--warn">
                <Icon name="alert" size={18} />
                <div>
                  <strong>ID check flagged this submission</strong>
                  <p>{open.autoCheckNote}</p>
                </div>
              </div>
            ) : (
              <div className="callout callout--ok">
                <Icon name="check" size={18} />
                <div>
                  <strong>ID check passed</strong>
                  <p>{open.autoCheckNote}</p>
                </div>
              </div>
            )}

            <h3 className="drawer__section">Documents</h3>
            <ul className="docs">
              {open.documents.map((d) => (
                <li key={d.label} className={d.check === 'issue' ? 'has-issue' : ''}>
                  <Icon name="document" size={18} />
                  <span>
                    <strong>{d.label}</strong>
                    <small>{d.file}</small>
                  </span>
                  {d.check === 'issue' ? <Badge status="flagged">Check this</Badge> : <Badge status="passed">Readable</Badge>}
                </li>
              ))}
            </ul>

            <h3 className="drawer__section">Applicant</h3>
            <Details
              items={[
                ['Contact person', user.name],
                ['Email', user.email],
                ['Phone', user.phone],
                ['City', user.city],
                ['Two-factor', user.twoFactor ? 'On' : 'Off'],
                ['Submitted', dateTime(open.submittedAt)],
                open.rejectionReason && ['Rejection reason', open.rejectionReason],
              ]}
            />

            {rejecting && (
              <div className="reject-box">
                <Field label="Reason sent to the provider" hint="They'll get this by push and email, with a link to resubmit.">
                  <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REJECT_REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
