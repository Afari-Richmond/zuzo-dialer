import { useEffect, useState } from 'react';
import { ApiError, platformAdmins as adminsApi, type PlatformAdmin } from '../api';
import { Badge, Button, Card, EmptyState, Input, PageHeader, statusTone } from '../ui';

export function PlatformAdminsPage() {
  const [list, setList] = useState<PlatformAdmin[] | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const { admins } = await adminsApi.list();
      setList(admins);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load platform admins');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adminsApi.create({ email, password, displayName });
      setEmail('');
      setPassword('');
      setDisplayName('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create platform admin');
    }
  }

  return (
    <div>
      <PageHeader title="Platform admins" />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Card className="mb-4 p-4">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </Card>
      <Card>
        {list === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-900">{a.displayName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{a.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await adminsApi.update(a.id, { status: a.status === 'suspended' ? 'active' : 'suspended' });
                        refresh();
                      }}
                    >
                      {a.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
