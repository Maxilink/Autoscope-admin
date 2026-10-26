import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import * as api from './authService.js';

/** Sign the admin out after this much inactivity (FSD 5.2). */
export const IDLE_MINUTES = 30;
const SESSION_KEY = 'as-admin-session';

const AuthContext = createContext(null);

const stores = () => {
  const out = [];
  try {
    out.push(window.localStorage, window.sessionStorage);
  } catch {
    /* storage blocked */
  }
  return out;
};

function loadSession() {
  for (const s of stores()) {
    try {
      const raw = s.getItem(SESSION_KEY);
      if (!raw) continue;
      const session = JSON.parse(raw);
      if (Date.now() - session.lastActive > IDLE_MINUTES * 60_000) {
        s.removeItem(SESSION_KEY);
        return { session: null, expired: session.user };
      }
      return { session, expired: null };
    } catch {
      /* ignore */
    }
  }
  return { session: null, expired: null };
}

function saveSession(session, remember) {
  for (const s of stores()) {
    try {
      s.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
  if (!session) return;
  try {
    (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify({ ...session, remember }));
  } catch {
    /* session lives in memory only */
  }
}

export function AuthProvider({ children }) {
  const initial = useRef(null);
  if (!initial.current) {
    initial.current = loadSession();
    if (initial.current.expired) api.logAuthEvent(initial.current.expired.name, `Signed out after ${IDLE_MINUTES} minutes of inactivity`);
  }
  const [session, setSession] = useState(initial.current.session);
  const [notice, setNotice] = useState(initial.current.expired ? 'timeout' : null);
  const lastSaved = useRef(0);

  const completeSignIn = useCallback((result, remember) => {
    const s = { user: result.user, token: result.token, issuedAt: result.issuedAt, lastActive: Date.now(), remember };
    saveSession(s, remember);
    setNotice(null);
    setSession(s);
  }, []);

  const signOut = useCallback(
    async (reason = 'manual') => {
      if (!session) return;
      await api.signOut(session.user, reason === 'timeout' ? `Signed out after ${IDLE_MINUTES} minutes of inactivity` : 'Signed out');
      saveSession(null);
      setNotice(reason === 'timeout' ? 'timeout' : 'signed-out');
      setSession(null);
    },
    [session],
  );

  // Track activity; sign out when idle too long.
  useEffect(() => {
    if (!session) return;
    let last = session.lastActive;
    const bump = () => {
      last = Date.now();
      if (last - lastSaved.current > 15_000) {
        lastSaved.current = last;
        saveSession({ ...session, lastActive: last }, session.remember);
      }
    };
    const evts = ['pointerdown', 'keydown', 'scroll', 'mousemove'];
    evts.forEach((e) => window.addEventListener(e, bump, { passive: true, capture: true }));
    const timer = setInterval(() => {
      if (Date.now() - last > IDLE_MINUTES * 60_000) signOut('timeout');
    }, 20_000);
    return () => {
      evts.forEach((e) => window.removeEventListener(e, bump, { capture: true }));
      clearInterval(timer);
    };
  }, [session, signOut]);

  const can = useCallback(
    (path) => {
      if (!session) return false;
      const pages = api.ADMIN_ROLES[session.user.role]?.pages;
      if (pages === '*') return true;
      const base = '/' + (path.split('/')[1] || '');
      return pages.includes(base);
    },
    [session],
  );

  const value = useMemo(
    () => ({ user: session?.user ?? null, roleLabel: session ? api.ADMIN_ROLES[session.user.role].label : null, notice, setNotice, completeSignIn, signOut, can }),
    [session, notice, completeSignIn, signOut, can],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Sends signed-out visitors to /login and brings them back afterwards. */
export function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const next = location.pathname + (location.search || '');
    return <Navigate to={next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace />;
  }
  return children;
}
