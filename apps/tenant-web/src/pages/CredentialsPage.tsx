import { useEffect, useState } from 'react';
import { ApiError, credentials as credentialsApi, type TelephonyCredential } from '../api';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select } from '../ui';

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

export function CredentialsPage() {
  const [list, setList] = useState<TelephonyCredential[] | null>(null);
  const [provider, setProvider] = useState<keyof typeof PROVIDER_FIELDS>('stub');
  const [label, setLabel] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const { credentials } = await credentialsApi.list();
      setList(credentials);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load credentials');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await credentialsApi.upsert({ provider, label: label || `${provider} credential`, credentials: fields });
      setLabel('');
      setFields({});
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Telephony credentials" />
      <p className="mb-4 max-w-xl text-sm text-slate-500">
        Each tenant dials through its own voice-provider account. Saving a new credential
        activates it and deactivates whatever was active before.
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Card className="mb-4 p-4">
        <form onSubmit={save} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-slate-600">Provider</label>
              <Select value={provider} onChange={(e) => { setProvider(e.target.value as keyof typeof PROVIDER_FIELDS); setFields({}); }}>
                <option value="stub">Stub (demo, no setup)</option>
                <option value="twilio">Twilio</option>
                <option value="africastalking">Africa's Talking</option>
                <option value="livehub">LiveHub</option>
              </Select>
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Primary" />
            </div>
          </div>
          {PROVIDER_FIELDS[provider].length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PROVIDER_FIELDS[provider].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{f.label}</label>
                  <Input
                    value={fields[f.key] ?? ''}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
          <Button type="submit" disabled={saving}>
            Save &amp; activate
          </Button>
        </form>
      </Card>
      <Card>
        {list === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState>No credentials configured yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Label</th>
                <th className="px-4 py-2">Provider</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-900">{c.label}</td>
                  <td className="px-4 py-2.5 text-slate-500">{c.provider}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={c.isActive ? 'green' : 'slate'}>{c.isActive ? 'active' : 'inactive'}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {c.isActive && (
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await credentialsApi.deactivate(c.id);
                          refresh();
                        }}
                      >
                        Deactivate
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
