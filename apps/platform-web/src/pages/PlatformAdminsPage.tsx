import { useState, type FormEvent } from 'react';
import { ApiError, platformAdmins as adminsApi, type PlatformAdmin } from '../api';
import { Btn, ErrorBanner, Field, Input, StatusBadge, Table, useLoad } from '../ui';

export function PlatformAdminsPage() {
  const { data: list, error, loading, reload } = useLoad(
    () => adminsApi.list().then((d) => d.admins),
    'platform-admins',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    adminsApi
      .create({ email, password, displayName })
      .then(() => {
        setEmail('');
        setPassword('');
        setDisplayName('');
        reload();
      })
      .catch((err: Error) => setCreateError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setCreating(false));
  }

  return (
    <div className="max-w-3xl">
      <p className="mb-6 text-sm text-muted-foreground">
        Platform admins can sign in to this console and manage every tenant.
      </p>
      <form onSubmit={create} className="card-surface mb-6 flex flex-wrap items-end gap-3 p-6">
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
        <div className="min-w-40 flex-1">
          <Field label="Password">
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
        <Btn type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create'}
        </Btn>
      </form>
      <ErrorBanner error={createError} />

      {loading && !list && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {list && (
        <Table headers={['Name', 'Email', 'Status', '']}>
          {list.map((a) => (
            <AdminRow key={a.id} admin={a} onChanged={reload} />
          ))}
        </Table>
      )}
    </div>
  );
}

function AdminRow({ admin, onChanged }: { admin: PlatformAdmin; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  function toggle() {
    setBusy(true);
    adminsApi
      .update(admin.id, { status: admin.status === 'suspended' ? 'active' : 'suspended' })
      .then(onChanged)
      .finally(() => setBusy(false));
  }

  return (
    <tr className="border-t border-border hover:bg-secondary">
      <td className="px-5 py-3.5 font-medium text-foreground">{admin.displayName}</td>
      <td className="px-5 py-3.5 text-muted-foreground">{admin.email}</td>
      <td className="px-5 py-3.5">
        <StatusBadge status={admin.status} />
      </td>
      <td className="px-5 py-3.5 text-right">
        <Btn kind={admin.status === 'suspended' ? 'primary' : 'danger'} onClick={toggle} disabled={busy}>
          {busy ? '…' : admin.status === 'suspended' ? 'Reactivate' : 'Suspend'}
        </Btn>
      </td>
    </tr>
  );
}
