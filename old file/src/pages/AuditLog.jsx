import { useMemo, useState } from 'react';
import { useStore } from '../data/store.jsx';
import DataTable from '../components/DataTable.jsx';
import { Badge, Button, PageHeader, Panel, SearchField, Tabs, Toolbar } from '../components/ui.jsx';
import { dateTime } from '../lib/format.js';

function toCsv(rows) {
  const head = ['id', 'time', 'type', 'actor', 'action', 'target', 'ip'];
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return [head.join(','), ...rows.map((r) => [r.id, r.at, r.kind, r.actor, r.action, r.target, r.ip].map(esc).join(','))].join('\n');
}

export default function AuditLog() {
  const { auditLog } = useStore();
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return auditLog.filter((e) => (kind === 'all' || e.kind === kind) && (!q || `${e.actor} ${e.action} ${e.target} ${e.ip}`.toLowerCase().includes(q)));
  }, [auditLog, kind, query]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoscope-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack">
      <PageHeader title="Audit log" description="Sign-ins, security changes and every admin decision, kept for compliance." actions={<Button icon="arrowDown" onClick={download}>Export CSV</Button>} />
      <Panel flush>
        <Toolbar>
          <Tabs
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'All events' },
              { value: 'admin', label: 'Admin actions' },
              { value: 'auth', label: 'Authentication' },
            ]}
          />
          <div className="toolbar__right">
            <SearchField value={query} onChange={setQuery} placeholder="Actor, action, target or IP" />
          </div>
        </Toolbar>
        <DataTable
          rows={rows}
          pageSize={20}
          empty={{ title: 'No events match' }}
          columns={[
            { key: 'at', header: 'Time', render: (e) => dateTime(e.at), sort: (e) => e.at, width: 150 },
            { key: 'kind', header: 'Type', render: (e) => <Badge tone={e.kind === 'admin' ? 'info' : 'neutral'} status={e.kind}>{e.kind === 'admin' ? 'Admin' : 'Auth'}</Badge> },
            { key: 'actor', header: 'Actor', sort: (e) => e.actor },
            { key: 'action', header: 'Action', render: (e) => <strong className="weight-500">{e.action}</strong> },
            { key: 'target', header: 'Target', render: (e) => <span className="mono-id">{e.target}</span> },
            { key: 'ip', header: 'IP address', render: (e) => <span className="num muted">{e.ip}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}
