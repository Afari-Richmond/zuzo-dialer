import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { aiAgentApi, credentialsApi, teamApi, ApiError } from './api';
import { Btn, ErrorBanner, Field, Input, Select, Table, Textarea, useLoad } from './ui';

/**
 * New pages with no equivalent in the original single-tenant app, which used
 * one global env-var LiveHub credential and one shared dashboard password.
 * Styled with the same ui.tsx primitives as the ported pages so they read as
 * part of the same app rather than a bolted-on admin panel.
 */

const PROVIDER_LABELS: Record<string, string> = {
  stub: 'Stub (demo)',
  twilio: 'Twilio',
  africastalking: "Africa's Talking",
  livehub: 'Voice AI (Advanced)',
};

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
                <option value="livehub">Voice AI (Advanced)</option>
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
              <td className="px-5 py-3.5 text-muted-foreground">{PROVIDER_LABELS[c.provider] ?? c.provider}</td>
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

      <h2 className="mb-1.5 mt-8 text-sm font-semibold text-foreground">AI Agent</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Everything below is read live from your voice AI platform and saved straight back to
        it — there's no separate local setting.
      </p>
      <AiAgentSection />
    </div>
  );
}

/**
 * A thin proxy onto the voice AI platform's agent framework, not a local
 * setting: the agent list, the current model, and the list of available
 * models are all fetched live every time this mounts, and saving writes
 * straight back to the same account via AiAgentService on the API side.
 */
function AiAgentSection() {
  const { data: config, error: configError, loading: configLoading, reload: reloadConfig } = useLoad(
    () => aiAgentApi.getConfig(),
    'ai-agent-config',
  );
  const { data: agentsData, error: agentsError } = useLoad(
    () => aiAgentApi.listAgents(),
    'ai-agent-agents',
  );
  const [agentId, setAgentId] = useState('');
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentSaveError, setAgentSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (config) setAgentId(config.agentId ?? '');
  }, [config]);

  function saveAgent() {
    if (!agentId) return;
    setAgentSaving(true);
    setAgentSaveError(null);
    aiAgentApi
      .setAgent(agentId)
      .then(() => reloadConfig())
      .catch((err: Error) => setAgentSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setAgentSaving(false));
  }

  return (
    <div className="card-surface grid gap-4 p-6">
      {configLoading && !config && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={configError} />
      <ErrorBanner error={agentsError} />

      <Field label="Agent">
        <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          <option value="">— select the AI Agent behind this tenant's bot —</option>
          {(agentsData?.agents ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <Btn type="button" onClick={saveAgent} disabled={agentSaving || !agentId}>
          {agentSaving ? 'Saving…' : 'Save agent'}
        </Btn>
        <ErrorBanner error={agentSaveError} />
      </div>

      {config?.agentId && (
        <>
          <AiAgentModelPicker key={`model-${config.agentId}`} />
          <AiAgentPromptEditor key={`prompt-${config.agentId}`} />
          <AiAgentDocumentsSection key={`docs-${config.agentId}`} />
          <AiAgentToolsSection key={`tools-${config.agentId}`} />
        </>
      )}
    </div>
  );
}

function AiAgentPromptEditor() {
  const { data, error, loading, reload } = useLoad(() => aiAgentApi.getPrompt(), 'ai-agent-prompt');
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setPrompt(data.prompt);
  }, [data]);

  function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    aiAgentApi
      .setPrompt(prompt)
      .then(() => {
        setSaved(true);
        reload();
      })
      .catch((err: Error) => setSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="border-t border-border pt-4">
      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {data && (
        <>
          <Field label="System prompt">
            <Textarea
              rows={8}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setSaved(false);
              }}
              placeholder="Leave empty to run on the platform's default prompt…"
            />
          </Field>
          <p className="mt-1.5 text-xs text-muted-foreground">
            This defines how your AI agent behaves on every call. Use <code>{'{variable}'}</code> to reference
            campaign variables.
          </p>
          {saved && <p className="mt-2 text-sm text-green-700">Prompt saved.</p>}
          <div className="mt-2">
            <Btn type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save prompt'}
            </Btn>
            <ErrorBanner error={saveError} />
          </div>
        </>
      )}
    </div>
  );
}

