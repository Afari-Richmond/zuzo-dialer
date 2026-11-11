import { useEffect, useState } from 'react';
import { auth, type TenantActor } from './api';
import { navigate } from './nav';
import { Button } from './ui';
import { LoginPage } from './pages/LoginPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { DncPage } from './pages/DncPage';
import { CredentialsPage } from './pages/CredentialsPage';
import { TeamPage } from './pages/TeamPage';

const NAV_ITEMS = [
  { path: '/app/campaigns', label: 'Campaigns' },
  { path: '/app/dnc', label: 'Do Not Call' },
  { path: '/app/settings/telephony', label: 'Telephony' },
  { path: '/app/team', label: 'Team' },
];

export function App() {
  const [actor, setActor] = useState<TenantActor | null | 'loading'>('loading');
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    auth
      .me()
      .then(setActor)
      .catch(() => setActor(null));
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (actor === 'loading') return null;

  if (!actor) {
    return (
      <LoginPage
        onLoggedIn={() => {
          auth.me().then(setActor);
          navigate('/app/campaigns');
        }}
      />
    );
  }

  const detailMatch = path.match(/^\/app\/campaigns\/([^/]+)$/);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <p className="mb-6 px-2 text-sm font-semibold text-slate-900">zuzo-dialer</p>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = path === item.path || (item.path === '/app/campaigns' && path.startsWith('/app/campaigns'));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm font-medium ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-8 border-t border-slate-200 pt-4">
          <p className="px-2 text-xs text-slate-400">Signed in as {actor.role}</p>
          <Button
            variant="ghost"
            className="mt-1 w-full justify-start"
            onClick={async () => {
              await auth.logout();
              setActor(null);
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 px-8 py-6">
        {detailMatch ? (
          <CampaignDetailPage id={detailMatch[1]} />
        ) : path === '/app/dnc' ? (
          <DncPage />
        ) : path === '/app/settings/telephony' ? (
          <CredentialsPage />
        ) : path === '/app/team' ? (
          <TeamPage />
        ) : (
          <CampaignsPage />
        )}
      </main>
    </div>
  );
}
