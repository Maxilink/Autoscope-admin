import { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react';
import * as mock from './mock.js';
import { getAuthEvents } from '../auth/authService.js';

/**
 * Central admin store.
 *
 * Every action below maps to one admin endpoint you'll add on the backend.
 * To go live, replace the `dispatch` body of each action with an API call
 * (e.g. `await api.post('/admin/kyc/:id/approve')`) and then dispatch the
 * same action with the server's response. The UI won't need to change.
 */

const StoreContext = createContext(null);

const buildInitialState = (admin) => ({
  actor: admin?.name || 'Admin',
  users: mock.users,
  kyc: mock.kycSubmissions,
  listings: mock.listings,
  activity: mock.activity,
  disputes: mock.disputes,
  reports: mock.reports,
  commissionRates: mock.commissionRates,
  payoutSchedule: mock.payoutSchedule,
  payouts: mock.payouts,
  announcements: mock.announcements,
  // Sign-in events recorded by the auth service come first (FR-1.7)
  auditLog: [...getAuthEvents(), ...mock.auditLog].sort((a, b) => b.at.localeCompare(a.at)),
});

let eventSeq = 70000;
const logEvent = (state, action, target) => ({
  ...state,
  auditLog: [
    { id: `EVT-${eventSeq++}`, at: new Date().toISOString(), kind: 'admin', actor: state.actor, action, target, ip: 'this session' },
    ...state.auditLog,
  ],
});

const patch = (list, id, changes) => list.map((x) => (x.id === id ? { ...x, ...changes } : x));

function reducer(state, a) {
  switch (a.type) {
    case 'kyc/decide': {
      const sub = state.kyc.find((k) => k.id === a.id);
      const approved = a.decision === 'approve';
      const next = {
        ...state,
        kyc: patch(state.kyc, a.id, { status: approved ? 'approved' : 'rejected', rejectionReason: approved ? null : a.reason }),
        users: patch(state.users, sub.userId, { kycStatus: approved ? 'approved' : 'rejected' }),
      };
      return logEvent(next, approved ? 'Approved KYC' : `Rejected KYC: ${a.reason}`, a.id);
    }
    case 'listing/status': {
      const next = { ...state, listings: patch(state.listings, a.id, { status: a.status, moderationNote: a.reason || null }) };
      const verb = { active: 'Approved listing', rejected: 'Rejected listing', suspended: 'Suspended listing' }[a.status] || 'Updated listing';
      return logEvent(next, a.reason ? `${verb}: ${a.reason}` : verb, a.id);
    }
    case 'user/status': {
      const next = { ...state, users: patch(state.users, a.id, { status: a.status }) };
      return logEvent(next, a.status === 'suspended' ? `Suspended user: ${a.reason}` : 'Reinstated user', a.id);
    }
    case 'dispute/update': {
      const d = state.disputes.find((x) => x.id === a.id);
      const entry = a.note ? [{ at: new Date().toISOString(), who: `${state.actor} (Admin)`, side: 'admin', text: a.note }] : [];
      const next = {
        ...state,
        disputes: patch(state.disputes, a.id, {
          status: a.status ?? d.status,
          resolution: a.resolution ?? d.resolution,
          timeline: [...d.timeline, ...entry],
        }),
      };
      if (!a.status) return next;
      return logEvent(next, a.resolution ? `Resolved dispute: ${a.resolution}` : `Moved dispute to ${a.status}`, a.id);
    }
    case 'report/decide': {
      const rep = state.reports.find((x) => x.id === a.id);
      let next = { ...state, reports: patch(state.reports, a.id, { status: a.status }) };
      if (a.status === 'removed' && rep.targetType === 'listing') {
        next = { ...next, listings: patch(next.listings, rep.targetId, { status: 'suspended' }) };
      }
      return logEvent(next, a.status === 'removed' ? 'Removed reported content' : 'Dismissed report', a.id);
    }
    case 'finance/commission': {
      const prev = state.commissionRates[a.category];
      const next = { ...state, commissionRates: { ...state.commissionRates, [a.category]: { ...prev, ...a.values } } };
      return logEvent(next, `Changed ${mock.CATEGORIES[a.category]} commission ${prev.rate}% → ${a.values.rate}%`, 'Commission rates');
    }
    case 'finance/schedule': {
      const next = { ...state, payoutSchedule: { ...state.payoutSchedule, ...a.values } };
      return logEvent(next, 'Updated payout schedule', 'Payouts');
    }
    case 'finance/payouts': {
      const ids = new Set(a.ids);
      const next = { ...state, payouts: state.payouts.map((p) => (ids.has(p.id) ? { ...p, status: a.status, holdReason: a.status === 'on hold' ? a.reason : null } : p)) };
      return logEvent(next, a.status === 'processing' ? `Released ${ids.size} payout${ids.size > 1 ? 's' : ''}` : `Held ${ids.size} payout${ids.size > 1 ? 's' : ''}`, [...ids].join(', '));
    }
    case 'announcement/add': {
      const next = { ...state, announcements: [a.item, ...state.announcements] };
      return logEvent(next, a.item.status === 'sent' ? 'Sent announcement' : a.item.status === 'scheduled' ? 'Scheduled announcement' : 'Saved announcement draft', a.item.id);
    }
    default:
      return state;
  }
}

export function StoreProvider({ admin, children }) {
  const [state, dispatch] = useReducer(reducer, admin, buildInitialState);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((text, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const actions = useMemo(
    () => ({
      decideKyc: (id, decision, reason) => dispatch({ type: 'kyc/decide', id, decision, reason }),
      setListingStatus: (id, status, reason) => dispatch({ type: 'listing/status', id, status, reason }),
      setUserStatus: (id, status, reason) => dispatch({ type: 'user/status', id, status, reason }),
      updateDispute: (id, changes) => dispatch({ type: 'dispute/update', id, ...changes }),
      decideReport: (id, status) => dispatch({ type: 'report/decide', id, status }),
      setCommission: (category, values) => dispatch({ type: 'finance/commission', category, values }),
      setPayoutSchedule: (values) => dispatch({ type: 'finance/schedule', values }),
      setPayouts: (ids, status, reason) => dispatch({ type: 'finance/payouts', ids, status, reason }),
      addAnnouncement: (item) => dispatch({ type: 'announcement/add', item }),
    }),
    [],
  );

  const userById = useCallback((id) => state.users.find((u) => u.id === id), [state.users]);

  const value = useMemo(() => ({ ...state, ...actions, userById, toast, toasts }), [state, actions, userById, toast, toasts]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Counts shown in the sidebar and on the overview's attention strip. */
export function useQueues() {
  const s = useStore();
  return useMemo(
    () => ({
      kyc: s.kyc.filter((k) => k.status === 'pending').length,
      kycFlagged: s.kyc.filter((k) => k.status === 'pending' && k.autoCheck === 'flagged').length,
      listings: s.listings.filter((l) => l.status === 'pending').length,
      listingsFlagged: s.listings.filter((l) => l.status === 'pending' && l.autoCheck).length,
      disputes: s.disputes.filter((d) => d.status !== 'resolved').length,
      disputesHigh: s.disputes.filter((d) => d.status !== 'resolved' && d.priority === 'high').length,
      reports: s.reports.filter((r) => r.status === 'open').length,
      payouts: s.payouts.filter((p) => p.status === 'scheduled').length,
      payoutsHeld: s.payouts.filter((p) => p.status === 'on hold').length,
    }),
    [s.kyc, s.listings, s.disputes, s.reports, s.payouts],
  );
}
