import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, api } from './api';
import { navigate } from './nav';
import { Btn, ErrorBanner, Field, Input } from './ui';

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell-bg flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[1.75rem] bg-card p-8 shadow-[0_24px_64px_rgba(5,15,25,0.35)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            Z
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">ZUZO INSURE</div>
            <div className="text-sm font-semibold text-foreground">Outreach</div>
          </div>
        </div>
        <h1 className="mb-1 font-heading text-xl font-bold text-foreground">{title}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function readTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('token');
}

export function AcceptInvitePage() {
  const token = readTokenFromUrl();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Missing invite token — check the link from your invite email.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acceptInvite(token, password);
      setDone(true);
      setTimeout(() => navigate('/outreach/'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept invite');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="You're all set" subtitle="Your password has been set.">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Accept your invite" subtitle="Set a password to activate your account.">
      <form onSubmit={submit} className="grid gap-4">
        <ErrorBanner error={error} />
        <Field label="Password">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <Btn type="submit" disabled={busy}>
          {busy ? 'Setting password…' : 'Set password & sign in'}
        </Btn>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send reset email');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a link to reset it.">
      {sent ? (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          If that email is registered, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <ErrorBanner error={error} />
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Btn type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Btn>
        </form>
      )}
      <button
        type="button"
        onClick={() => navigate('/outreach/')}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </button>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const token = readTokenFromUrl();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token — check the link from your email.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/outreach/'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Password reset" subtitle="Your password has been updated.">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your account.">
      <form onSubmit={submit} className="grid gap-4">
        <ErrorBanner error={error} />
        <Field label="New password">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <Btn type="submit" disabled={busy}>
          {busy ? 'Resetting…' : 'Reset password'}
        </Btn>
      </form>
    </AuthShell>
  );
}
