import { useState, type FormEvent } from 'react';
import { credentialsApi, teamApi, ApiError } from './api';
import { Btn, ErrorBanner, Field, Input, Select, Table, useLoad } from './ui';

/**
 * New pages with no equivalent in the original single-tenant app, which used
 * one global env-var LiveHub credential and one shared dashboard password.
 * Styled with the same ui.tsx primitives as the ported pages so they read as
 * part of the same app rather than a bolted-on admin panel.
 */

const PROVIDER_FIELDS: Record<string, { key: string; label: string }[]> = {
  stub: [],
  twilio: [
    { key: 'accountSid', label: 'Account SID' },
    { key: 'authToken', label: 'Auth Token' },
    { key: 'from', label: 'From number (optional)' },
  ],
  africastalking: [
    { key: 'username', label: 'Username' },
    { key: 'apiKey', label: 'API Key' },
    { key: 'from', label: 'From number (optional)' },
  ],
  livehub: [
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client Secret' },
    { key: 'outreachBotId', label: 'Outreach Bot ID' },
  ],
};

export function TelephonySettingsPage() {
  const { data, error, loading, reload } = useLoad(
    () => credentialsApi.list().then((d) => d.credentials),
    'telephony-credentials',
  );
  const [provider, setProvider] = useState<keyof typeof PROVIDER_FIELDS>('stub');
  const [label, setLabel] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    credentialsApi
      .upsert({ provider, label: label || `${provider} credential`, credentials: fields })
      .then(() => {
        setLabel('');
        setFields({});
        reload();
      })
      .catch((err: Error) => setSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-sm text-muted-foreground">
        Your calls dial out through your own voice-provider account. Saving a new credential
        activates it and deactivates whatever was active before.
      </p>
      <form onSubmit={save} className="card-surface mb-6 grid gap-4 p-6">
        <div className="flex flex-wrap gap-3">
          <div className="w-48">
            <Field label="Provider">
              <Select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value as keyof typeof PROVIDER_FIELDS);
                  setFields({});
                }}
              >
                <option value="stub">Stub (demo, no setup)</option>
                <option value="twilio">Twilio</option>
                <option value="africastalking">Africa's Talking</option>
                <option value="livehub">LiveHub</option>
              </Select>
            </Field>
          </div>
          <div className="min-w-48 flex-1">
            <Field label="Label">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Primary" />
            </Field>
          </div>
        </div>
        {PROVIDER_FIELDS[provider].length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROVIDER_FIELDS[provider].map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  value={fields[f.key] ?? ''}
                  onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
        )}
        <div>
          <Btn type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save & activate'}
          </Btn>
          <ErrorBanner error={saveError} />
        </div>
      </form>

      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {data && data.length > 0 && (
        <Table headers={['Label', 'Provider', 'Status', '']}>
          {data.map((c) => (
            <tr key={c.id} className="border-t border-border">
              <td className="px-5 py-3.5 font-medium text-foreground">{c.label}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{c.provider}</td>
              <td className="px-5 py-3.5">
                {c.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    inactive
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 text-right">
                {c.isActive && (
                  <Btn
                    kind="ghost"
                    onClick={() => credentialsApi.deactivate(c.id).then(reload)}
                  >
                    Deactivate
                  </Btn>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

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
