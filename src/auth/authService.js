/**
 * Mock admin authentication service.
 *
 * Each exported function mirrors one backend endpoint. To go live, replace the
 * body of each function with a fetch() to your API and keep the same return
 * values and error codes. The screens and AuthContext won't need to change.
 *
 *   signIn          POST /admin/auth/login            { email, password }
 *   verifyOtp       POST /admin/auth/verify-otp       { challengeId, code }
 *   resendOtp       POST /admin/auth/resend-otp       { challengeId }
 *   requestReset    POST /admin/auth/password/forgot  { email }
 *   resetPassword   POST /admin/auth/password/reset   { email, code, password }
 *   signOut         POST /admin/auth/logout
 *
 * Security notes for the real backend (FSD 5.2):
 * - Hash passwords server-side (argon2 or bcrypt). Never store them in the browser.
 * - Return the session as an httpOnly, Secure, SameSite=Strict cookie, not a JS-readable token.
 * - Enforce the lockout and rate limits on the server; the client copy here is only for UX.
 */

export const ADMIN_ROLES = {
  super: { label: 'Super admin', pages: '*' },
  operations: {
    label: 'Operations',
    pages: ['/', '/verification', '/listings', '/reports', '/disputes', '/users', '/activity', '/announcements', '/audit'],
  },
  support: { label: 'Support', pages: ['/', '/reports', '/disputes', '/users', '/activity'] },
  finance: { label: 'Finance', pages: ['/', '/activity', '/finance', '/audit'] },
};

/* Demo accounts. All use the same password and OTP so the flow is easy to test. */
export const DEMO_PASSWORD = 'AutoScope#2026';
export const DEMO_OTP = '123456';
const ACCOUNTS = [
  { id: 'ADM-001', name: 'Adaora Nwankwo', email: 'adaora@autoscope.ng', role: 'super', phone: '+234 803 555 0142' },
  { id: 'ADM-002', name: 'Kunle Bakare', email: 'kunle@autoscope.ng', role: 'support', phone: '+234 806 555 0177' },
  { id: 'ADM-003', name: 'Maryam Sani', email: 'maryam@autoscope.ng', role: 'finance', phone: '+234 809 555 0108' },
  { id: 'ADM-004', name: 'Tobi Ade', email: 'tobi@autoscope.ng', role: 'operations', phone: '+234 802 555 0163', disabled: true },
];
export const DEMO_ACCOUNTS = ACCOUNTS;

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const OTP_TTL_SECONDS = 300;

const passwords = new Map(); // email -> password changed through the reset flow (demo only)
const challenges = new Map(); // challengeId -> { email, expires, purpose }

export class AuthError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

const wait = (ms = 650) => new Promise((r) => setTimeout(r, ms));
const findAccount = (email) => ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
const maskPhone = (p) => `${p.slice(0, 4)} ••• ••• ${p.slice(-4)}`;

/* ---------- Lockout (client copy; the server must enforce its own) ---------- */
const LOCK_KEY = 'as-admin-lock';
function readLocks() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY)) || {};
  } catch {
    return {};
  }
}
function writeLocks(v) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable: lockout lasts for this page load only */
  }
}
let memoryLocks = readLocks();
function lockState(email) {
  const rec = memoryLocks[email] || { fails: 0, until: 0 };
  if (rec.until && rec.until < Date.now()) return { fails: 0, until: 0 };
  return rec;
}
function recordFail(email) {
  const rec = lockState(email);
  const fails = rec.fails + 1;
  memoryLocks[email] = { fails, until: fails >= MAX_ATTEMPTS ? Date.now() + LOCK_MINUTES * 60_000 : 0 };
  writeLocks(memoryLocks);
  return memoryLocks[email];
}
function clearFails(email) {
  delete memoryLocks[email];
  writeLocks(memoryLocks);
}

/* ---------- Auth event log (merged into the audit log, FR-1.7) ---------- */
const EVENTS_KEY = 'as-admin-auth-events';
let events = (() => {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
  } catch {
    return [];
  }
})();
let seq = 1;
export function logAuthEvent(actor, action, target = 'web console') {
  events = [{ id: `AUTH-${Date.now()}-${seq++}`, at: new Date().toISOString(), kind: 'auth', actor, action, target, ip: 'this browser' }, ...events].slice(0, 100);
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    /* ignore */
  }
}
export const getAuthEvents = () => events;

/* ---------- Endpoints ---------- */
export async function signIn(email, password) {
  await wait();
  const key = email.trim().toLowerCase();
  const lock = lockState(key);
  if (lock.until) {
    throw new AuthError('locked', 'Too many failed attempts.', { until: lock.until });
  }
  const account = findAccount(key);
  const expected = passwords.get(key) || DEMO_PASSWORD;
  if (!account || password !== expected) {
    const rec = recordFail(key);
    logAuthEvent(account?.name || key, 'Failed sign-in (wrong email or password)');
    if (rec.until) throw new AuthError('locked', 'Too many failed attempts.', { until: rec.until });
    throw new AuthError('invalid', 'Email or password is incorrect.', { remaining: MAX_ATTEMPTS - rec.fails });
  }
  if (account.disabled) {
    logAuthEvent(account.name, 'Blocked sign-in (account disabled)');
    throw new AuthError('disabled', 'This admin account has been disabled.');
  }
  const challengeId = crypto.randomUUID?.() ?? String(Math.random()).slice(2);
  challenges.set(challengeId, { email: key, expires: Date.now() + OTP_TTL_SECONDS * 1000, purpose: 'login' });
  return { challengeId, sentTo: maskPhone(account.phone) };
}

export async function verifyOtp(challengeId, code) {
  await wait(500);
  const ch = challenges.get(challengeId);
  if (!ch || ch.expires < Date.now()) throw new AuthError('expired', 'This code has expired.');
  const account = findAccount(ch.email);
  if (code !== DEMO_OTP) {
    logAuthEvent(account.name, 'Failed sign-in (wrong OTP)');
    throw new AuthError('bad_code', 'That code is not right.');
  }
  challenges.delete(challengeId);
  clearFails(ch.email);
  logAuthEvent(account.name, 'Signed in');
  const { id, name, email, role } = account;
  return { user: { id, name, email, role }, token: `demo.${id}.${Date.now()}`, issuedAt: Date.now() };
}

export async function resendOtp(challengeId) {
  await wait(400);
  const ch = challenges.get(challengeId);
  if (!ch) throw new AuthError('expired', 'Start again to get a new code.');
  ch.expires = Date.now() + OTP_TTL_SECONDS * 1000;
  return { ok: true };
}

export async function requestReset(email) {
  await wait();
  // Always succeed so the screen never reveals which emails have accounts.
  const account = findAccount(email);
  if (account) logAuthEvent(account.name, 'Requested password reset');
  return { ok: true };
}

export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 10 characters', test: (p) => p.length >= 10 },
  { id: 'case', label: 'Upper and lower case letters', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'num', label: 'At least one number', test: (p) => /\d/.test(p) },
  { id: 'sym', label: 'At least one symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export async function resetPassword(email, code, password) {
  await wait();
  const account = findAccount(email);
  if (!account || code !== DEMO_OTP) throw new AuthError('bad_code', 'That code is not right or has expired.');
  if (!PASSWORD_RULES.every((r) => r.test(password))) throw new AuthError('weak', 'The new password does not meet the rules.');
  passwords.set(account.email, password);
  clearFails(account.email);
  logAuthEvent(account.name, 'Password reset via OTP');
  return { ok: true };
}

export async function signOut(user, reason = 'Signed out') {
  logAuthEvent(user.name, reason);
  return { ok: true };
}
