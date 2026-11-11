import { useEffect, useState } from 'react';
import { ApiError, dnc as dncApi, type DncEntry } from '../api';
import { Button, Card, EmptyState, Input, PageHeader } from '../ui';

export function DncPage() {
  const [entries, setEntries] = useState<DncEntry[] | null>(null);
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const { entries } = await dncApi.list();
      setEntries(entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load DNC list');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await dncApi.add(phone, reason || undefined);
      setPhone('');
      setReason('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add number');
    }
  }

  return (
    <div>
      <PageHeader title="Do Not Call list" />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Card className="mb-4 p-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
            <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason (optional)</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button type="submit">Add</Button>
        </form>
      </Card>
      <Card>
        {entries === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : entries.length === 0 ? (
          <EmptyState>No numbers on the DNC list.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Added</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-900">{e.phone}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.reason ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await dncApi.remove(e.id);
                        refresh();
                      }}
                    >
                      Remove
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
