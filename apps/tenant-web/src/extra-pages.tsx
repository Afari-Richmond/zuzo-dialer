import { useState, type FormEvent } from 'react';
import { teamApi } from './api';
import { Btn, ErrorBanner, Field, Input, Select, Table, useLoad } from './ui';

export function TeamPage() {
  const { data, error, loading, reload } = useLoad(() => teamApi.list().then((d) => d.members), 'team');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'tenant_admin' | 'agent'>('agent');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  function invite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInvitedEmail(null);
    teamApi
      .invite({ email, displayName, role })
      .then(() => {
        setInvitedEmail(email);
        setEmail('');
        setDisplayName('');
        reload();
      })
      .catch((err: Error) => setInviteError(err.message))
      .finally(() => setInviting(false));
  }

  return (
    <div className="max-w-2xl">
      {invitedEmail && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Invitation sent to {invitedEmail} — they'll get an email with a link to set their password.
        </p>
      )}
      <form onSubmit={invite} className="card-surface mb-6 flex flex-wrap items-end gap-3 p-6">
        <div className="min-w-48 flex-1">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="min-w-40 flex-1">
          <Field label="Name">
            <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
        </div>
        <div className="w-36">
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as 'tenant_admin' | 'agent')}>
              <option value="agent">Agent</option>
              <option value="tenant_admin">Admin</option>
            </Select>
          </Field>
        </div>
        <Btn type="submit" disabled={inviting}>
          Invite
        </Btn>
      </form>
      <ErrorBanner error={inviteError} />

      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {data && (
        <Table headers={['Name', 'Email', 'Role', 'Status', '']}>
          {data.map((m) => (
            <tr key={m.id} className="border-t border-border">
              <td className="px-5 py-3.5 font-medium text-foreground">{m.displayName}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{m.email}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{m.role}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{m.status}</td>
              <td className="px-5 py-3.5 text-right">
                <Btn
                  kind="ghost"
                  onClick={() =>
                    teamApi.update(m.id, { status: m.status === 'suspended' ? 'active' : 'suspended' }).then(reload)
                  }
                >
                  {m.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                </Btn>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
