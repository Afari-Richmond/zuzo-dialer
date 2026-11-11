import { useEffect, useState, type FormEvent } from 'react';
import { aiAgentApi, credentialsApi, teamApi, ApiError } from './api';
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

      <h2 className="mb-1.5 mt-8 text-sm font-semibold text-foreground">AI Agent</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Everything below is read live from your AudioCodes LiveHub account and saved straight
        back to it — there's no separate local setting.
      </p>
      <AiAgentSection />

      <div className="card-surface mt-6 p-6">
        <h2 className="mb-1.5 text-sm font-semibold text-foreground">Voice &amp; Speech</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Voice and speech-provider settings — including ElevenLabs and your own cloned voices —
          are configured per bot connection in the AudioCodes LiveHub dashboard; there's no API
          for it yet, so this isn't duplicated here.
        </p>
        <a
          href="https://livehub.audiocodes.io/portal/dashboard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Open LiveHub dashboard ↗
        </a>
      </div>
    </div>
  );
}

/**
 * A thin proxy onto LiveHub's AI Agents framework, not a local setting: the
 * agent list, the current model, and the list of available models are all
 * fetched live from AudioCodes every time this mounts, and saving writes
 * straight back to the same LiveHub account via AiAgentService on the API
 * side.
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

      {config?.agentId && <AiAgentModelPicker key={config.agentId} />}
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
          {saved && <p className="mt-2 text-sm text-green-700">Model saved to AudioCodes.</p>}
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
