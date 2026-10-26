import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../data/store.jsx';
import { Badge, Button, Empty, Field, PageHeader, Person, Tabs } from '../components/ui.jsx';
import { ago, cx, dateTime, money } from '../lib/format.js';

const OUTCOMES = [
  { value: 'Refunded buyer in full', help: 'Escrow goes back to the customer.' },
  { value: 'Released funds to provider', help: 'Escrow is paid out in the next payout run.' },
  { value: 'Split 50/50', help: 'Half refunded, half released to the provider.' },
];

export default function Disputes() {
  const { disputes, userById, updateDispute, toast } = useStore();
  const [params] = useSearchParams();
  const [tab, setTab] = useState('active');
  const [selected, setSelected] = useState(params.get('open'));
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState(OUTCOMES[0].value);

  const rows = useMemo(
    () =>
      disputes
        .filter((d) => (tab === 'active' ? d.status !== 'resolved' : d.status === 'resolved'))
        .sort((a, b) => (a.priority === b.priority ? a.openedAt.localeCompare(b.openedAt) : a.priority === 'high' ? -1 : 1)),
    [disputes, tab],
  );

  useEffect(() => {
    if (!rows.find((d) => d.id === selected)) {
      const fromUrl = disputes.find((d) => d.id === params.get('open'));
      if (fromUrl) {
        setTab(fromUrl.status === 'resolved' ? 'resolved' : 'active');
        setSelected(fromUrl.id);
      } else setSelected(rows[0]?.id ?? null);
    }
  }, [rows, selected, disputes, params]);

  const d = disputes.find((x) => x.id === selected);
  const buyer = d && userById(d.buyerId);
  const provider = d && userById(d.providerId);
  const activeCount = disputes.filter((x) => x.status !== 'resolved').length;

  const addNote = () => {
    if (!note.trim()) return;
    updateDispute(d.id, { note: note.trim() });
    setNote('');
  };
  const investigate = () => {
    updateDispute(d.id, { status: 'investigating', note: note.trim() || 'Investigation started. Escrow frozen and evidence requested from both parties.' });
    setNote('');
    toast(`${d.id} moved to investigating. Both parties were notified.`);
  };
  const resolve = () => {
    updateDispute(d.id, { status: 'resolved', resolution: outcome, note: note.trim() || `Resolved: ${outcome.toLowerCase()}.` });
    setNote('');
    toast(`${d.id} resolved. ${outcome}.`);
  };

  return (
    <div className="stack">
      <PageHeader title="Disputes" description="Conflicts between customers and providers. Funds stay in escrow until you resolve the case." />
      <div className="split">
        <section className="panel panel--flush split__list">
          <div className="toolbar">
            <Tabs
              value={tab}
              onChange={(v) => {
                setTab(v);
                setSelected(null);
              }}
              options={[
                { value: 'active', label: 'Open', count: activeCount },
                { value: 'resolved', label: 'Resolved', count: disputes.length - activeCount },
              ]}
            />
          </div>
          {rows.length === 0 ? (
            <Empty title="No open disputes">New disputes raised in the app will land here.</Empty>
          ) : (
            <ul className="case-list">
              {rows.map((c) => (
                <li key={c.id}>
                  <button type="button" className={cx('case', c.id === selected && 'is-active')} onClick={() => setSelected(c.id)}>
                    <span className="case__top">
                      <span className="mono-id">{c.id}</span>
                      {c.priority === 'high' && c.status !== 'resolved' && <Badge status="high">High priority</Badge>}
                      <span className="case__time">{ago(c.openedAt)}</span>
                    </span>
                    <span className="case__reason">{c.reason}</span>
                    <span className="case__meta">
                      {c.kindLabel}, {money(c.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel split__detail">
          {!d ? (
            <Empty title="Select a dispute">Pick a case from the list to see the conversation and decide.</Empty>
          ) : (
            <>
              <div className="case-head">
                <div>
                  <h2>{d.reason}</h2>
                  <p>
                    {d.id} on <Link className="link" to={`/activity?kind=${d.kind}`}>{d.txId}</Link>, opened {dateTime(d.openedAt)}
                  </p>
                </div>
                <Badge status={d.status} />
              </div>

              <div className="case-facts">
                <div>
                  <small>In escrow</small>
                  <strong className="num">{money(d.amount)}</strong>
                </div>
                <div>
                  <small>Customer</small>
                  <Link to={`/users/${buyer.id}`}><Person user={buyer} /></Link>
                </div>
                <div>
                  <small>Provider</small>
                  <Link to={`/users/${provider.id}`}><Person user={provider} /></Link>
                </div>
              </div>

              <ol className="timeline">
                {d.timeline.map((t, i) => (
                  <li key={i} className={`timeline__item timeline__item--${t.side}`}>
                    <div className="timeline__who">
                      {t.who} <span>{dateTime(t.at)}</span>
                    </div>
                    <p>{t.text}</p>
                  </li>
                ))}
              </ol>

              {d.status === 'resolved' ? (
                <div className="callout callout--ok">
                  <div>
                    <strong>Outcome: {d.resolution}</strong>
                    <p>Both parties have been notified and the rating prompt was sent.</p>
                  </div>
                </div>
              ) : (
                <div className="case-actions">
                  <Field label="Internal note or message to both parties">
                    <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please share the delivery photos within 24 hours" />
                  </Field>
                  <div className="row-actions">
                    <Button variant="ghost" onClick={addNote} disabled={!note.trim()}>Add note</Button>
                    {d.status === 'open' && <Button variant="primary" onClick={investigate}>Start investigation</Button>}
                  </div>
                  {d.status === 'investigating' && (
                    <fieldset className="outcomes">
                      <legend>Resolve the dispute</legend>
                      {OUTCOMES.map((o) => (
                        <label key={o.value} className={cx('outcome', outcome === o.value && 'is-active')}>
                          <input type="radio" name="outcome" value={o.value} checked={outcome === o.value} onChange={() => setOutcome(o.value)} />
                          <span>
                            <strong>{o.value}</strong>
                            <small>{o.help}</small>
                          </span>
                        </label>
                      ))}
                      <div className="row-actions">
                        <Button variant="primary" onClick={resolve}>Resolve dispute</Button>
                      </div>
                    </fieldset>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
