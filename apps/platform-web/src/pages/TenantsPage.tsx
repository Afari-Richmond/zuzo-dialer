import { useState, type FormEvent } from 'react';
import { ApiError, stats as statsApi, tenants as tenantsApi, type Tenant } from '../api';
import { Btn, ErrorBanner, Field, Input, StatCard, StatusBadge, Table, useLoad } from '../ui';

export function TenantsPage() {
  const { data: list, error, loading, reload } = useLoad(
    () => tenantsApi.list().then((d) => d.tenants),
    'tenants',
  );
  const { data: overview } = useLoad(() => statsApi.overview(), 'platform-stats', 15000);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage every tenant on the platform.</p>
        <Btn onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Cancel' : 'New tenant'}</Btn>
      </div>

      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total tenants" value={overview.tenants.total} color="gray" />
          <StatCard label="Active" value={overview.tenants.active} color="green" />
          <StatCard label="Trial" value={overview.tenants.trial} color="blue" />
          <StatCard label="Suspended" value={overview.tenants.suspended} color="red" />
        </div>
      )}

      {showCreate && (
        <CreateTenantForm
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}

      {loading && !list && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {list && list.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">No tenants yet.</p>
      )}
      {list && list.length > 0 && (
        <Table headers={['Name', 'Slug', 'Status', 'Created', '']}>
          {list.map((t) => (
            <TenantRow key={t.id} tenant={t} onChanged={reload} />
          ))}
        </Table>
      )}
    </div>
  );
}

function TenantRow({ tenant, onChanged }: { tenant: Tenant; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  function toggle() {
    setBusy(true);
    const call = tenant.status === 'suspended' ? tenantsApi.activate(tenant.id) : tenantsApi.suspend(tenant.id);
    call.then(onChanged).finally(() => setBusy(false));
  }

  return (
    <tr className="border-t border-border hover:bg-secondary">
      <td className="px-5 py-3.5 font-medium text-foreground">{tenant.name}</td>
      <td className="px-5 py-3.5 text-muted-foreground">{tenant.slug}</td>
      <td className="px-5 py-3.5">
        <StatusBadge status={tenant.status} />
      </td>
      <td className="px-5 py-3.5 text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</td>
      <td className="px-5 py-3.5 text-right">
        <Btn kind={tenant.status === 'suspended' ? 'primary' : 'danger'} onClick={toggle} disabled={busy}>
          {busy ? '…' : tenant.status === 'suspended' ? 'Activate' : 'Suspend'}
        </Btn>
      </td>
    </tr>
  );
}

function CreateTenantForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    tenantsApi
      .create({ name, slug })
      .then(onCreated)
      .catch((err: Error) => setError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={submit} className="card-surface mb-6 flex flex-wrap items-end gap-3 p-6">
      <div className="min-w-48 flex-1">
        <Field label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </div>
      <div className="min-w-48 flex-1">
        <Field label="Slug">
          <Input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="e.g. acme"
          />
        </Field>
      </div>
      <Btn type="submit" disabled={saving}>
        {saving ? 'Creating…' : 'Create'}
      </Btn>
      <ErrorBanner error={error} />
    </form>
  );
}
