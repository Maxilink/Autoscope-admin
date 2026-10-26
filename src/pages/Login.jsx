import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, IDLE_MINUTES } from '../auth/AuthContext.jsx';
import * as api from '../auth/authService.js';
import Icon from '../components/Icon.jsx';
import { cx } from '../lib/format.js';
import '../auth/auth.css';

const NOTICES = {
  timeout: { tone: 'warn', text: `You were signed out after ${IDLE_MINUTES} minutes of inactivity. Sign in again to continue.` },
  'signed-out': { tone: 'ok', text: 'You have signed out.' },
  'reset-done': { tone: 'ok', text: 'Password updated. Sign in with your new password.' },
};

/* ---------- Small pieces ---------- */
function OtpInput({ value, onChange, disabled, autoFocus, label }) {
  const refs = useRef([]);
  // `value` is always a run of digits (0–6 long); box i shows value[i].
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  // Focus the first box on open, and again whenever the code is cleared (e.g. after a wrong code)
  useEffect(() => {
    if (autoFocus && !value && !disabled) refs.current[0]?.focus();
  }, [autoFocus, value, disabled]);

  const focusAt = (i) => refs.current[Math.max(0, Math.min(5, i))]?.focus();

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault();
      onChange(value.slice(0, i - 1) + value.slice(i));
      focusAt(i - 1);
    } else if (e.key === 'ArrowLeft') focusAt(i - 1);
    else if (e.key === 'ArrowRight') focusAt(i + 1);
  };
  const onInput = (i, e) => {
    const d = e.target.value.replace(/\D/g, '');
    const pos = Math.min(i, value.length); // never leave gaps
    if (!d) {
      onChange(value.slice(0, pos) + value.slice(pos + 1));
      return;
    }
    // A single keypress, or several digits from paste or SMS autofill
    const typed = d.length > 1 && digits[i] && d.startsWith(digits[i]) ? d.slice(1) : d;
    const merged = (value.slice(0, pos) + typed + value.slice(pos + typed.length)).slice(0, 6);
    onChange(merged);
    focusAt(pos + typed.length);
  };
  const onPaste = (e) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!d) return;
    e.preventDefault();
    onChange(d);
    refs.current[Math.min(d.length, 5)]?.focus();
  };

  return (
    <div className="otp" role="group" aria-label={label}>
      {digits.map((c, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          value={c}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, invalid, label }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} aria-invalid={invalid || undefined} aria-label={label} />
      <button type="button" className="pw__toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
        {show ? 'Hide' : 'Show'}
      </button>
    </span>
  );
}

