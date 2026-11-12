import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { navigate } from './nav';
import {
  api,
  type Campaign,
  type CampaignNextStep,
  type CampaignOutcome,
  type CampaignReportRow,
  type CampaignTarget,
  type MachineDetection,
  type OutboundAttempt,
} from './api';
import {
  Btn,
  ErrorBanner,
  Field,
  Input,
  Select,
  StatCard,
  StatusBadge,
  Table,
  Textarea,
  Toggle,
  useLoad,
} from './ui';

type TypedContact = { phone: string; reason: string };

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function contactsToCsvFile(rows: TypedContact[]) {
  const csv = [
    'phone,reason',
    ...rows.map((r) => `${csvEscape(r.phone)},${csvEscape(r.reason)}`),
  ].join('\n');
  return new File([csv], 'typed-contacts.csv', { type: 'text/csv' });
}

/** `min` for a datetime-local input, in local time, minute precision. */
function nowForDatetimeLocal() {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export function UploadPage() {
  const [mode, setMode] = useState<'file' | 'type'>('file');
  const [batch, setBatch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<TypedContact[]>([]);
  const [contactPhone, setContactPhone] = useState('');
  const [contactReason, setContactReason] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [liveHubCampaignId, setLiveHubCampaignId] = useState('');
  const [instantDial, setInstantDial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Absent (not an error) in stub mode, where there's no LiveHub campaign concept.
  const { data: campaigns } = useLoad(
    () => api.campaigns().then((d) => d.campaigns).catch(() => []),
    'campaigns-picker',
  );

  function addContact() {
    const phone = contactPhone.trim();
    if (!phone) return;
    setContacts((prev) => [...prev, { phone, reason: contactReason.trim() }]);
    setContactPhone('');
    setContactReason('');
    phoneInputRef.current?.focus();
  }

  function callNow() {
    const phone = contactPhone.trim();
    if (!phone) return;
    setCalling(true);
    setCallResult(null);
    api
      .callNow(
        phone,
        contactReason.trim() || undefined,
        liveHubCampaignId || undefined,
        instantDial,
      )
      .then((res) => {
        if (!res.accepted) {
          setCallResult({ ok: false, text: `Not called — ${res.reason ?? 'rejected'}.` });
          return;
        }
        if (res.dial?.dialed) {
          setCallResult({
            ok: true,
            text: `Calling ${phone} now.${res.dial.identityPrompt ? ` Opening line: "${res.dial.identityPrompt}"` : ''}`,
          });
          setContactPhone('');
          setContactReason('');
          phoneInputRef.current?.focus();
        } else {
          setCallResult({
            ok: false,
            text: `Queued, but dialing failed — ${res.dial?.reason ?? res.dial?.error ?? 'unknown error'}.`,
          });
        }
      })
      .catch((err: Error) => setCallResult({ ok: false, text: err.message }))
      .finally(() => setCalling(false));
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleContactKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addContact();
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!batch.trim()) {
      setError('Pick a batch name.');
      return;
    }
    const uploadFile =
      mode === 'file' ? file : contacts.length ? contactsToCsvFile(contacts) : null;
    if (!uploadFile) {
      setError(mode === 'file' ? 'Choose a file.' : 'Add at least one contact.');
      return;
    }
    const scheduledDate = scheduleEnabled ? new Date(scheduleValue) : null;
    if (scheduleEnabled && (!scheduleValue || Number.isNaN(scheduledDate!.getTime()))) {
      setError('Pick a valid date and time, or turn scheduling off.');
      return;
    }
    const scheduledAt = scheduledDate?.toISOString();

    setSubmitting(true);
    setError(null);
    setMsg(null);
    api
      .upload(batch.trim(), uploadFile, scheduledAt, liveHubCampaignId || undefined)
      .then((res) => {
        const when = scheduledAt
          ? ` — scheduled for ${new Date(scheduledAt).toLocaleString()}`
          : '';
        setMsg(`Queued ${res.accepted} contact(s), skipped ${res.rejected}.${when}`);
        setFile(null);
        setContacts([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-sm text-muted-foreground">
        Add contacts with a phone number and an optional reason describing why each person is being called —
        a renewal reminder, a payment nudge, a product pitch, anything. Existing customers are matched
        automatically by phone number.
      </p>
      {(error || msg) && (
        <div className="mb-4">
          <ErrorBanner error={error || msg} />
        </div>
      )}
      <form onSubmit={submit} className="card-surface grid gap-4 p-6">
        <Field label="Batch name">
          <Input
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="e.g. Nov 2026 renewal push"
            required
          />
        </Field>

        {!!campaigns?.length && (
          <Field label="Campaign">
            <Select
              value={liveHubCampaignId}
              onChange={(e) => setLiveHubCampaignId(e.target.value)}
            >
              <option value="">Default outreach campaign</option>
              {campaigns.map((c) => (
                <option key={c.campaignID} value={c.campaignID}>
                  {c.campaignName} ({c.adminState === 'Locked' ? 'locked' : 'dialing'})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="flex gap-1 rounded-full bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'file' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Upload file
          </button>
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'type' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Type contacts
          </button>
        </div>

        {mode === 'file' ? (
          <Field label="File (.xlsx or .csv)">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-secondary file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-border"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Needs a <code className="rounded bg-secondary px-1 py-0.5">phone</code> column and an optional{' '}
              <code className="rounded bg-secondary px-1 py-0.5">reason</code> (or{' '}
              <code className="rounded bg-secondary px-1 py-0.5">notes</code>) column.
            </p>
          </Field>
        ) : (
          <div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-40">
                <Field label="Phone">
                  <Input
                    ref={phoneInputRef}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    onKeyDown={handleContactKeyDown}
                    placeholder="0244123456"
                  />
                </Field>
              </div>
              <div className="min-w-48 flex-1">
                <Field label="Reason (optional)">
                  <Input
                    value={contactReason}
                    onChange={(e) => setContactReason(e.target.value)}
                    onKeyDown={handleContactKeyDown}
                    placeholder="e.g. Renewal reminder"
                  />
                </Field>
              </div>
              <Btn type="button" kind="ghost" onClick={addContact} disabled={!contactPhone.trim()}>
                Add
              </Btn>
              <Btn
                type="button"
                onClick={callNow}
                disabled={!contactPhone.trim() || calling}
              >
                {calling ? 'Calling…' : 'Call now'}
              </Btn>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Call now dials this phone/reason immediately — it skips the batch and the
              scheduler entirely, good for a one-off test or urgent call.
            </p>
            {!!campaigns?.length && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={instantDial}
                  onChange={(e) => setInstantDial(e.target.checked)}
                  className="size-3.5 cursor-pointer rounded border-input accent-primary"
                />
                Instant dial (bypass campaigns entirely and dial out immediately, ignores
                the Campaign picker above)
              </label>
            )}

            {callResult && (
              <p
                className={`mt-2 rounded-xl px-4 py-3 text-sm ${
                  callResult.ok
                    ? 'bg-green-50 text-green-700'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {callResult.text}
              </p>
            )}

            {contacts.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <div className="max-h-56 divide-y divide-border overflow-y-auto">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-card px-4 py-2.5 text-sm">
                      <span className="font-medium text-foreground">{c.phone}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.reason}</span>
                      <button
                        type="button"
                        onClick={() => removeContact(i)}
                        aria-label={`Remove ${c.phone}`}
                        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bg-secondary px-4 py-2 text-xs font-medium text-muted-foreground">
                  {contacts.length} contact{contacts.length === 1 ? '' : 's'} ready
                </div>
              </div>
            )}
            {contacts.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Enter a phone number and press Add (or Enter) to build the list.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="size-4 cursor-pointer rounded border-input accent-primary"
            />
            Schedule for later
          </label>
          {scheduleEnabled && (
            <div className="mt-2">
              <Input
                type="datetime-local"
                value={scheduleValue}
                min={nowForDatetimeLocal()}
                onChange={(e) => setScheduleValue(e.target.value)}
                required={scheduleEnabled}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Calls won't start until this time. Leave unchecked to queue for immediate dialing.
              </p>
            </div>
          )}
        </div>

        <div>
          <Btn type="submit" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Upload'}
          </Btn>
        </div>
      </form>
    </div>
  );
}

const STATUS_OPTIONS = [
  'queued',
  'dialing',
  'answered',
  'machine',
  'no_answer',
  'failed',
  'completed',
  'dnc',
  'outside_window',
];

/** Live LiveHub campaign health for one campaign — silently absent (not an
 * ErrorBanner) if the fetch fails, since that's a normal/expected mode when
 * VOICE_PROVIDER isn't livehub. */
function targetsToCsv(targets: CampaignTarget[]): string {
  const lines = ['Target phone number,Bot name,Number of retries,Last failure reason,Status'];
  for (const t of targets) {
    const cells = [
      t.setting.targetNumber.replace(/^tel:/, ''),
      t.setting.botDisplayName ?? '',
      String(t.status.numOfRetries ?? 0),
      t.status.lastFailureReason ?? 'N/A',
      t.status.status,
    ];
    lines.push(cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

function downloadTargetsCsv(campaignId: string, targets: CampaignTarget[]) {
  const blob = new Blob([targetsToCsv(targets)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${campaignId}-targets.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function TargetsList({ campaignId }: { campaignId: string }) {
  const { data, error, loading, reload } = useLoad(
    () => api.campaignTargets(campaignId).then((d) => d.targets),
    `campaign-targets:${campaignId}`,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newReason, setNewReason] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ accepted: number; rejected: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleTarget(t: CampaignTarget) {
    setBusyId(t.targetID);
    const call = t.setting.enabled
      ? api.disableTarget(campaignId, t.targetID)
      : api.enableTarget(campaignId, t.targetID);
    call.then(() => reload()).finally(() => setBusyId(null));
  }

  function addTarget(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    api
      .addTarget(campaignId, { targetNumber: newNumber.trim(), reason: newReason.trim() || undefined })
      .then(() => {
        setNewNumber('');
        setNewReason('');
        setShowAdd(false);
        reload();
      })
      .catch((err: Error) => setAddError(err.message))
      .finally(() => setAdding(false));
  }

  function importFile(file: File) {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    api
      .importTargets(campaignId, file)
      .then((result) => {
        setImportResult({ accepted: result.accepted, rejected: result.rejected });
        reload();
      })
      .catch((err: Error) => setImportError(err.message))
      .finally(() => setImporting(false));
  }

  const targets = data ?? [];

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFile(file);
            e.target.value = '';
          }}
        />
        <Btn
          type="button"
          kind="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Upload className="size-4" />
          {importing ? 'Importing…' : 'Import'}
        </Btn>
        <Btn
          type="button"
          kind="ghost"
          onClick={() => downloadTargetsCsv(campaignId, targets)}
          disabled={targets.length === 0}
        >
          <Download className="size-4" />
          Export
        </Btn>
        <Btn type="button" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="size-4" />
          Add new target
        </Btn>
      </div>

      <ErrorBanner error={importError} />
      {importResult && (
        <p className="mb-3 text-xs text-muted-foreground">
          Imported {importResult.accepted} target{importResult.accepted === 1 ? '' : 's'}
          {importResult.rejected > 0 ? `, skipped ${importResult.rejected} (DNC or invalid)` : ''}.
        </p>
      )}

      {showAdd && (
        <form onSubmit={addTarget} className="card-surface mb-3 grid gap-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Target phone number">
              <Input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="e.g. 0244123456"
                required
                autoFocus
              />
            </Field>
            <Field label="Reason (optional)">
              <Input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g. Renewal reminder"
              />
            </Field>
          </div>
          <ErrorBanner error={addError} />
          <div className="flex gap-2">
            <Btn type="submit" disabled={adding}>
              {adding ? 'Adding…' : 'Add target'}
            </Btn>
            <Btn type="button" kind="ghost" onClick={() => setShowAdd(false)} disabled={adding}>
              Cancel
            </Btn>
          </div>
        </form>
      )}

      {loading && !data && <p className="text-xs text-muted-foreground">Loading targets…</p>}
      <ErrorBanner error={error} />
      {!loading && targets.length === 0 && (
        <p className="text-xs text-muted-foreground">No targets on this campaign yet.</p>
      )}
      {targets.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="max-h-72 divide-y divide-border overflow-y-auto">
            {targets.map((t) => (
              <div key={t.targetID} className="flex items-center gap-3 bg-card px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {t.setting.targetNumber.replace(/^tel:/, '')}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{t.status.status}</span>
                {t.status.lastFailureReason && t.status.lastFailureReason.trim() !== 'N/A' && (
                  <span className="shrink-0 text-xs text-destructive">
                    {t.status.lastFailureReason}
                  </span>
                )}
                <Btn
                  kind={t.setting.enabled ? 'danger' : 'primary'}
                  onClick={() => toggleTarget(t)}
                  disabled={busyId === t.targetID}
                  className="shrink-0"
                >
                  {busyId === t.targetID ? '…' : t.setting.enabled ? 'Disable' : 'Enable'}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignStatsGrid({ campaignId }: { campaignId: string }) {
  const { data, error, loading } = useLoad(
    () => api.campaignStats(campaignId),
    `campaign-stats:${campaignId}`,
    15000,
  );
  if (loading && !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return null;
  const t = data.statistics.targetStatistics;
  const c = data.statistics.callsStatistics;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Targets enabled" value={t.enabledTargets} color="gray" />
      <StatCard label="Answered — success" value={t.completed.answeredSuccess} color="green" />
      <StatCard
        label="Answered — bot failure"
        value={t.completed.answeredBotFailure}
        color="amber"
      />
      <StatCard label="Dialer failure" value={t.completed.dialerFailure} color="red" />
      <StatCard label="Calls generated" value={c.totalCallsGenerated} color="gray" />
      <StatCard label="No answer" value={c.callsRescheduled.noAnswer} color="amber" />
      <StatCard label="Busy" value={c.callsRescheduled.busy} color="amber" />
      <StatCard
        label="Unspecified error"
        value={c.callsRescheduled.unspecifiedError}
        color="red"
      />
    </div>
  );
}

type EditTab = 'settings' | 'statistics' | 'targets';
const EDIT_TABS: { id: EditTab; label: string }[] = [
  { id: 'settings', label: 'Settings' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'targets', label: 'Target List' },
];

/** Dims the page and centers its children, closing on backdrop click or Escape. */
function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

const OUTCOME_OPTIONS: { value: CampaignOutcome; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'callback_requested', label: 'Callback requested' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'converted', label: 'Converted' },
  { value: 'no_decision_yet', label: 'No decision yet' },
  { value: 'other', label: 'Other' },
];

const NEXT_STEP_OPTIONS: { value: CampaignNextStep; label: string }[] = [
  { value: 'schedule_follow_up', label: 'Schedule follow-up' },
  { value: 'send_email_sms', label: 'Send email/SMS' },
  { value: 'escalate_to_agent', label: 'Escalate to agent' },
  { value: 'add_to_dnc', label: 'Add to DNC' },
  { value: 'no_action_needed', label: 'No action needed' },
];

function outcomeLabel(value: string) {
  return OUTCOME_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
function nextStepLabel(value: string) {
  return NEXT_STEP_OPTIONS.find((n) => n.value === value)?.label ?? value;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** One row in the call list — a quick scan: who, when, and the logged/suggested action. */
function ReportCallRow({ row, onView }: { row: CampaignReportRow; onView: () => void }) {
  const when = row.call?.setupTime ?? row.lastCallTime;
  return (
    <tr className="border-t border-border hover:bg-secondary">
      <td className="px-5 py-3.5">
        {row.name && (
          <div className="font-medium text-foreground">{row.name}</div>
        )}
        <div className={row.name ? 'text-xs text-muted-foreground' : 'font-medium text-foreground'}>
          {row.phone.replace(/^tel:/, '')}
        </div>
      </td>
      <td className="max-w-[220px] truncate px-5 py-3.5 text-muted-foreground" title={row.reason ?? undefined}>
        {row.reason ?? '—'}
      </td>
      <td className="px-5 py-3.5 text-muted-foreground">{when ? formatShortDate(when) : '—'}</td>
      <td className="px-5 py-3.5 text-muted-foreground">{when ? formatTime(when) : '—'}</td>
      <td className="px-5 py-3.5">
        {row.outcome ? (
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <span className="size-2 rounded-full bg-green-500" />
            {outcomeLabel(row.outcome)}
          </span>
        ) : row.aiSuggestion?.outcome ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            AI: {outcomeLabel(row.aiSuggestion.outcome)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <button
          type="button"
          onClick={onView}
          title="View details"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Eye className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}

/** Per-call detail: call metadata, LiveHub's AI summary (not a verbatim transcript — see
 * note below), and the editable outcome log entry for this contact. */
function CallDetailPanel({
  row,
  campaignId,
  onClose,
  onSaved,
}: {
  row: CampaignReportRow;
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<CampaignOutcome | ''>(row.outcome ?? '');
  const [nextStep, setNextStep] = useState<CampaignNextStep | ''>(row.nextStep ?? '');
  const [notes, setNotes] = useState(row.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    outcome !== (row.outcome ?? '') ||
    nextStep !== (row.nextStep ?? '') ||
    notes !== (row.notes ?? '');

  function applySuggestion() {
    if (!row.aiSuggestion) return;
    if (row.aiSuggestion.outcome) setOutcome(row.aiSuggestion.outcome as CampaignOutcome);
    if (row.aiSuggestion.nextStep) setNextStep(row.aiSuggestion.nextStep as CampaignNextStep);
    if (row.aiSuggestion.summary) setNotes(row.aiSuggestion.summary);
  }

  function save() {
    setSaving(true);
    setError(null);
    api
      .upsertOutcome(campaignId, row.targetId, {
        phone: row.phone,
        outcome: outcome || undefined,
        nextStep: nextStep || undefined,
        notes: notes || undefined,
      })
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSaving(false));
  }

  const when = row.call?.setupTime ?? row.lastCallTime;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 border-b border-border p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Call detail
          </p>
          <h3 className="text-lg font-bold text-foreground">
            {row.name ?? row.phone.replace(/^tel:/, '')}
          </h3>
          {row.name && (
            <p className="text-sm text-muted-foreground">{row.phone.replace(/^tel:/, '')}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {when ? `${formatShortDate(when)} · ${formatTime(when)}` : row.status}
            {row.call && ` · ${row.call.durationSeconds}s · ${row.call.successful ? 'answered' : 'unsuccessful'}`}
          </p>
          {row.reason && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Reason: </span>
              {row.reason}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-5 p-6">
        {row.aiSuggestion ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-primary">AI summary</span>
              <button
                type="button"
                onClick={applySuggestion}
                className="shrink-0 rounded-md border border-primary/40 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
              >
                Use suggestion
              </button>
            </div>
            {row.aiSuggestion.outcome && (
              <p className="text-xs font-medium text-foreground">
                {outcomeLabel(row.aiSuggestion.outcome)}
                {row.aiSuggestion.nextStep && ` · ${nextStepLabel(row.aiSuggestion.nextStep)}`}
              </p>
            )}
            {row.aiSuggestion.summary && (
              <p className="mt-1.5 text-sm text-muted-foreground">{row.aiSuggestion.summary}</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              A word-for-word call transcript isn't available — this is an AI-generated
              summary of the conversation.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No AI summary for this call — either it happened before transcription was enabled,
            or the call was too short to analyze.
          </p>
        )}

        <div className="grid gap-3">
          <Field label="Outcome">
            <Select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as CampaignOutcome)}
            >
              <option value="">— outcome —</option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Next step">
            <Select
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value as CampaignNextStep)}
            >
              <option value="">— next step —</option>
              {NEXT_STEP_OPTIONS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What happened, and what's next…"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <Btn onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
          <ErrorBanner error={error} />
        </div>
      </div>
    </div>
  );
}

/** Full-page campaign report: stat cards, a scannable list of every call, and an overall
 * recommendation. Each row's eye icon opens CallDetailPanel for the AI summary + outcome log. */
export function CampaignReportPage({ campaignId }: { campaignId: string }) {
  const { data, error, loading, reload } = useLoad(
    () => api.campaignReport(campaignId),
    `campaign-report-page:${campaignId}`,
  );
  const [recommendation, setRecommendation] = useState('');
  const [recSaving, setRecSaving] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<CampaignReportRow | null>(null);

  useEffect(() => {
    if (data) setRecommendation(data.recommendation ?? '');
  }, [data]);

  function saveRecommendation() {
    setRecSaving(true);
    setRecError(null);
    api
      .setRecommendation(campaignId, recommendation)
      .catch((err: Error) => setRecError(err.message))
      .finally(() => setRecSaving(false));
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/outreach/campaigns')}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Campaigns
      </button>

      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />

      {data && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-bold text-foreground">
              {data.campaignName}
              <span className="ml-2 text-base font-normal text-muted-foreground">Report</span>
            </h2>
            <a
              href={`/api/v1/outreach/campaigns/${campaignId}/report/export`}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="size-4" />
              Export .xlsx
            </a>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total contacts" value={data.summary.targetsEnabled} color="gray" />
            <StatCard
              label="Responded"
              value={
                data.summary.statistics.targetStatistics.completed.answeredSuccess +
                data.summary.statistics.targetStatistics.completed.answeredBotFailure
              }
              color="blue"
            />
            <StatCard label="Reviewed" value={data.reviewedCount} color="green" />
            <StatCard label="Needs follow-up" value={data.needsFollowUp} color="amber" />
          </div>

          <div className="card-surface mb-6 overflow-hidden">
            {data.rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No calls yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                        Customer
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                        Reason
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                        Time
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                        Action / Summary
                      </th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <ReportCallRow
                        key={row.targetId}
                        row={row}
                        onView={() => setDetailRow(row)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-surface p-6">
            <Field label="Campaign recommendation">
              <Textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                rows={3}
                placeholder="Overall takeaway and what to do next with this campaign…"
              />
            </Field>
            <div className="mt-2 flex items-center gap-3">
              <Btn onClick={saveRecommendation} disabled={recSaving}>
                {recSaving ? 'Saving…' : 'Save recommendation'}
              </Btn>
              <ErrorBanner error={recError} />
            </div>
          </div>
        </>
      )}

      {detailRow && (
        <Modal onClose={() => setDetailRow(null)}>
          <CallDetailPanel
            row={detailRow}
            campaignId={campaignId}
            onClose={() => setDetailRow(null)}
            onSaved={reload}
          />
        </Modal>
      )}
    </div>
  );
}

function CampaignEditPanel({
  campaignId,
  onClose,
  onDeleted,
  onUpdated,
}: {
  campaignId: string;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [tab, setTab] = useState<EditTab>('settings');
  const { data: campaign, error, loading, reload } = useLoad(
    () => api.getCampaign(campaignId),
    `campaign-edit:${campaignId}`,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function confirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    api
      .deleteCampaign(campaignId)
      .then(() => onDeleted())
      .catch((err: Error) => {
        setDeleteError(err.message);
        setConfirmingDelete(false);
      })
      .finally(() => setDeleting(false));
  }

  return (
    <div>
      <div className="border-b border-border px-6 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Edit Campaign Dialer
            </p>
            <h3 className="text-lg font-bold text-foreground">
              {campaign?.campaignName ?? ' '}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-1">
          {EDIT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px cursor-pointer border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading && !campaign && <p className="text-sm text-muted-foreground">Loading…</p>}
        <ErrorBanner error={error} />

        {campaign && tab === 'settings' && (
          <div>
            <CampaignForm
              mode="edit"
              campaignId={campaignId}
              initial={campaign}
              onSaved={() => {
                reload();
                onUpdated();
              }}
            />
            <div className="mt-6 border-t border-border pt-4">
              <ErrorBanner error={deleteError} />
              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-destructive">
                    Delete permanently? All targets/call data go with it.
                  </span>
                  <Btn kind="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                    Cancel
                  </Btn>
                  <Btn kind="danger" onClick={confirmDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </Btn>
                </div>
              ) : (
                <Btn kind="ghost" onClick={() => setConfirmingDelete(true)}>
                  Delete campaign
                </Btn>
              )}
            </div>
          </div>
        )}

        {tab === 'statistics' && <CampaignStatsGrid campaignId={campaignId} />}
        {tab === 'targets' && <TargetsList campaignId={campaignId} />}
      </div>
    </div>
  );
}

export function AttemptsPage() {
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { data: batchesData } = useLoad(
    () => api.batches().then((d) => d.batches),
    'batches',
    15000,
  );
  const { data, error, loading } = useLoad(
    () =>
      api
        .attempts(filterCampaign || undefined, filterStatus || undefined)
        .then((d) => d.attempts),
    `attempts:${filterCampaign}:${filterStatus}`,
    15000,
  );

  const counts = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      queued: rows.filter((a) => a.status === 'queued' || a.status === 'dialing').length,
      completed: rows.filter((a) => a.status === 'completed' || a.status === 'answered').length,
      failed: rows.filter((a) => a.status === 'failed' || a.status === 'no_answer').length,
    };
  }, [data]);

  return (
    <div>
      <SummaryBar
        title="Attempts Summary"
        total={counts.total}
        items={[
          { label: 'In Progress', count: counts.queued, dot: 'bg-amber-400' },
          { label: 'Completed', count: counts.completed, dot: 'bg-green-500' },
          { label: 'Failed / No Answer', count: counts.failed, dot: 'bg-red-400' },
        ]}
      />

      <ErrorBanner error={error} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-56">
          <Select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
          >
            <option value="">All batches</option>
            {(batchesData ?? []).map((b) => (
              <option key={b.campaign} value={b.campaign}>
                {b.campaign} ({b.count})
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">
          {loading ? 'Refreshing…' : 'Refreshes automatically every 15s'}
        </span>
      </div>

      <Table
        headers={['Phone', 'Batch', 'Reason', 'Status', 'Attempt', 'Scheduled', 'Last error']}
      >
        {(data ?? []).map((a: OutboundAttempt) => (
          <tr key={a.id} className="border-t border-border">
            <td className="px-5 py-3.5 font-medium text-foreground">{a.phone}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{a.campaign}</td>
            <td className="max-w-xs truncate px-5 py-3.5 text-muted-foreground" title={a.reason ?? ''}>
              {a.reason}
            </td>
            <td className="px-5 py-3.5">
              <StatusBadge status={a.status} />
            </td>
            <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{a.attemptNumber}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{a.scheduledAt}</td>
            <td className="px-5 py-3.5 text-destructive">{a.lastError}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MACHINE_DETECTION_OPTIONS: { value: MachineDetection; label: string }[] = [
  { value: 'Disabled', label: 'Disconnect and retry (call failure) — default' },
  { value: 'Notify Answer Machine', label: 'Ignore and transfer the call to bot' },
  {
    value: 'Disconnect',
    label:
      'Disconnect when fax answers. Transfer to bot when answering machine answers.',
  },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function oneYearFromTodayIso() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Matches the purple-headed grouped boxes on LiveHub's own "Create a campaign" form. */
function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-5">
      <h3 className="mb-3 text-sm font-semibold text-primary">{title}</h3>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}

function CampaignForm({
  mode,
  campaignId,
  initial,
  onSaved,
  onCancel,
}: {
  mode: 'create' | 'edit';
  campaignId?: string;
  initial?: Campaign;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const initialDays = initial?.schedulerSettings.daysOfWeek ?? ['Everyday'];
  const [locked, setLocked] = useState(initial ? initial.adminState === 'Locked' : false);
  const [campaignName, setCampaignName] = useState(initial?.campaignName ?? '');
  const [defaultBotName, setDefaultBotName] = useState(initial?.defaultBotName ?? '');
  const [timeZone, setTimeZone] = useState(
    initial?.schedulerSettings.timeZone ?? 'Africa/Accra',
  );
  const [startLocalTime, setStartLocalTime] = useState(
    initial?.schedulerSettings.startLocalTime ?? '08:00',
  );
  const [stopLocalTime, setStopLocalTime] = useState(
    initial?.schedulerSettings.stopLocalTime ?? '18:00',
  );
  const [everyday, setEveryday] = useState(initialDays.includes('Everyday'));
  const [days, setDays] = useState<string[]>(
    initialDays.includes('Everyday') ? [] : initialDays,
  );
  const [beginningDate, setBeginningDate] = useState(
    initial?.schedulerSettings.beginningDate ?? todayIso(),
  );
  const [endingDate, setEndingDate] = useState(
    initial?.schedulerSettings.endingDate ?? oneYearFromTodayIso(),
  );
  const [maxCps, setMaxCps] = useState(initial?.schedulerSettings.maxCps ?? 1);
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(
    initial?.schedulerSettings.maxConcurrentCalls ?? 5,
  );
  const [maxRetries, setMaxRetries] = useState(initial?.maxRetries ?? 6);
  const [minDurationBetweenRetries, setMinDurationBetweenRetries] = useState(
    initial?.schedulerSettings.minDurationBetweenRetries ?? 60,
  );
  const [minWaitDurationForAnswer, setMinWaitDurationForAnswer] = useState(
    initial?.detectionCapabilities.minWaitDurationForAnswer ?? 20,
  );
  const [machineDetection, setMachineDetection] = useState<MachineDetection>(
    initial?.detectionCapabilities.machineDetection ?? 'Disabled',
  );
  const [aiContext, setAiContext] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: bots } = useLoad(
    () => api.bots().then((d) => d.bots).catch(() => []),
    'campaign-form-bots',
  );
  const { data: timezones } = useLoad(
    () => api.timezones().then((d) => d.timezones).catch(() => []),
    'campaign-form-timezones',
  );

  function toggleDay(day: string) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!everyday && days.length === 0) {
      setError('Pick at least one day, or select Everyday.');
      return;
    }
    const common = {
      defaultBotName: defaultBotName || undefined,
      timeZone,
      startLocalTime,
      stopLocalTime,
      daysOfWeek: everyday ? ['Everyday'] : days,
      beginningDate,
      endingDate,
      maxCps,
      maxConcurrentCalls,
      maxRetries,
      minDurationBetweenRetries,
      minWaitDurationForAnswer,
      machineDetection,
    };
    setSubmitting(true);
    setError(null);
    if (mode === 'create') {
      api
        .createCampaign({ campaignName: campaignName.trim(), ...common, lockOnCreate: locked })
        .then((created) =>
          aiContext.trim()
            ? api.setAiContext(created.campaignID, aiContext.trim()).then(() => created)
            : created,
        )
        .then(() => {
          setCampaignName('');
          setAiContext('');
          onSaved();
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setSubmitting(false));
      return;
    }
    api
      .updateCampaign(campaignId!, { ...common, locked })
      .then(() => onSaved())
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false));
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <ErrorBanner error={error} />

      <FormSection title="Campaign Control">
        <Toggle checked={locked} onChange={setLocked} offLabel="Unlock" onLabel="Lock" />
        <Hint>
          Leave on Unlock so the campaign starts calling once it has targets and its start
          date arrives. Lock to {mode === 'create' ? 'create it dormant' : 'pause it'}.
        </Hint>
      </FormSection>

      <FormSection title="General Settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Campaign name">
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Dec 2026 renewal push"
                disabled={mode === 'edit'}
                required
              />
            </Field>
            {mode === 'edit' && <Hint>Campaign name can't be changed once it exists.</Hint>}
          </div>
          <div>
            <Field label="Default bot name (optional)">
              <Select
                value={defaultBotName}
                onChange={(e) => setDefaultBotName(e.target.value)}
              >
                <option value="">— each target must name its own bot —</option>
                {(bots ?? []).map((b) => (
                  <option key={b.botName} value={b.botName}>
                    {b.botDisplayName}
                  </option>
                ))}
              </Select>
            </Field>
            <Hint>
              The bot that handles calls. Each target can name its own bot, overriding this
              one. Only bots with outbound calling enabled can be used in a campaign.
            </Hint>
          </div>
        </div>
      </FormSection>

      <FormSection title="Schedule Settings">
        <Field label="Time zone">
          <Select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} required>
            {(timezones ?? []).length === 0 && <option value={timeZone}>{timeZone}</option>}
            {(timezones ?? []).map((tz) => (
              <option key={tz.timezone} value={tz.timezone}>
                {tz.timezone} (UTC{tz.offset})
              </option>
            ))}
          </Select>
          <Hint>Once the campaign has enabled targets, the time zone is fixed.</Hint>
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Campaign time
          </span>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start-Time">
              <Input
                type="time"
                value={startLocalTime}
                onChange={(e) => setStartLocalTime(e.target.value)}
                required
              />
            </Field>
            <Field label="End-Time">
              <Input
                type="time"
                value={stopLocalTime}
                onChange={(e) => setStopLocalTime(e.target.value)}
                required
              />
            </Field>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Campaign days
          </span>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((day) => (
              <label
                key={day}
                className={`flex items-center gap-1.5 text-sm text-foreground ${
                  everyday ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={days.includes(day)}
                  disabled={everyday}
                  onChange={() => toggleDay(day)}
                  className="size-4 cursor-pointer rounded border-input accent-primary disabled:cursor-not-allowed"
                />
                {day.slice(0, 3)}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={everyday}
                onChange={(e) => {
                  setEveryday(e.target.checked);
                  if (e.target.checked) setDays([]);
                }}
                className="size-4 cursor-pointer rounded border-input accent-primary"
              />
              Everyday
            </label>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Campaign date range
          </span>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start-Date">
              <Input
                type="date"
                value={beginningDate}
                min={todayIso()}
                onChange={(e) => setBeginningDate(e.target.value)}
                required
              />
            </Field>
            <Field label="End-Date">
              <Input
                type="date"
                value={endingDate}
                min={beginningDate}
                onChange={(e) => setEndingDate(e.target.value)}
                required
              />
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection title="Call Rate Settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maximum calls per second">
            <Input
              type="number"
              min={1}
              max={10}
              value={maxCps}
              onChange={(e) => setMaxCps(Number(e.target.value))}
              required
            />
            <Hint>Range: 1-10</Hint>
          </Field>
          <Field label="Maximum concurrent calls">
            <Input
              type="number"
              min={1}
              max={1000}
              value={maxConcurrentCalls}
              onChange={(e) => setMaxConcurrentCalls(Number(e.target.value))}
              required
            />
            <Hint>Range: 1-1000</Hint>
          </Field>
        </div>
        <Hint>
          Your account's own call limits still apply. A campaign cannot exceed them, whatever
          you set here.
        </Hint>
      </FormSection>

      <FormSection title="Call Failure and Fax/Answering Machine Settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maximum retries">
            <Input
              type="number"
              min={1}
              max={10}
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              required
            />
            <Hint>Range: 1-10</Hint>
          </Field>
          <Field label="Maximum duration between retries">
            <Input
              type="number"
              min={0}
              max={400}
              value={minDurationBetweenRetries}
              onChange={(e) => setMinDurationBetweenRetries(Number(e.target.value))}
              required
            />
            <Hint>Range: 0-400 min</Hint>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Action triggered by machine detection">
            <Select
              value={machineDetection}
              onChange={(e) => setMachineDetection(e.target.value as MachineDetection)}
            >
              {MACHINE_DETECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Maximum wait time for answer">
            <Input
              type="number"
              min={1}
              max={300}
              value={minWaitDurationForAnswer}
              onChange={(e) => setMinWaitDurationForAnswer(Number(e.target.value))}
              required
            />
            <Hint>Range: 1-300 sec</Hint>
          </Field>
        </div>
      </FormSection>

      <FormSection title="AI Agent Context">
        {mode === 'edit' && campaignId ? (
          <AiContextEditor campaignId={campaignId} />
        ) : (
          <>
            <Hint>
              Describe what this campaign is about so the AI bot knows how to talk to
              contacts — industry, product, tone, key talking points. Combined with each
              contact's own reason at call time. Saved once the campaign is created.
            </Hint>
            <Textarea
              rows={4}
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              placeholder="e.g. This is a car insurance renewal reminder campaign for Ghanaian customers. Be warm, concise, and quote amounts in GHS."
            />
          </>
        )}
      </FormSection>

      <div className="flex gap-2">
        {mode === 'edit' && onCancel && (
          <Btn type="button" kind="ghost" onClick={onCancel} disabled={submitting}>
            Close
          </Btn>
        )}
        <Btn type="submit" disabled={submitting}>
          {submitting
            ? mode === 'create'
              ? 'Creating…'
              : 'Updating…'
            : mode === 'create'
              ? 'Create campaign'
              : 'Update'}
        </Btn>
      </div>
    </form>
  );
}

/**
 * Industry/use-case context for the AI bot, independent of the rest of the
 * campaign form so it can be saved on its own (same pattern as the campaign
 * "recommendation" field on the report page) — merged into every call's
 * metadata alongside the per-contact reason, see outreach-dial.service.ts.
 */
function AiContextEditor({ campaignId }: { campaignId: string }) {
  const { data, error, loading } = useLoad(
    () => api.getAiContext(campaignId),
    `ai-context-${campaignId}`,
  );
  const [aiContext, setAiContext] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setAiContext(data.aiContext ?? '');
  }, [data]);

  function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    api
      .setAiContext(campaignId, aiContext)
      .then(() => setSaved(true))
      .catch((err: Error) => setSaveError(err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div>
      <Hint>
        Describe what this campaign is about so the AI bot knows how to talk to contacts —
        industry, product, tone, key talking points. Combined with each contact's own reason at
        call time.
      </Hint>
      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      <Textarea
        rows={4}
        value={aiContext}
        onChange={(e) => setAiContext(e.target.value)}
        placeholder="e.g. This is a car insurance renewal reminder campaign for Ghanaian customers. Be warm, concise, and quote amounts in GHS."
      />
      {saved && <p className="mt-2 text-sm text-green-700">AI context saved.</p>}
      <ErrorBanner error={saveError} />
      <div className="mt-2">
        <Btn type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save AI context'}
        </Btn>
      </div>
    </div>
  );
}

/** Matches LiveHub's own Campaign Status vocabulary + dot colors. */
const CAMPAIGN_STATUS_DOT: Record<string, string> = {
  'Not-started': 'bg-gray-400',
  'In-progress': 'bg-blue-500',
  Locked: 'bg-red-400',
  Completed: 'bg-green-500',
};

function campaignStatusDotColor(status: string) {
  return CAMPAIGN_STATUS_DOT[status] ?? 'bg-gray-400';
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/** 0-100, how far through the campaign's date range "today" falls. */
function durationProgressPct(beginningDate: string, endingDate: string): number {
  const start = new Date(beginningDate).getTime();
  const end = new Date(endingDate).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

/** LiveHub-style "Campaign Summary" bar: a title, colored-dot counts, and a Total. */
function SummaryBar({
  title,
  items,
  total,
}: {
  title: string;
  items: { label: string; count: number; dot: string }[];
  total: number;
}) {
  return (
    <div className="card-surface mb-6 p-5">
      <h2 className="mb-3 text-sm font-semibold text-primary">{title}</h2>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground">
        {items.map((it, i) => (
          <span key={it.label} className="flex items-center gap-4">
            {i > 0 && <span className="hidden h-4 w-px bg-border sm:inline" />}
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${it.dot}`} />
              {it.label} ({it.count})
            </span>
          </span>
        ))}
        <span className="flex items-center gap-4">
          <span className="hidden h-4 w-px bg-border sm:inline" />
          <span className="font-medium text-primary">Total ({total})</span>
        </span>
      </div>
    </div>
  );
}

function CampaignSummaryBar({ campaigns }: { campaigns: Campaign[] }) {
  const counts = { notStarted: 0, inProgress: 0, locked: 0, completed: 0 };
  for (const c of campaigns) {
    if (c.status.campaignStatus === 'Not-started') counts.notStarted += 1;
    else if (c.status.campaignStatus === 'In-progress') counts.inProgress += 1;
    else if (c.status.campaignStatus === 'Locked') counts.locked += 1;
    else if (c.status.campaignStatus === 'Completed') counts.completed += 1;
  }
  return (
    <SummaryBar
      title="Campaign Summary"
      total={campaigns.length}
      items={[
        { label: 'Not Started', count: counts.notStarted, dot: 'bg-gray-400' },
        { label: 'In Progress', count: counts.inProgress, dot: 'bg-blue-500' },
        { label: 'Locked', count: counts.locked, dot: 'bg-red-400' },
        { label: 'Completed', count: counts.completed, dot: 'bg-green-500' },
      ]}
    />
  );
}

function CampaignRow({
  campaign,
  expanded,
  onToggle,
}: {
  campaign: Campaign;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { schedulerSettings: s, status: st } = campaign;
  const durationPct = durationProgressPct(s.beginningDate, s.endingDate);
  const total = st.targetsEnabled;
  const successPct = total > 0 ? (st.targetsAnswered / total) * 100 : 0;
  const failPct = total > 0 ? (st.targetsFailed / total) * 100 : 0;
  const overallPct = total > 0 ? Math.round((st.targetsCompleted / total) * 100) : 0;

  return (
    <tr
      onClick={onToggle}
      className={`cursor-pointer border-t border-border transition-colors ${
        expanded ? 'bg-accent' : 'hover:bg-secondary'
      }`}
    >
        <td className="px-5 py-4 font-medium text-foreground">{campaign.campaignName}</td>
        <td className="px-5 py-4">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <span className={`size-2 rounded-full ${campaignStatusDotColor(st.campaignStatus)}`} />
            {st.campaignStatus}
          </span>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="shrink-0">{formatShortDate(s.beginningDate)}</span>
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${durationPct}%` }}
              />
            </span>
            <span className="shrink-0">{formatShortDate(s.endingDate)}</span>
          </div>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 shrink-0 text-xs font-medium text-primary">{overallPct}%</span>
            <span className="h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
              <span className="flex h-full">
                <span className="block h-full bg-green-500" style={{ width: `${successPct}%` }} />
                <span className="block h-full bg-red-400" style={{ width: `${failPct}%` }} />
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{total}</span>
          </div>
        </td>
        <td className="px-5 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/outreach/campaigns/${campaign.campaignID}/report`);
              }}
              title="View report"
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <FileText className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              title="Manage campaign"
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        </td>
    </tr>
  );
}

export function CampaignsPage() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(
    () => api.campaigns().then((d) => d.campaigns),
    'campaigns-page',
    20000,
  );

  const campaigns = data ?? [];
  const filtered = search.trim()
    ? campaigns.filter((c) =>
        c.campaignName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : campaigns;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Manage campaigns that trigger and schedule outbound calls from your agents.
      </p>

      <CampaignSummaryBar campaigns={campaigns} />

      {showForm && (
        <div className="card-surface mb-6 p-6">
          <CampaignForm
            mode="create"
            onSaved={() => {
              setShowForm(false);
              reload();
            }}
          />
        </div>
      )}

      <ErrorBanner error={error} />

      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button
            type="button"
            title="Filter"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {loading ? 'Refreshing…' : 'Refreshes automatically every 20s'}
          </span>
          <Btn
            kind={showForm ? 'ghost' : 'primary'}
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto flex items-center gap-1.5"
          >
            {!showForm && <Plus className="size-4" />}
            {showForm ? 'Cancel' : 'Add new campaign'}
          </Btn>
        </div>

        {!loading && filtered.length === 0 && !error && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {campaigns.length === 0
              ? 'No campaigns yet. Click "Add new campaign" to create one.'
              : 'No campaigns match your search.'}
          </p>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                    Campaign Name
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                    Campaign Status
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                    Campaign Duration
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                    Target Progress
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CampaignRow
                    key={c.campaignID}
                    campaign={c}
                    expanded={expandedId === c.campaignID}
                    onToggle={() =>
                      setExpandedId((cur) => (cur === c.campaignID ? null : c.campaignID))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {expandedId && (
        <Modal onClose={() => setExpandedId(null)}>
          <CampaignEditPanel
            campaignId={expandedId}
            onClose={() => setExpandedId(null)}
            onDeleted={() => {
              setExpandedId(null);
              reload();
            }}
            onUpdated={reload}
          />
        </Modal>
      )}
    </div>
  );
}

export function DoNotCallPage() {
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    api
      .addDnc(phone.trim(), reason.trim() || undefined)
      .then(() => {
        setMsg(`${phone} added to the do-not-call list.`);
        setPhone('');
        setReason('');
      })
      .catch((err: Error) => setError(err.message));
  }

  return (
    <div className="max-w-2xl">
      {(error || msg) && (
        <div className="mb-4">
          <ErrorBanner error={error || msg} />
        </div>
      )}
      <form onSubmit={submit} className="card-surface flex flex-wrap items-end gap-3 p-6">
        <div className="min-w-48 flex-1">
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
        </div>
        <div className="min-w-48 flex-1">
          <Field label="Reason (optional)">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <Btn type="submit">Add</Btn>
      </form>
    </div>
  );
}
