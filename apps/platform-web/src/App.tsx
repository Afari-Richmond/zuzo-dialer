import { useEffect, useState } from 'react';
import { auth, type PlatformActor } from './api';
import { navigate } from './nav';
import { Button } from './ui';
import { LoginPage } from './pages/LoginPage';
import { TenantsPage } from './pages/TenantsPage';
import { PlatformAdminsPage } from './pages/PlatformAdminsPage';

const NAV_ITEMS = [
  { path: '/super-admin/tenants', label: 'Tenants' },
  { path: '/super-admin/admins', label: 'Platform Admins' },
];

export function App() {
  const [actor, setActor] = useState<PlatformActor | null | 'loading'>('loading');
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
          navigate('/super-admin/tenants');
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <p className="mb-6 px-2 text-sm font-semibold text-slate-900">zuzo-dialer / admin</p>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-sm font-medium ${
                path === item.path ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-8 border-t border-slate-200 pt-4">
          <p className="px-2 text-xs text-slate-400">Signed in as platform admin</p>
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
        {path === '/super-admin/admins' ? <PlatformAdminsPage /> : <TenantsPage />}
      </main>
    </div>
  );
}