function AiAgentDocumentsSection() {
  const { data, error, loading, reload } = useLoad(() => aiAgentApi.listDocuments(), 'ai-agent-documents');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    if (!name.trim()) {
      setUploadError('Give the document a name first');
      return;
    }
    setUploading(true);
    setUploadError(null);
    aiAgentApi
      .uploadDocument(name.trim(), description.trim(), file)
      .then(() => {
        setName('');
        setDescription('');
        reload();
      })
      .catch((err: Error) => setUploadError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setUploading(false));
  }

  function remove(id: string) {
    setDeletingId(id);
    aiAgentApi
      .deleteDocument(id)
      .then(() => reload())
      .finally(() => setDeletingId(null));
  }

  const documents = data?.documents ?? [];

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Knowledge base</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Documents your AI agent can search while on a call — policy documents, FAQs, pricing sheets.
      </p>
      <ErrorBanner error={error} />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-input p-4">
        <div className="min-w-40 flex-1">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Policy FAQ" />
          </Field>
        </div>
        <div className="min-w-40 flex-1">
          <Field label="Description (optional)">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = '';
          }}
        />
        <Btn
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <Upload className="size-4" />
          {uploading ? 'Uploading…' : 'Upload file'}
        </Btn>
      </div>
      <ErrorBanner error={uploadError} />

      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      {documents.length === 0 && !loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
      )}
      {documents.length > 0 && (
        <Table headers={['Name', 'Status', 'Files', 'Chunks', '']}>
          {documents.map((d) => (
            <tr key={d.id} className="border-t border-border">
              <td className="px-5 py-3.5">
                <div className="font-medium text-foreground">{d.name}</div>
                {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
              </td>
              <td className="px-5 py-3.5 text-muted-foreground">{d.status}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{d.nFiles}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{d.nChunks}</td>
              <td className="px-5 py-3.5 text-right">
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  disabled={deletingId === d.id}
                  title="Delete document"
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

const TOOL_TYPE_LABELS: Record<string, string> = {
  rest: 'REST webhook',
  mcp: 'MCP',
  flow: 'Flow',
};

function AiAgentToolsSection() {
  const { data, error, loading } = useLoad(() => aiAgentApi.listTools(), 'ai-agent-tools');
  const tools = data?.tools ?? [];

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Tools</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Actions your AI agent can call during a conversation — read-only here, configured in your
        voice AI platform.
      </p>
      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />
      {tools.length === 0 && !loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">No tools configured.</p>
      )}
      {tools.length > 0 && (
        <Table headers={['Name', 'Type', 'Method', 'Description']}>
          {tools.map((t) => (
            <tr key={t.id} className="border-t border-border">
              <td className="px-5 py-3.5 font-medium text-foreground">{t.name}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{TOOL_TYPE_LABELS[t.type] ?? t.type}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{t.method ?? '—'}</td>
              <td className="max-w-xs truncate px-5 py-3.5 text-muted-foreground" title={t.description ?? undefined}>
                {t.description ?? '—'}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function AiAgentModelPicker() {
  const { data: current, error: currentError, loading: currentLoading, reload: reloadCurrent } = useLoad(
    () => aiAgentApi.getCurrent(),
    'ai-agent-current',
  );
  const { data: modelsData, error: modelsError } = useLoad(
    () => aiAgentApi.listModels(),
    'ai-agent-models',
  );
  const [llm, setLlm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (current) setLlm(current.llm ?? '');
  }, [current]);

  function saveModel() {
    if (!llm) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    aiAgentApi
      .setModel(llm)
      .then(() => {
        setSaved(true);
        reloadCurrent();
      })
      .catch((err: Error) => setSaveError(err instanceof ApiError ? err.message : err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="border-t border-border pt-4">
      {currentLoading && !current && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={currentError} />
      <ErrorBanner error={modelsError} />
      {current && (
        <>
          <Field label={`Model for "${current.name}"`}>
            <Select value={llm} onChange={(e) => setLlm(e.target.value)}>
              <option value="">— select a model —</option>
              {(modelsData?.models ?? []).map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                  {m.isRealtime ? ' (speech-to-speech)' : ''}
                  {m.latencyMs ? ` · ~${m.latencyMs}ms` : ''}
                </option>
              ))}
            </Select>
          </Field>
          {saved && <p className="mt-2 text-sm text-green-700">Model saved.</p>}
          <div className="mt-2">
            <Btn type="button" onClick={saveModel} disabled={saving || !llm}>
              {saving ? 'Saving…' : 'Save model'}
            </Btn>
            <ErrorBanner error={saveError} />
          </div>
        </>
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
