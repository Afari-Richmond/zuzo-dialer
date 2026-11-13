import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, brandingApi, type TenantBranding } from './api';
import { Btn, ErrorBanner, Field, Input, useLoad } from './ui';
import { applyBranding } from './apply-branding';
import { THEME_PRESETS } from './theme-presets';

/**
 * Account-level settings with no equivalent in the original single-tenant
 * app: tenant branding (logo + a full sidebar palette — presets or manual
 * colors, modeled on the reports dashboard's theme system but trimmed to
 * colors only, no KPI-card theming or banner images) and self-service
 * password change. Session list/revoke (also in the reports dashboard's
 * Settings page) is deliberately not included — our auth is stateless JWT
 * with no session store, so there's nothing to list/revoke without a
 * bigger auth change.
 */

const TABS = ['branding', 'security'] as const;
type Tab = (typeof TABS)[number];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('branding');
  return (
    <div className="max-w-3xl">
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

type ColorKey = 'primaryColor' | 'sidebarColor' | 'accentColor' | 'textColor' | 'navActiveTextColor' | 'navInactiveTextColor';
const DEFAULT_COLORS: Record<ColorKey, string> = {
  primaryColor: '#ff5a1f',
  sidebarColor: '#16140f',
  accentColor: '#ff8a5c',
  textColor: '#f7f3ea',
  navActiveTextColor: '#ffffff',
  navInactiveTextColor: '#938d7e',
};

function BrandingSection() {
  const { data, error, loading, reload } = useLoad(() => brandingApi.get(), 'branding');
  const [logoUrl, setLogoUrl] = useState('');
  const [colors, setColors] = useState<Record<ColorKey, string>>(DEFAULT_COLORS);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setLogoUrl(data.logoUrl ?? '');
      setColors({
        primaryColor: data.primaryColor ?? DEFAULT_COLORS.primaryColor,
        sidebarColor: data.sidebarColor ?? DEFAULT_COLORS.sidebarColor,
        accentColor: data.accentColor ?? DEFAULT_COLORS.accentColor,
        textColor: data.textColor ?? DEFAULT_COLORS.textColor,
        navActiveTextColor: data.navActiveTextColor ?? DEFAULT_COLORS.navActiveTextColor,
        navInactiveTextColor: data.navInactiveTextColor ?? DEFAULT_COLORS.navInactiveTextColor,
      });
    }
  }, [data]);

  function setColor(key: ColorKey, value: string) {
    setColors((prev) => {
      const next = { ...prev, [key]: value };
      applyBranding({ ...emptyBranding(), logoUrl: logoUrl || null, ...next });
      return next;
    });
    setSelectedPreset(null);
  }

  function applyPreset(presetId: string) {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setColors(preset.branding);
    // Live preview immediately, same as picking colors manually — saving is
    // still a separate, explicit step.
    applyBranding({ ...emptyBranding(), logoUrl: logoUrl || null, ...preset.branding });
  }

  function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    brandingApi
      .update({ logoUrl, ...colors })
      .then((result) => {
        setSaved(true);
        applyBranding(result);
        reload();
      })
      .catch((err: Error) => setSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Your logo and sidebar palette appear across your whole team's outreach dashboard.
      </p>
      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {saved && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Branding saved and applied.
        </p>
      )}
      <form onSubmit={save} className="card-surface grid gap-5 p-6">
        <Field label="Logo URL">
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-foreground">Start from a preset</span>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                title={preset.description}
                className={`flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                  selectedPreset === preset.id
                    ? 'border-primary ring-2 ring-ring'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex h-6 overflow-hidden rounded-lg">
                  {preset.swatch.map((hex, i) => (
                    <span key={i} className="flex-1" style={{ backgroundColor: hex }} />
                  ))}
                </div>
                <span className="text-xs font-medium text-foreground">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <Field label="Primary color">
          <ColorField value={colors.primaryColor} onChange={(v) => setColor('primaryColor', v)} />
        </Field>

        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="cursor-pointer text-sm font-medium text-primary hover:underline"
          >
            {advancedOpen ? 'Hide advanced colors' : 'Show advanced colors'}
          </button>
          {advancedOpen && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Sidebar background">
                <ColorField value={colors.sidebarColor} onChange={(v) => setColor('sidebarColor', v)} />
              </Field>
              <Field label="Secondary accent">
                <ColorField value={colors.accentColor} onChange={(v) => setColor('accentColor', v)} />
              </Field>
              <Field label="Sidebar text">
                <ColorField value={colors.textColor} onChange={(v) => setColor('textColor', v)} />
              </Field>
              <Field label="Active nav text">
                <ColorField value={colors.navActiveTextColor} onChange={(v) => setColor('navActiveTextColor', v)} />
              </Field>
              <Field label="Inactive nav text">
                <ColorField
                  value={colors.navInactiveTextColor}
                  onChange={(v) => setColor('navInactiveTextColor', v)}
                />
              </Field>
            </div>
          )}
        </div>

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

function emptyBranding(): TenantBranding {
  return {
    logoUrl: null,
    primaryColor: null,
    sidebarColor: null,
    accentColor: null,
    textColor: null,
    navActiveTextColor: null,
    navInactiveTextColor: null,
  };
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
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
