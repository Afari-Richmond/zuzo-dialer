export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.errorCode || 'ERROR', body.message || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- auth ---
export type TenantActor = { tenantId: string; tenantUserId: string; role: 'tenant_admin' | 'agent' };

export const auth = {
  login: (email: string, password: string) =>
    request<{ ok: true }>('/tenant/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/tenant/auth/logout', { method: 'POST' }),
  me: () => request<TenantActor>('/tenant/auth/me'),
};

// --- campaigns ---
export type Campaign = {
  id: string;
  tenantId: string;
  name: string;
  credentialId: string;
  providerCampaignId: string | null;
  status: 'draft' | 'scheduled' | 'running' | 'locked' | 'completed' | 'deleted';
  schedule: Record<string, unknown>;
  defaultBotId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignStats = { total: number; queued: number; completed: number; failed: number; dnc: number };

export type CampaignTarget = {
  id: string;
  campaignId: string;
  phone: string;
  name: string | null;
  reasonNotes: string | null;
  providerTargetId: string | null;
  enabled: boolean;
  status: string;
  attemptNumber: number;
  startedAt: string | null;
  lastError: string | null;
};

export type ReportRow = {
  targetId: string;
  phone: string;
  name: string | null;
  reasonNotes: string | null;
  status: string;
  attemptNumber: number;
  lastError: string | null;
  startedAt: string | null;
  outcome: string | null;
  nextStep: string | null;
  notes: string | null;
  loggedAt: string | null;
};

export type CampaignReport = {
  campaignId: string;
  campaignName: string;
  totalContacts: number;
  statusCounts: Record<string, number>;
  rows: ReportRow[];
  outcomeCounts: Record<string, number>;
  reviewedCount: number;
  needsFollowUp: number;
  recommendation: string | null;
};

export const campaigns = {
  list: () => request<{ campaigns: Campaign[] }>('/tenant/campaigns'),
  get: (id: string) => request<{ campaign: Campaign }>(`/tenant/campaigns/${id}`),
  stats: (id: string) => request<CampaignStats>(`/tenant/campaigns/${id}/stats`),
  create: (dto: { name: string; credentialId: string }) =>
    request<{ campaign: Campaign }>('/tenant/campaigns', { method: 'POST', body: JSON.stringify(dto) }),
  start: (id: string) => request<{ campaign: Campaign }>(`/tenant/campaigns/${id}/start`, { method: 'POST' }),
  pause: (id: string) => request<{ campaign: Campaign }>(`/tenant/campaigns/${id}/pause`, { method: 'POST' }),
  remove: (id: string) => request<{ ok: true }>(`/tenant/campaigns/${id}`, { method: 'DELETE' }),
  drain: (id: string) => request<{ processed: number }>(`/tenant/campaigns/${id}/drain`, { method: 'POST' }),
  targets: (id: string) => request<{ targets: CampaignTarget[] }>(`/tenant/campaigns/${id}/targets`),
  setTargetEnabled: (id: string, targetId: string, enabled: boolean) =>
    request<{ target: CampaignTarget }>(`/tenant/campaigns/${id}/targets/${targetId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  report: (id: string) => request<CampaignReport>(`/tenant/campaigns/${id}/report`),
  exportReportUrl: (id: string) => `/api/v1/tenant/campaigns/${id}/report/export`,
  upsertOutcome: (
    id: string,
    targetId: string,
    dto: { outcome?: string; nextStep?: string; notes?: string },
  ) =>
    request<{ ok: true }>(`/tenant/campaigns/${id}/targets/${targetId}/outcome`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  setRecommendation: (id: string, recommendation: string) =>
    request<{ ok: true }>(`/tenant/campaigns/${id}/recommendation`, {
      method: 'PUT',
      body: JSON.stringify({ recommendation }),
    }),
  uploadContacts: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ accepted: number; rejected: number; results: unknown[] }>(
      `/tenant/campaigns/${id}/contacts/upload`,
      { method: 'POST', body: form },
    );
  },
};

// --- dnc ---
export type DncEntry = { id: string; phone: string; reason: string | null; source: string; createdAt: string };

export const dnc = {
  list: () => request<{ entries: DncEntry[] }>('/tenant/dnc'),
  add: (phone: string, reason?: string) =>
    request<{ entry: DncEntry }>('/tenant/dnc', { method: 'POST', body: JSON.stringify({ phone, reason }) }),
  remove: (id: string) => request<{ ok: true }>(`/tenant/dnc/${id}`, { method: 'DELETE' }),
};

// --- telephony credentials ---
export type TelephonyCredential = {
  id: string;
  provider: 'stub' | 'twilio' | 'africastalking' | 'livehub';
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const credentials = {
  list: () => request<{ credentials: TelephonyCredential[] }>('/tenant/telephony-credentials'),
  upsert: (dto: { provider: string; label: string; credentials: Record<string, string> }) =>
    request<{ credential: TelephonyCredential }>('/tenant/telephony-credentials', {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  deactivate: (id: string) => request<{ ok: true }>(`/tenant/telephony-credentials/${id}`, { method: 'DELETE' }),
};

// --- team ---
export type TeamMember = {
  id: string;
  email: string;
  displayName: string;
  role: 'tenant_admin' | 'agent';
  status: 'active' | 'invited' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
};

export const team = {
  list: () => request<{ members: TeamMember[] }>('/tenant/team'),
  invite: (dto: { email: string; displayName: string; role: 'tenant_admin' | 'agent' }) =>
    request<{ user: TeamMember; tempPassword: string }>('/tenant/team/invite', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: { role?: string; status?: string }) =>
    request<{ member: TeamMember }>(`/tenant/team/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
};
