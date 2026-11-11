import { useEffect, useState } from 'react';
import { ApiError, team as teamApi, type TeamMember } from '../api';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, statusTone } from '../ui';

export function TeamPage() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'tenant_admin' | 'agent'>('agent');
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function refresh() {
    try {
      const { members } = await teamApi.list();
      setMembers(members);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load team');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTempPassword(null);
    try {
      const { tempPassword } = await teamApi.invite({ email, displayName, role });
      setTempPassword(tempPassword);
      setEmail('');
      setDisplayName('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to invite team member');
    }
  }

  return (
    <div>
      <PageHeader title="Team" />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {tempPassword && (
        <Card className="mb-4 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Share this temporary password with the new team member — it won't be shown again:{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">{tempPassword}</code>
          </p>
        </Card>
      )}
      <Card className="mb-4 p-4">
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as 'tenant_admin' | 'agent')}>
              <option value="agent">Agent</option>
              <option value="tenant_admin">Admin</option>
            </Select>
          </div>
          <Button type="submit">Invite</Button>
        </form>
      </Card>
      <Card>
        {members === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-900">{m.displayName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{m.email}</td>
                  <td className="px-4 py-2.5 text-slate-500">{m.role}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await teamApi.update(m.id, { status: m.status === 'suspended' ? 'active' : 'suspended' });
                        refresh();
                      }}
                    >
                      {m.status === 'suspended' ? 'Reactivate' : 'Suspend'}
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
