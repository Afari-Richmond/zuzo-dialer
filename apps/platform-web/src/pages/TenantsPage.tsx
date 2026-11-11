import { useEffect, useState } from 'react';
import { ApiError, stats as statsApi, tenants as tenantsApi, type PlatformStats, type Tenant } from '../api';
import { Badge, Button, Card, EmptyState, Input, PageHeader, statusTone } from '../ui';

export function TenantsPage() {
  const [list, setList] = useState<Tenant[] | null>(null);
  const [overview, setOverview] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    try {
      const [{ tenants }, stats] = await Promise.all([tenantsApi.list(), statsApi.overview()]);
      setList(tenants);
      setOverview(stats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tenants');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <PageHeader title="Tenants" actions={<Button onClick={() => setShowCreate(true)}>New tenant</Button>} />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {overview && (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <Stat label="Total tenants" value={overview.tenants.total} />
            <Stat label="Active" value={overview.tenants.active} />
            <Stat label="Trial" value={overview.tenants.trial} />
            <Stat label="Suspended" value={overview.tenants.suspended} />
            <Stat label="Tenant users" value={overview.tenantUsers.total} />
            <Stat label="Active users" value={overview.tenantUsers.active} />
          </div>
        </Card>
      )}
      {showCreate && (
        <CreateTenantForm
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}
      <Card>
        {list === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState>No tenants yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{t.slug}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    {t.status === 'suspended' ? (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          await tenantsApi.activate(t.id);
                          refresh();
                        }}
                      >
                        Activate
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          await tenantsApi.suspend(t.id);
                          refresh();
                        }}
                      >
                        Suspend
                      </Button>
                    )}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CreateTenantForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await tenantsApi.create({ name, slug });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create tenant');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 p-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Slug</label>
          <Input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="e.g. acme"
          />
        </div>
        <Button type="submit" disabled={saving}>
          Create
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
