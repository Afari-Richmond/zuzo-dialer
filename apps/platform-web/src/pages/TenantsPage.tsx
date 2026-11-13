import { useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  stats as statsApi,
  tenants as tenantsApi,
  type Tenant,
  type TenantAdminSettings,
  type TelephonyCredential,
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
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage every tenant on the platform.</p>
        <Btn
          onClick={() => {
            setShowCreate((v) => !v);
            setNewCredentials(null);
          }}
        >
          {showCreate ? 'Cancel' : 'New tenant'}
        </Btn>
      </div>

      {newCredentials && <NewCredentialsBanner credentials={newCredentials} onDismiss={() => setNewCredentials(null)} />}

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
          onCreated={(credentials) => {
            setShowCreate(false);
            setNewCredentials(credentials);
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
            <div className="flex flex-col gap-6">
              <TenantAdminPanel tenantId={tenant.id} onSaved={onChanged} />
              <VoiceEngineCredentialsPanel tenantId={tenant.id} />
            </div>
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

/**
 * Platform-only. This is where the AI voice engine's own credentials get
 * wired up for a tenant — deliberately absent from tenant-web entirely. A
 * tenant never has a reason to hold these, and showing them would be the
 * one place our white-labeling could leak back to the underlying platform.
 */
function VoiceEngineCredentialsPanel({ tenantId }: { tenantId: string }) {
  const [credentials, setCredentials] = useState<TelephonyCredential[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [outreachBotId, setOutreachBotId] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    tenantsApi
      .listTelephonyCredentials(tenantId)
      .then(setCredentials)
      .catch((err: Error) => setLoadError(err.message));
  }

  useEffect(load, [tenantId]);

  const active = credentials?.find((c) => c.provider === 'livehub' && c.isActive) ?? null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    tenantsApi
      .upsertTelephonyCredential(tenantId, {
        provider: 'livehub',
        label: 'Voice AI engine',
        credentials: { clientId, clientSecret, outreachBotId },
      })
      .then(() => {
        setClientId('');
        setClientSecret('');
        setOutreachBotId('');
        setSaved(true);
        load();
      })
      .catch((err: Error) => setSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h4 className="mb-1 text-sm font-semibold text-foreground">Voice AI engine</h4>
      <p className="mb-4 text-sm text-muted-foreground">
        The underlying AI voice platform's connection for this tenant — set up here only, never visible or
        editable in the tenant's own dashboard.
      </p>
      <ErrorBanner error={loadError} />

      {active && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <span className="text-sm text-green-800">Connected — "{active.label}" is active.</span>
          <Btn
            kind="ghost"
            onClick={() => tenantsApi.deactivateTelephonyCredential(tenantId, active.id).then(load)}
          >
            Disconnect
          </Btn>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <Field label="Client ID">
          <Input value={clientId} onChange={(e) => setClientId(e.target.value)} required />
        </Field>
        <Field label="Client secret">
          <Input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            required
          />
        </Field>
        <Field label="Outreach bot ID">
          <Input value={outreachBotId} onChange={(e) => setOutreachBotId(e.target.value)} required />
        </Field>
        <div className="sm:col-span-3">
          <Btn type="submit" disabled={saving}>
            {saving ? 'Saving…' : active ? 'Replace connection' : 'Connect'}
          </Btn>
          {saved && <span className="ml-3 text-sm text-green-700">Saved.</span>}
          <ErrorBanner error={saveError} />
        </div>
      </form>
    </div>
  );
}

function NewCredentialsBanner({
  credentials,
  onDismiss,
}: {
  credentials: { email: string; password: string };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      .writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  }

  return (
    <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-green-800">Tenant created and ready to log in</p>
          <p className="text-sm text-green-700">
            Hand these credentials to the client directly — this is the only time the password is shown.
          </p>
        </div>
        <button type="button" onClick={onDismiss} className="cursor-pointer text-sm text-green-700 hover:underline">
          Dismiss
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-green-200 bg-card px-4 py-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Email: </span>
          <span className="font-medium text-foreground">{credentials.email}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Password: </span>
          <span className="font-mono font-medium text-foreground">{credentials.password}</span>
        </div>
        <Btn kind="ghost" type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy both'}
        </Btn>
      </div>
    </div>
  );
}

function CreateTenantForm({
  onCreated,
}: {
  onCreated: (credentials: { email: string; password: string }) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    tenantsApi
      .create({ name, slug, adminEmail, adminDisplayName })
      .then((res) => onCreated({ email: res.adminUser.email, password: res.adminPassword }))
      .catch((err: Error) => setError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={submit} className="card-surface mb-6 flex flex-wrap items-end gap-3 p-6">
      <div className="min-w-48 flex-1">
        <Field label="Tenant name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </div>
      <div className="min-w-40 flex-1">
        <Field label="Slug">
          <Input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="e.g. acme"
          />
        </Field>
      </div>
      <div className="min-w-48 flex-1">
        <Field label="First admin's name">
          <Input required value={adminDisplayName} onChange={(e) => setAdminDisplayName(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-48 flex-1">
        <Field label="First admin's email">
          <Input
            type="email"
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="owner@client.com"
          />
        </Field>
      </div>
      <Btn type="submit" disabled={saving}>
        {saving ? 'Creating…' : 'Create tenant'}
      </Btn>
      <ErrorBanner error={error} />
    </form>
  );
}
