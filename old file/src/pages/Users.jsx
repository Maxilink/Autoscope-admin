import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../data/store.jsx';
import { ROLES } from '../data/mock.js';
import DataTable from '../components/DataTable.jsx';
import { Badge, PageHeader, Panel, Person, SearchField, Select, Toolbar } from '../components/ui.jsx';
import { ago, date } from '../lib/format.js';

export default function Users() {
  const { users } = useStore();
  const navigate = useNavigate();
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter(
      (u) =>
        (role === 'all' || u.roles.includes(role)) &&
        (status === 'all' || u.status === status || u.kycStatus === status) &&
        (!q || `${u.name} ${u.businessName ?? ''} ${u.email} ${u.phone} ${u.id}`.toLowerCase().includes(q)),
    );
  }, [users, role, status, query]);

  const columns = [
    { key: 'name', header: 'Name', render: (u) => <Person user={u} sub={u.email} />, sort: (u) => u.businessName || u.name },
    { key: 'roles', header: 'Roles', render: (u) => u.roles.map((r) => ROLES[r]).join(', ') },
    { key: 'city', header: 'City', sort: (u) => u.city },
    { key: 'kyc', header: 'Verification', render: (u) => <Badge status={u.kycStatus} /> },
    { key: 'status', header: 'Account', render: (u) => <Badge status={u.status} /> },
    { key: 'joined', header: 'Joined', render: (u) => date(u.joinedAt), sort: (u) => u.joinedAt },
    { key: 'active', header: 'Last active', render: (u) => ago(u.lastActive), sort: (u) => u.lastActive },
  ];

  return (
    <div className="stack">
      <PageHeader title="Users" description={`${users.length} accounts in this sample. Business accounts must pass verification before they can list.`} />
      <Panel flush>
        <Toolbar>
          <div className="toolbar__left">
            <Select label="Role" value={role} onChange={setRole} options={[{ value: 'all', label: 'All roles' }, ...Object.entries(ROLES).map(([value, label]) => ({ value, label }))]} />
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Any status' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'pending', label: 'Verification pending' },
                { value: 'rejected', label: 'Verification rejected' },
              ]}
            />
          </div>
          <div className="toolbar__right">
            <SearchField value={query} onChange={setQuery} placeholder="Name, email, phone or ID" />
          </div>
        </Toolbar>
        <DataTable columns={columns} rows={rows} onRowClick={(u) => navigate(`/users/${u.id}`)} pageSize={15} empty={{ title: 'No users match', body: 'Clear a filter or try a different search.' }} />
      </Panel>
    </div>
  );
}