function Alert({ tone = 'bad', children }) {
  return (
    <div className={`auth-alert auth-alert--${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <Icon name={tone === 'ok' ? 'check' : 'alert'} size={16} />
      <span>{children}</span>
    </div>
  );
}

function Submit({ busy, children }) {
  return (
    <button type="submit" className="btn btn--primary auth-submit" disabled={busy} aria-busy={busy}>
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

function minutesLeft(until) {
  return Math.max(1, Math.ceil((until - Date.now()) / 60_000));
}

/* ---------- Page ---------- */
export default function Login() {
  const { user, notice, setNotice, completeSignIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [resendIn, setResendIn] = useState(0);
  const [showDemo, setShowDemo] = useState(true);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Submit automatically once all six digits are in
  useEffect(() => {
    if (step === 'otp' && code.length === 6 && !busy) onOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (user) return <Navigate to={next} replace />;

  const go = (s) => {
    setError(null);
    setCode('');
    setStep(s);
  };

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const onCredentials = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError({ code: 'missing' });
    run(async () => {
      const res = await api.signIn(email, password);
      setNotice(null);
      setChallenge(res);
      setResendIn(30);
      go('otp');
    });
  };

  const onOtp = (e) => {
    e?.preventDefault();
    if (code.length !== 6) return setError({ code: 'short_code' });
    run(async () => {
      try {
        const res = await api.verifyOtp(challenge.challengeId, code);
        completeSignIn(res, remember);
        navigate(next, { replace: true });
      } catch (err) {
        setCode(''); // clear the boxes so the admin can type the code again straight away
        throw err;
      }
    });
  };

  const onResend = () =>
    run(async () => {
      await api.resendOtp(challenge.challengeId);
      setResendIn(30);
      setCode('');
    });

  const onForgot = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError({ code: 'bad_email' });
    run(async () => {
      await api.requestReset(email);
      setResendIn(30);
      go('reset');
    });
  };

  const rulesMet = api.PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(newPw) }));
  const onReset = (e) => {
    e.preventDefault();
    if (code.length !== 6) return setError({ code: 'short_code' });
    if (!rulesMet.every((r) => r.ok)) return setError({ code: 'weak' });
    if (newPw !== confirmPw) return setError({ code: 'mismatch' });
    run(async () => {
      await api.resetPassword(email, code, newPw);
      setPassword('');
      setNewPw('');
      setConfirmPw('');
      setNotice('reset-done');
      go('credentials');
    });
  };

  const errorText = (err) => {
    if (!err) return null;
    switch (err.code) {
      case 'missing':
        return 'Enter your work email and password.';
      case 'invalid':
        return err.remaining <= 2 ? `Email or password is incorrect. ${err.remaining} attempt${err.remaining === 1 ? '' : 's'} left before the account is locked for ${api.LOCK_MINUTES} minutes.` : 'Email or password is incorrect.';
      case 'locked':
        return `Too many failed attempts. Try again in ${minutesLeft(err.until)} minute${minutesLeft(err.until) === 1 ? '' : 's'}, or reset your password.`;
      case 'disabled':
        return 'This admin account has been disabled. Ask a super admin to restore access.';
      case 'bad_code':
        return 'That code is not right. Check the latest SMS and try again.';
      case 'expired':
        return 'This code has expired. Go back and sign in again to get a new one.';
      case 'short_code':
        return 'Enter all 6 digits of the code.';
      case 'bad_email':
        return 'Enter a valid email address.';
      case 'weak':
        return 'Choose a password that meets every rule below.';
      case 'mismatch':
        return 'The two passwords do not match.';
      default:
        return 'Something went wrong on our side. Try again in a moment.';
    }
  };

  const n = notice && NOTICES[notice];

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__logo">
          <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
            <path d="M5 22a11 11 0 0 1 22 0" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 22l5.5-6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="22" r="2.4" fill="currentColor" />
          </svg>
          AutoScope
        </div>
        <div className="auth__pitch">
          <h1>Admin console</h1>
          <p>Verify providers, review listings, settle disputes and run payouts for the AutoScope marketplace.</p>
        </div>
        <p className="auth__legal">
          <Icon name="shield" size={16} />
          For AutoScope staff only. Every sign-in is recorded in the audit log.
        </p>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          {step === 'credentials' && (
            <form onSubmit={onCredentials} noValidate>
              <h2>Sign in</h2>
              <p className="auth__lead">Use your AutoScope work account.</p>
              {n && !error && <Alert tone={n.tone}>{n.text}</Alert>}
              {error && <Alert>{errorText(error)}</Alert>}
              <label className="field" htmlFor="login-email">
                <span className="field__label">Work email</span>
                <input id="login-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@autoscope.ng" aria-invalid={error?.code === 'invalid' || error?.code === 'missing' || undefined} />
              </label>
              <div className="field">
                <span className="field__row">
                  <label className="field__label" htmlFor="login-password">Password</label>
                  <button type="button" className="text-btn" onClick={() => go('forgot')}>Forgot password?</button>
                </span>
                <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" invalid={error?.code === 'invalid'} />
              </div>
              <label className="remember" htmlFor="login-remember">
                <input id="login-remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Keep me signed in on this device
              </label>
              <Submit busy={busy}>Sign in</Submit>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={onOtp} noValidate>
              <button type="button" className="back-link" onClick={() => go('credentials')}>
                <Icon name="chevronLeft" size={16} /> Use a different account
              </button>
              <h2>Enter your code</h2>
              <p className="auth__lead">
                We sent a 6-digit code by SMS to <strong>{challenge?.sentTo}</strong>. It expires in {api.OTP_TTL_SECONDS / 60} minutes.
              </p>
              {error && <Alert>{errorText(error)}</Alert>}
              <OtpInput value={code} onChange={setCode} disabled={busy} autoFocus label="Sign-in code" />
              <Submit busy={busy}>Verify and sign in</Submit>
              <p className="auth__aside">
                Didn't get it?{' '}
                {resendIn > 0 ? (
                  <span className="muted">Resend in {resendIn}s</span>
                ) : (
                  <button type="button" className="text-btn" onClick={onResend} disabled={busy}>
                    Resend code
                  </button>
                )}
              </p>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={onForgot} noValidate>
              <button type="button" className="back-link" onClick={() => go('credentials')}>
                <Icon name="chevronLeft" size={16} /> Back to sign in
              </button>
              <h2>Reset your password</h2>
              <p className="auth__lead">Enter your work email. If it belongs to an admin account, we'll send a reset code to the phone on that account.</p>
              {error && <Alert>{errorText(error)}</Alert>}
              <label className="field" htmlFor="forgot-email">
                <span className="field__label">Work email</span>
                <input id="forgot-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@autoscope.ng" autoFocus />
              </label>
              <Submit busy={busy}>Send reset code</Submit>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={onReset} noValidate>
              <button type="button" className="back-link" onClick={() => go('forgot')}>
                <Icon name="chevronLeft" size={16} /> Change email
              </button>
              <h2>Choose a new password</h2>
              <p className="auth__lead">
                If <strong>{email.trim()}</strong> has an admin account, a code is on its way by SMS.
              </p>
              {error && <Alert>{errorText(error)}</Alert>}
              <div className="field">
                <span className="field__label">Reset code</span>
                <OtpInput value={code} onChange={setCode} disabled={busy} autoFocus label="Reset code" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="reset-new">New password</label>
                <PasswordInput id="reset-new" value={newPw} onChange={setNewPw} autoComplete="new-password" invalid={error?.code === 'weak'} />
                <ul className="rules">
                  {rulesMet.map((r) => (
                    <li key={r.id} className={cx(r.ok && 'is-ok')}>
                      <Icon name={r.ok ? 'check' : 'x'} size={13} strokeWidth={2.4} />
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="reset-confirm">Confirm new password</label>
                <PasswordInput id="reset-confirm" value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" invalid={error?.code === 'mismatch'} />
              </div>
              <Submit busy={busy}>Update password</Submit>
              <p className="auth__aside">
                {resendIn > 0 ? (
                  <span className="muted">Resend code in {resendIn}s</span>
                ) : (
                  <button type="button" className="text-btn" onClick={() => run(async () => { await api.requestReset(email); setResendIn(30); })}>
                    Resend code
                  </button>
                )}
              </p>
            </form>
          )}
        </div>

        <section className="demo" aria-label="Demo accounts">
          <button type="button" className="demo__toggle" onClick={() => setShowDemo((s) => !s)} aria-expanded={showDemo}>
            Demo accounts {showDemo ? '(hide)' : '(show)'}
          </button>
          {showDemo && (
            <div className="demo__body">
              <p>
                Password <code>{api.DEMO_PASSWORD}</code>, SMS code <code>{api.DEMO_OTP}</code>. Pick an account to fill in the email:
              </p>
              <ul>
                {api.DEMO_ACCOUNTS.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(a.email);
                        setPassword(api.DEMO_PASSWORD);
                        go('credentials');
                      }}
                    >
                      <strong>{a.name}</strong>
                      <span>{a.disabled ? 'Disabled account' : api.ADMIN_ROLES[a.role].label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
