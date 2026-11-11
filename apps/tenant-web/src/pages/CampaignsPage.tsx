import { useEffect, useState } from 'react';
import { ApiError, campaigns as campaignsApi, credentials as credentialsApi, type Campaign } from '../api';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, statusTone } from '../ui';
import { navigate } from '../nav';

export function CampaignsPage() {
  const [list, setList] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    try {
      const { campaigns } = await campaignsApi.list();
      setList(campaigns);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load campaigns');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <PageHeader
        title="Campaigns"
        actions={<Button onClick={() => setShowCreate(true)}>New campaign</Button>}
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {showCreate && (
        <CreateCampaignForm
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
          <EmptyState>No campaigns yet — create one to get started.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="secondary" onClick={() => navigate(`/app/campaigns/${c.id}`)}>
                      Open
                    </Button>
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

function CreateCampaignForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [creds, setCreds] = useState<{ id: string; label: string; provider: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    credentialsApi.list().then(({ credentials }) => {
      const active = credentials.filter((c) => c.isActive);
      setCreds(active);
      if (active[0]) setCredentialId(active[0].id);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!credentialId) {
      setError('Configure a telephony credential first (Settings → Telephony).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await campaignsApi.create({ name, credentialId });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 p-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Campaign name</label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Telephony credential</label>
          <Select value={credentialId} onChange={(e) => setCredentialId(e.target.value)}>
            {creds.length === 0 && <option value="">No active credentials</option>}
            {creds.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.provider})
              </option>
            ))}
          </Select>
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
