import { useMemo, useState } from 'react';
import { useStore } from '../data/store.jsx';
import { CATEGORIES } from '../data/mock.js';
import DataTable from '../components/DataTable.jsx';
import { Badge, Button, Field, PageHeader, Panel, Person, Tabs, Toolbar } from '../components/ui.jsx';
import { date, money, moneyShort } from '../lib/format.js';

function RateRow({ category, current, onSave }) {
  const [rate, setRate] = useState(String(current.rate));
  const [cap, setCap] = useState(current.cap ? String(current.cap) : '');
  const value = Number(rate);
  const invalid = rate === '' || Number.isNaN(value) || value < 0 || value > 30;
  const dirty = value !== current.rate || (cap ? Number(cap) : null) !== current.cap;
  return (
    <tr>
      <td>
        <strong>{CATEGORIES[category]}</strong>
      </td>
      <td>
        <span className="input-affix">
          <input className="input input--num" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-label={`${CATEGORIES[category]} commission rate`} aria-invalid={invalid} />
          <span>%</span>
        </span>
      </td>
      <td>
        <span className="input-affix">
          <span>₦</span>
          <input className="input input--num input--wide" inputMode="numeric" value={cap} placeholder="No cap" onChange={(e) => setCap(e.target.value.replace(/[^0-9]/g, ''))} aria-label={`${CATEGORIES[category]} fee cap`} />
        </span>
      </td>
      <td className="is-right">
        <Button size="sm" variant={dirty ? 'primary' : 'ghost'} disabled={!dirty || invalid} onClick={() => onSave({ rate: value, cap: cap ? Number(cap) : null })}>
          {dirty ? 'Save' : 'Saved'}
        </Button>
      </td>
    </tr>
  );
}

export default function Finance() {
  const { commissionRates, setCommission, payoutSchedule, setPayoutSchedule, payouts, setPayouts, activity, userById, toast } = useStore();
  const [tab, setTab] = useState('scheduled');
  const [selected, setSelected] = useState(new Set());
  const [schedule, setSchedule] = useState(payoutSchedule);

  const rows = useMemo(() => payouts.filter((p) => p.status === tab || (tab === 'paid' && (p.status === 'paid' || p.status === 'processing'))), [payouts, tab]);
  const escrowHeld = activity.filter((a) => a.escrow === 'held').reduce((s, a) => s + a.amount, 0);
  const due = payouts.filter((p) => p.status === 'scheduled').reduce((s, p) => s + p.amount, 0);
  const held = payouts.filter((p) => p.status === 'on hold').reduce((s, p) => s + p.amount, 0);
  const count = (s) => payouts.filter((p) => p.status === s || (s === 'paid' && p.status === 'processing')).length;

  const bulk = (status) => {
    const ids = [...selected];
    setPayouts(ids, status, status === 'on hold' ? 'Held manually by admin' : undefined);
    toast(status === 'processing' ? `${ids.length} payout${ids.length > 1 ? 's' : ''} sent to the payment gateway.` : `${ids.length} payout${ids.length > 1 ? 's' : ''} put on hold.`, status === 'processing' ? 'ok' : 'warn');
    setSelected(new Set());
  };

  const columns = [
    { key: 'provider', header: 'Provider', render: (p) => <Person user={userById(p.providerId)} sub={p.bank} /> },
    { key: 'tx', header: 'Transactions', align: 'right', render: (p) => <span className="num">{p.transactions}</span>, sort: (p) => p.transactions },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="num">{money(p.amount)}</span>, sort: (p) => p.amount },
    { key: 'due', header: tab === 'paid' ? 'Paid' : 'Due', render: (p) => date(p.dueAt), sort: (p) => p.dueAt },
    { key: 'status', header: 'Status', render: (p) => (p.holdReason ? <span className="stack-xs"><Badge status={p.status} /><small className="muted">{p.holdReason}</small></span> : <Badge status={p.status} />) },
  ];

  const saveSchedule = () => {
    setPayoutSchedule(schedule);
    toast('Payout schedule saved. It applies from the next run.');
  };

  return (
    <div className="stack">
      <PageHeader title="Payouts and fees" description="Commission per category, escrow and provider payouts." />

      <div className="summary">
        <div>
          <span className="summary__label">Held in escrow</span>
          <span className="summary__value">{moneyShort(escrowHeld)}</span>
        </div>
        <div>
          <span className="summary__label">Due next run</span>
          <span className="summary__value">{moneyShort(due)}</span>
        </div>
        <div>
          <span className="summary__label">On hold</span>
          <span className="summary__value">{moneyShort(held)}</span>
        </div>
        <div>
          <span className="summary__label">Next run</span>
          <span className="summary__value summary__value--text">
            {schedule.frequency === 'monthly' ? 'Last business day' : payoutSchedule.day}
          </span>
        </div>
      </div>

      <Panel flush title="Provider payouts">
        <Toolbar>
          <Tabs
            value={tab}
            onChange={(v) => {
              setTab(v);
              setSelected(new Set());
            }}
            options={[
              { value: 'scheduled', label: 'Scheduled', count: count('scheduled') },
              { value: 'on hold', label: 'On hold', count: count('on hold') },
              { value: 'paid', label: 'Paid', count: count('paid') },
            ]}
          />
          {tab !== 'paid' && (
            <div className="toolbar__right">
              <span className="muted small">{selected.size ? `${selected.size} selected` : 'Select payouts to act on them'}</span>
              {tab === 'scheduled' && <Button variant="ghost" size="sm" disabled={!selected.size} onClick={() => bulk('on hold')}>Hold</Button>}
              <Button variant="primary" size="sm" disabled={!selected.size} onClick={() => bulk('processing')}>Release now</Button>
            </div>
          )}
        </Toolbar>
        <DataTable columns={columns} rows={rows} selection={tab !== 'paid' ? { selected, onChange: setSelected } : undefined} empty={{ title: 'No payouts here' }} />
      </Panel>

      <div className="grid grid--side-r">
        <Panel title="Commission rates" description="Taken from each completed transaction. Changes apply to new transactions only." flush>
          <div className="table-scroll">
            <table className="table table--form">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Rate</th>
                  <th>Cap per transaction</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Object.entries(commissionRates).map(([cat, cur]) => (
                  <RateRow
                    key={cat}
                    category={cat}
                    current={cur}
                    onSave={(values) => {
                      setCommission(cat, values);
                      toast(`${CATEGORIES[cat]} commission set to ${values.rate}%.`);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Payout schedule">
          <div className="form-grid">
            <Field label="Frequency">
              <select className="input" value={schedule.frequency} onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            {schedule.frequency !== 'monthly' && (
              <Field label="Payout day">
                <select className="input" value={schedule.day} onChange={(e) => setSchedule({ ...schedule, day: e.target.value })}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Hold after completion" hint="Days funds stay in escrow so customers can raise a dispute.">
              <span className="input-affix">
                <input className="input input--num" type="number" min={0} max={30} value={schedule.holdDays} onChange={(e) => setSchedule({ ...schedule, holdDays: Number(e.target.value) })} />
                <span>days</span>
              </span>
            </Field>
            <Field label="Minimum payout" hint="Smaller balances roll over to the next run.">
              <span className="input-affix">
                <span>₦</span>
                <input className="input input--num input--wide" type="number" min={0} step={500} value={schedule.minimum} onChange={(e) => setSchedule({ ...schedule, minimum: Number(e.target.value) })} />
              </span>
            </Field>
          </div>
          <div className="row-actions">
            <Button variant="primary" onClick={saveSchedule} disabled={JSON.stringify(schedule) === JSON.stringify(payoutSchedule)}>Save schedule</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
