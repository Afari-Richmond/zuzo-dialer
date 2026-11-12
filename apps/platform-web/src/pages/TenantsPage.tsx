import { useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  stats as statsApi,
  tenants as tenantsApi,
  type Tenant,
  type TenantAdminSettings,
} from '../api';
import { Btn, ErrorBanner, Field, Input, Select, StatCard, StatusBadge, Table, Textarea, useLoad } from '../ui';

const PLAN_LABELS: Record<TenantAdminSettings['plan'], string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
  custom: 'Custom',
};

function tenantBranding(tenant: Tenant): { logoUrl: string | null; primaryColor: string | null } {
  const branding = (tenant.settings as { branding?: { logoUrl?: string; primaryColor?: string } })?.branding;
  return { logoUrl: branding?.logoUrl ?? null, primaryColor: branding?.primaryColor ?? null };
}

export function TenantsPage() {
  const { data: list, error, loading, reload } = useLoad(
    () => tenantsApi.list().then((d) => d.tenants),
    'tenants',
  );
  const { data: overview } = useLoad(() => statsApi.overview(), 'platform-stats', 15000);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <Table headers={['', 'Name', 'Slug', 'Status', 'Plan', 'Created', '']}>
          {list.map((t) => (
            <TenantRow
              key={t.id}
              tenant={t}
              expanded={expandedId === t.id}
              onToggleExpand={() => setExpandedId((cur) => (cur === t.id ? null : t.id))}
              onChanged={reload}
            />
          ))}
        </Table>
      )}
    </div>
  );
}

function TenantRow({
  tenant,
  expanded,
  onToggleExpand,
  onChanged,
}: {
  tenant: Tenant;
  expanded: boolean;
  onToggleExpand: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  function toggle() {
    setBusy(true);
    const call = tenant.status === 'suspended' ? tenantsApi.activate(tenant.id) : tenantsApi.suspend(tenant.id);
    call.then(onChanged).finally(() => setBusy(false));
  }

  const { logoUrl, primaryColor } = tenantBranding(tenant);
  const adminPreview = (tenant.settings as { admin?: Partial<TenantAdminSettings> })?.admin;

  return (
    <>
      <tr className="border-t border-border hover:bg-secondary">
        <td className="px-5 py-3.5">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-8 rounded-lg object-cover" />
          ) : (
            <span
              className="inline-block size-8 rounded-lg"
              style={{ backgroundColor: primaryColor ?? '#e3e8e7' }}
              title={primaryColor ?? undefined}
            />
          )}
        </td>
        <td className="px-5 py-3.5 font-medium text-foreground">{tenant.name}</td>
        <td className="px-5 py-3.5 text-muted-foreground">{tenant.slug}</td>
        <td className="px-5 py-3.5">
          <StatusBadge status={tenant.status} />
        </td>
        <td className="px-5 py-3.5 text-muted-foreground">{PLAN_LABELS[adminPreview?.plan ?? 'trial']}</td>
        <td className="px-5 py-3.5 text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</td>
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-2">
            <Btn kind="ghost" onClick={onToggleExpand}>
              {expanded ? 'Close' : 'Manage'}
            </Btn>
            <Btn kind={tenant.status === 'suspended' ? 'primary' : 'danger'} onClick={toggle} disabled={busy}>
              {busy ? '…' : tenant.status === 'suspended' ? 'Activate' : 'Suspend'}
            </Btn>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-border bg-secondary/40">
          <td colSpan={7} className="px-5 py-5">
            <TenantAdminPanel tenantId={tenant.id} onSaved={onChanged} />
          </td>
        </tr>
      )}
    </>
  );
}

function TenantAdminPanel({ tenantId, onSaved }: { tenantId: string; onSaved: () => void }) {
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    tenantsApi
      .getAdminSettings(tenantId)
      .then(setSettings)
      .catch((err: Error) => setLoadError(err.message));
  }, [tenantId]);

  if (loadError) return <ErrorBanner error={loadError} />;
  if (!settings) return <p className="text-sm text-muted-foreground">Loading settings…</p>;

  function set<K extends keyof TenantAdminSettings>(key: K, value: TenantAdminSettings[K]) {
    setSettings((cur) => (cur ? { ...cur, [key]: value } : cur));
    setSaved(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    tenantsApi
      .updateAdminSettings(tenantId, settings)
      .then((next) => {
        setSettings(next);
        setSaved(true);
        onSaved();
      })
      .catch((err: Error) => setSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Plan">
          <Select
            value={settings.plan}
            onChange={(e) => set('plan', e.target.value as TenantAdminSettings['plan'])}
          >
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Monthly minute quota">
          <Input
            type="number"
            min={0}
            placeholder="Unlimited"
            value={settings.monthlyMinuteQuota ?? ''}
            onChange={(e) => set('monthlyMinuteQuota', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
        <Field label="Rate billed to this tenant (USD / min)">
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="e.g. 1.25"
            value={settings.ratePerMinuteCents != null ? (settings.ratePerMinuteCents / 100).toFixed(2) : ''}
            onChange={(e) =>
              set('ratePerMinuteCents', e.target.value === '' ? null : Math.round(Number(e.target.value) * 100))
            }
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Billing contact name">
          <Input
            value={settings.billingContactName ?? ''}
            onChange={(e) => set('billingContactName', e.target.value || null)}
          />
        </Field>
        <Field label="Billing contact email">
          <Input
            type="email"
            value={settings.billingContactEmail ?? ''}
            onChange={(e) => set('billingContactEmail', e.target.value || null)}
          />
        </Field>
      </div>
      <Field label="Internal notes">
        <Textarea
          rows={3}
          placeholder="Contract terms, onboarding notes, anything the team should know about this tenant…"
          value={settings.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || null)}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Btn type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Btn>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
        <ErrorBanner error={saveError} />
      </div>
    </form>
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
