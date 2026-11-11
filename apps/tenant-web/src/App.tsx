import { useEffect, useState, type FormEvent } from 'react';
import { LogOut, Megaphone, PhoneOff, Radio, Settings, UploadCloud, Users } from 'lucide-react';
import { ApiError, api } from './api';
import {
  AttemptsPage,
  CampaignReportPage,
  CampaignsPage,
  DoNotCallPage,
  UploadPage,
} from './pages';
import { TeamPage, TelephonySettingsPage } from './extra-pages';
import { navigate } from './nav';
import { Btn, ErrorBanner, Field, Input } from './ui';

const NAV = [
  { id: 'upload', label: 'Upload contacts', icon: UploadCloud },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'attempts', label: 'Call attempts', icon: Radio },
  { id: 'dnc', label: 'Do-not-call', icon: PhoneOff },
  { id: 'settings', label: 'Telephony', icon: Settings },
  { id: 'team', label: 'Team', icon: Users },
] as const;

type PageId = (typeof NAV)[number]['id'];
type Route = { page: PageId } | { page: 'campaign-report'; campaignId: string };

function routeFromPath(): Route {
  const raw = window.location.pathname.replace(/^\/outreach\/?/, '') || 'upload';
  const reportMatch = raw.match(/^campaigns\/([^/]+)\/report$/);
  if (reportMatch) return { page: 'campaign-report', campaignId: reportMatch[1] };
  return { page: (NAV.find((n) => n.id === raw)?.id ?? 'upload') as PageId };
}

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [route, setRoute] = useState<Route>(routeFromPath);

  useEffect(() => {
    api
      .me()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function go(id: PageId) {
    navigate(`/outreach/${id}`);
    setRoute({ page: id });
  }

  if (authed === null) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </div>
    );
  }
  if (!authed) {
    return (
      <Login
        onOk={() => {
          setAuthed(true);
          go('upload');
        }}
      />
    );
  }

  const navId: PageId = route.page === 'campaign-report' ? 'campaigns' : route.page;
  const active = NAV.find((n) => n.id === navId)!;

  return (
    <div className="app-shell-bg flex min-h-screen items-start justify-center p-0 sm:p-4 lg:p-8">
      <div className="flex min-h-screen w-full max-w-[90rem] overflow-hidden bg-card sm:min-h-[calc(100vh-4rem)] sm:rounded-[2rem] sm:shadow-[0_24px_64px_rgba(5,15,25,0.35)]">
        <aside className="hidden w-20 shrink-0 bg-sidebar lg:flex xl:w-64">
          <div className="sticky top-0 flex max-h-screen w-full flex-col overflow-y-auto px-3 py-6 xl:px-4">
            <div className="mb-8 flex items-center justify-center gap-3 px-1 xl:justify-start">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                Z
              </div>
              <div className="hidden min-w-0 xl:block">
                <div className="truncate text-xs font-medium uppercase tracking-wide text-primary-glow">
                  ZuZo Insure
                </div>
                <div className="truncate text-sm font-semibold text-sidebar-foreground">
                  Outreach
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-1.5">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  title={n.label}
                  onClick={() => go(n.id)}
                  className={`flex cursor-pointer items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-left text-sm font-medium transition-colors xl:justify-start xl:px-3 ${
                    navId === n.id
                      ? 'bg-sidebar-active text-primary-glow'
                      : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground'
                  }`}
                >
                  <n.icon className="size-[18px] shrink-0" />
                  <span className="hidden truncate xl:inline">{n.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-4">
              <button
                type="button"
                title="Sign out"
                onClick={() => api.logout().then(() => setAuthed(false))}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-left text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground xl:justify-start xl:px-3"
              >
                <LogOut className="size-[18px] shrink-0" />
                <span className="hidden xl:inline">Sign out</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-content-background">
          <header className="hidden items-center justify-between bg-card px-8 py-5 lg:flex">
            <h1 className="font-heading text-lg font-bold text-foreground">
              {active.label}
            </h1>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {route.page === 'campaign-report' ? (
              <CampaignReportPage campaignId={route.campaignId} />
            ) : route.page === 'attempts' ? (
              <AttemptsPage />
            ) : route.page === 'campaigns' ? (
              <CampaignsPage />
            ) : route.page === 'dnc' ? (
              <DoNotCallPage />
            ) : route.page === 'settings' ? (
              <TelephonySettingsPage />
            ) : route.page === 'team' ? (
              <TeamPage />
            ) : (
              <UploadPage />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Login({ onOk }: { onOk: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      onOk();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not sign in';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell-bg flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-[1.75rem] bg-card p-8 shadow-[0_24px_64px_rgba(5,15,25,0.35)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            Z
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">
              ZuZo Insure
            </div>
            <div className="text-sm font-semibold text-foreground">Outreach</div>
          </div>
        </div>
        <h1 className="mb-1 font-heading text-xl font-bold text-foreground">Sign in</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Sign in to your tenant's outreach dashboard.
        </p>
        <ErrorBanner error={error} />
        <div className={`grid gap-4 ${error ? 'mt-3' : ''}`}>
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
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
        </div>
        <Btn className="mt-5 w-full" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Btn>
      </form>
    </div>
  );
}
