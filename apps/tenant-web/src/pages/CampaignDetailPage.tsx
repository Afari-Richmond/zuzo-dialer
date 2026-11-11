import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  campaigns as campaignsApi,
  type Campaign,
  type CampaignReport,
  type CampaignTarget,
} from '../api';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, statusTone } from '../ui';
import { navigate } from '../nav';

const OUTCOMES = ['interested', 'not_interested', 'callback_requested', 'wrong_number', 'converted', 'no_decision_yet', 'other'];
const NEXT_STEPS = ['schedule_follow_up', 'send_email_sms', 'escalate_to_agent', 'add_to_dnc', 'no_action_needed'];

export function CampaignDetailPage({ id }: { id: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [targets, setTargets] = useState<CampaignTarget[] | null>(null);
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const [{ campaign }, { targets }, report] = await Promise.all([
        campaignsApi.get(id),
        campaignsApi.targets(id),
        campaignsApi.report(id),
      ]);
      setCampaign(campaign);
      setTargets(targets);
      setReport(report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load campaign');
    }
  }

  useEffect(() => {
    refresh();
  }, [id]);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File) {
    await withBusy(async () => {
      await campaignsApi.uploadContacts(id, file);
    });
  }

  if (!campaign) {
    return error ? <p className="text-sm text-red-600">{error}</p> : <EmptyState>Loading…</EmptyState>;
  }

  return (
    <div>
      <button onClick={() => navigate('/app/campaigns')} className="mb-3 text-sm text-slate-500 hover:text-slate-700">
        ← Campaigns
      </button>
      <PageHeader
        title={campaign.name}
        actions={
          <>
            <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
            {campaign.status !== 'running' ? (
              <Button disabled={busy} onClick={() => withBusy(() => campaignsApi.start(id).then(() => {}))}>
                Start
              </Button>
            ) : (
              <Button disabled={busy} variant="secondary" onClick={() => withBusy(() => campaignsApi.pause(id).then(() => {}))}>
                Pause
              </Button>
            )}
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => withBusy(async () => void (await campaignsApi.drain(id)))}
            >
              Drain queue
            </Button>
          </>
        }
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Contacts</p>
            <p className="text-xs text-slate-500">Upload a .csv/.xlsx with a phone column (name/reason optional).</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
              Upload contacts
            </Button>
          </div>
        </div>
      </Card>

      {report && <ReportSummary report={report} campaignId={id} onChanged={refresh} />}

      <Card>
        <div className="border-b border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
          Targets ({targets?.length ?? 0})
        </div>
        {!targets || targets.length === 0 ? (
          <EmptyState>No contacts uploaded yet.</EmptyState>
        ) : (
          <TargetsTable campaignId={id} targets={targets} report={report} onChanged={refresh} />
        )}
      </Card>
    </div>
  );
}

function ReportSummary({
  report,
  campaignId,
  onChanged,
}: {
  report: CampaignReport;
  campaignId: string;
  onChanged: () => void;
}) {
  const [recommendation, setRecommendation] = useState(report.recommendation ?? '');
  const [saving, setSaving] = useState(false);

  async function saveRecommendation() {
    setSaving(true);
    try {
      await campaignsApi.setRecommendation(campaignId, recommendation);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <Stat label="Contacts" value={report.totalContacts} />
        <Stat label="Completed" value={report.statusCounts.completed ?? 0} />
        <Stat label="Failed" value={report.statusCounts.failed ?? 0} />
        <Stat label="DNC skipped" value={report.statusCounts.dnc ?? 0} />
        <Stat label="Reviewed" value={report.reviewedCount} />
        <Stat label="Needs follow-up" value={report.needsFollowUp} />
        <a
          href={campaignsApi.exportReportUrl(campaignId)}
          className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Export .xlsx
        </a>
      </div>
      <label className="mb-1 block text-xs font-medium text-slate-600">Recommendation</label>
      <div className="flex gap-2">
        <Input value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="e.g. Good response rate, re-run next week" />
        <Button disabled={saving} onClick={saveRecommendation}>
          Save
        </Button>
      </div>
    </Card>
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

function TargetsTable({
  campaignId,
  targets,
  report,
  onChanged,
}: {
  campaignId: string;
  targets: CampaignTarget[];
  report: CampaignReport | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const outcomeByTarget = new Map((report?.rows ?? []).map((r) => [r.targetId, r]));

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="px-4 py-2">Phone</th>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Outcome</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody>
        {targets.map((t) => {
          const row = outcomeByTarget.get(t.id);
          return (
            <Fragment key={t.id}>
              <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-900">{t.phone}</td>
                <td className="px-4 py-2.5 text-slate-500">{t.name ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{row?.outcome ?? '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" onClick={() => setEditing(editing === t.id ? null : t.id)}>
                    {editing === t.id ? 'Close' : 'Log outcome'}
                  </Button>
                </td>
              </tr>
              {editing === t.id && (
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td colSpan={5} className="px-4 py-3">
                    <OutcomeForm
                      campaignId={campaignId}
                      targetId={t.id}
                      initial={row}
                      onSaved={() => {
                        setEditing(null);
                        onChanged();
                      }}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function OutcomeForm({
  campaignId,
  targetId,
  initial,
  onSaved,
}: {
  campaignId: string;
  targetId: string;
  initial?: { outcome: string | null; nextStep: string | null; notes: string | null };
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState(initial?.outcome ?? '');
  const [nextStep, setNextStep] = useState(initial?.nextStep ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await campaignsApi.upsertOutcome(campaignId, targetId, {
        outcome: outcome || undefined,
        nextStep: nextStep || undefined,
        notes: notes || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px]">
        <label className="mb-1 block text-xs font-medium text-slate-600">Outcome</label>
        <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          <option value="">—</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[180px]">
        <label className="mb-1 block text-xs font-medium text-slate-600">Next step</label>
        <Select value={nextStep} onChange={(e) => setNextStep(e.target.value)}>
          <option value="">—</option>
          {NEXT_STEPS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[240px] flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button disabled={saving} onClick={save}>
        Save
      </Button>
    </div>
  );
}
