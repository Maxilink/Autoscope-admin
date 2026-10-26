import { useState } from 'react';
import { useStore } from '../data/store.jsx';
import { ROLES } from '../data/mock.js';
import { Badge, Button, Field, PageHeader, Panel } from '../components/ui.jsx';
import { cx, dateTime, num } from '../lib/format.js';

const CITIES = ['All cities', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City', 'Warri'];
const AUDIENCES = { all: 'All users', providers: 'All providers', ...Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, `${v}s`])) };
const CHANNELS = [
  { key: 'push', label: 'Push notification' },
  { key: 'sms', label: 'SMS' },
  { key: 'email', label: 'Email' },
];
// Rough audience sizes for the estimate shown before sending
const SIZE = { all: 48215, providers: 1836, owner: 46379, dealer: 214, parts: 702, mechanic: 611, haulage: 188, insurer: 121 };

let seq = 32;
const blank = { title: '', body: '', audience: 'all', city: 'All cities', channels: ['push'], when: 'now', sendAt: '' };

export default function Announcements() {
  const { announcements, addAnnouncement, toast } = useStore();
  const [form, setForm] = useState(blank);
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const reach = Math.round(SIZE[form.audience] * (form.city === 'All cities' ? 1 : 0.18));
  const errors = {
    title: !form.title.trim() && 'Add a title',
    body: !form.body.trim() && 'Add a message',
    channels: !form.channels.length && 'Pick at least one channel',
    sendAt: form.when === 'later' && !form.sendAt && 'Choose a date and time',
  };
  const valid = !Object.values(errors).some(Boolean);
  const smsOver = form.channels.includes('sms') && form.body.length > 160;

  const submit = (status) => {
    setTouched(true);
    if (status !== 'draft' && !valid) return;
    if (status === 'draft' && !form.title.trim()) return;
    const item = {
      id: `ANN-0${seq++}`,
      title: form.title.trim(),
      body: form.body.trim(),
      audience: `${AUDIENCES[form.audience]}${form.city === 'All cities' ? '' : ` in ${form.city}`}`,
      channels: form.channels,
      status,
      sendAt: status === 'sent' ? new Date().toISOString() : status === 'scheduled' ? new Date(form.sendAt).toISOString() : null,
      reach: status === 'sent' ? reach : 0,
    };
    addAnnouncement(item);
    toast(status === 'sent' ? `Sent to about ${num(reach)} people.` : status === 'scheduled' ? `Scheduled for ${dateTime(item.sendAt)}.` : 'Draft saved.');
    setForm(blank);
    setTouched(false);
  };

  const toggleChannel = (key) => set('channels', form.channels.includes(key) ? form.channels.filter((c) => c !== key) : [...form.channels, key]);

  return (
    <div className="stack">
      <PageHeader title="Announcements" description="Platform-wide messages and promotions by push, SMS and email." />
      <div className="grid grid--compose">
        <Panel title="New announcement">
          <div className="form-stack">
            <Field label="Title">
              <input className="input" value={form.title} maxLength={65} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Free towing for SOS requests this weekend" aria-invalid={touched && !!errors.title} />
              {touched && errors.title && <span className="field__error">{errors.title}</span>}
            </Field>
            <Field label="Message" hint={form.channels.includes('sms') ? `${form.body.length}/160 characters for SMS` : `${form.body.length} characters`}>
              <textarea className="input" rows={4} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="What should people know or do?" aria-invalid={touched && !!errors.body} />
              {touched && errors.body && <span className="field__error">{errors.body}</span>}
              {smsOver && <span className="field__error">SMS will be split into {Math.ceil(form.body.length / 153)} messages.</span>}
            </Field>
            <div className="form-grid">
              <Field label="Audience">
                <select className="input" value={form.audience} onChange={(e) => set('audience', e.target.value)}>
                  {Object.entries(AUDIENCES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <select className="input" value={form.city} onChange={(e) => set('city', e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <fieldset className="checks">
              <legend>Channels</legend>
              {CHANNELS.map((c) => (
                <label key={c.key} className={cx('check', form.channels.includes(c.key) && 'is-active')}>
                  <input type="checkbox" checked={form.channels.includes(c.key)} onChange={() => toggleChannel(c.key)} />
                  {c.label}
                </label>
              ))}
              {touched && errors.channels && <span className="field__error">{errors.channels}</span>}
            </fieldset>
            <fieldset className="checks">
              <legend>When</legend>
              <label className={cx('check', form.when === 'now' && 'is-active')}>
                <input type="radio" name="when" checked={form.when === 'now'} onChange={() => set('when', 'now')} />
                Send now
              </label>
              <label className={cx('check', form.when === 'later' && 'is-active')}>
                <input type="radio" name="when" checked={form.when === 'later'} onChange={() => set('when', 'later')} />
                Schedule
              </label>
              {form.when === 'later' && <input className="input input--auto" type="datetime-local" value={form.sendAt} onChange={(e) => set('sendAt', e.target.value)} aria-label="Send at" />}
              {touched && errors.sendAt && <span className="field__error">{errors.sendAt}</span>}
            </fieldset>
          </div>
          <div className="compose-foot">
            <span className="muted small">Estimated reach: about {num(reach)} people</span>
            <div className="row-actions">
              <Button variant="ghost" onClick={() => submit('draft')}>Save draft</Button>
              <Button variant="primary" icon="send" onClick={() => submit(form.when === 'now' ? 'sent' : 'scheduled')}>
                {form.when === 'now' ? 'Send announcement' : 'Schedule announcement'}
              </Button>
            </div>
          </div>
        </Panel>

        <div className="phone" aria-label="Push notification preview">
          <div className="phone__screen">
            <span className="phone__clock">09:41</span>
            <div className="push">
              <div className="push__app">
                <span className="push__icon" />
                AutoScope <span>now</span>
              </div>
              <strong>{form.title || 'Your title appears here'}</strong>
              <p>{form.body || 'And the message underneath, cut off after two lines on most phones.'}</p>
            </div>
          </div>
        </div>
      </div>

      <Panel title="History" flush>
        <ul className="ann-list">
          {announcements.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{a.title}</strong>
                <p>{a.body}</p>
                <small className="muted">
                  {a.audience}, by {a.channels.join(', ')}
                </small>
              </div>
              <div className="ann-list__aside">
                <Badge status={a.status} />
                <small className="muted">
                  {a.status === 'sent' ? `${dateTime(a.sendAt)}, ${num(a.reach)} reached` : a.status === 'scheduled' ? `Sends ${dateTime(a.sendAt)}` : 'Not sent'}
                </small>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
