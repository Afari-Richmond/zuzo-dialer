import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, brandingApi } from './api';
import { Btn, ErrorBanner, Field, Input, useLoad } from './ui';

/**
 * Account-level settings with no equivalent in the original single-tenant
 * app: tenant branding (logo + brand color, trimmed down from the reports
 * dashboard's full theme-preset system — no Cloudinary signup required,
 * tenant pastes a hosted logo URL) and self-service password change.
 * Session list/revoke (also in the reports dashboard's Settings page) is
 * deliberately not included — our auth is stateless JWT with no session
 * store, so there's nothing to list/revoke without a bigger auth change.
 */

const TABS = ['branding', 'security'] as const;
type Tab = (typeof TABS)[number];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('branding');
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex gap-1 rounded-full bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'branding' ? <BrandingSection /> : <SecuritySection />}
    </div>
  );
}

function BrandingSection() {
  const { data, error, loading, reload } = useLoad(() => brandingApi.get(), 'branding');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0d9488');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setLogoUrl(data.logoUrl ?? '');
      setPrimaryColor(data.primaryColor ?? '#0d9488');
    }
  }, [data]);

  function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    brandingApi
      .update({ logoUrl, primaryColor })
      .then(() => {
        setSaved(true);
        reload();
      })
      .catch((err: Error) => setSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Your logo and brand color appear in your team's outreach dashboard sidebar.
      </p>
      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {saved && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Branding saved — reload the page to see it applied.
        </p>
      )}
      <form onSubmit={save} className="card-surface grid gap-4 p-6">
        <Field label="Logo URL">
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </Field>
        <Field label="Brand color">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#0d9488'}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
            />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
          </div>
        </Field>
        <div>
          <Btn type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save branding'}
          </Btn>
          <ErrorBanner error={saveError} />
        </div>
      </form>
    </div>
  );
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    api
      .changePassword(currentPassword, newPassword)
      .then(() => {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirm('');
      })
      .catch((err: Error) => setError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Change the password for your own account.</p>
      {success && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Password changed.</p>
      )}
      <form onSubmit={submit} className="card-surface grid gap-4 p-6">
        <ErrorBanner error={error} />
        <Field label="Current password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <div>
          <Btn type="submit" disabled={saving}>
            {saving ? 'Changing…' : 'Change password'}
          </Btn>
        </div>
      </form>
    </div>
  );
}
