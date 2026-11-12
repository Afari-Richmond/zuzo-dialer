export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/${base}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as Envelope<T>;
  if (!json.success) {
    throw new ApiError(
      res.status,
      json.error?.code || 'ERROR',
      json.error?.message || 'Request failed',
    );
  }
  return json.data as T;
}

export type UploadResult = {
  accepted: number;
  rejected: number;
  results: {
    row: number;
    phone?: string;
    accepted: boolean;
    reason?: string;
    attempts?: number;
  }[];
};

export type OutboundAttempt = {
  id: string;
  campaign: string;
  phone: string;
  reason: string | null;
  policyNumber: string | null;
  status: string;
  attemptNumber: number;
  scheduledAt: string;
  startedAt: string | null;
  lastError: string | null;
};

export type Batch = { campaign: string; count: number };

export type AnalyticsOverview = {
  totals: { total: number; completed: number; failed: number; dnc: number; answerRate: number };
  dailyTrend: { date: string; count: number }[];
  outcomeBreakdown: { outcome: string; count: number }[];
};

export type MachineDetection = 'Disabled' | 'Disconnect' | 'Notify Answer Machine';

export type Campaign = {
  campaignID: string;
  campaignName: string;
  defaultBotName: string;
  defaultBotDisplayName: string;
  maxRetries: number;
  adminState: 'Locked' | 'Unlocked';
  detectionCapabilities: {
    minWaitDurationForAnswer: number;
    machineDetection: MachineDetection;
    answerMachineBeepTimeout: number;
  };
  schedulerSettings: {
    maxCps: number;
    maxConcurrentCalls: number;
    minDurationBetweenRetries: number;
    timeZone: string;
    beginningDate: string;
    endingDate: string;
    daysOfWeek: string[];
    startLocalTime: string;
    stopLocalTime: string;
  };
  status: {
    campaignStatus: string;
    targetsEnabled: number;
    targetsCompleted: number;
    targetsAnswered: number;
    targetsFailed: number;
  };
};

export type CampaignTarget = {
  targetID: string;
  setting: {
    enabled: boolean;
    targetNumber: string;
    botDisplayName: string | null;
  };
  status: {
    status: string;
    lastFailureReason: string | null;
    lastCallTime: string | null;
    numOfRetries: number;
  };
};

export type CampaignOutcome =
  | 'interested'
  | 'not_interested'
  | 'callback_requested'
  | 'wrong_number'
  | 'converted'
  | 'no_decision_yet'
  | 'other';

export type CampaignNextStep =
  | 'schedule_follow_up'
  | 'send_email_sms'
  | 'escalate_to_agent'
  | 'add_to_dnc'
  | 'no_action_needed';

export type CampaignReportRow = {
  targetId: string;
  phone: string;
  name: string | null;
  reason: string | null;
  status: string;
  lastFailureReason: string | null;
  lastCallTime: string | null;
  numOfRetries: number;
  outcome: CampaignOutcome | null;
  nextStep: CampaignNextStep | null;
  notes: string | null;
  updatedAt: string | null;
  call: {
    callId: string;
    conversationId: string | null;
    setupTime: string;
    durationSeconds: number;
    successful: boolean;
    terminationDescription: string | null;
  } | null;
  aiSuggestion: {
    outcome: string | null;
    nextStep: string | null;
    summary: string | null;
  } | null;
};

export type CampaignReport = {
  campaignId: string;
  campaignName: string;
  summary: CampaignOverview;
  rows: CampaignReportRow[];
  outcomeCounts: Partial<Record<CampaignOutcome, number>>;
  reviewedCount: number;
  needsFollowUp: number;
  recommendation: string | null;
};

export type ConversationTranscriptEntry = {
  time: string | null;
  taskName: string | null;
  fromName: string;
  toName: string | null;
  message: string;
  label: string;
  type: string | null;
};

export type ConversationTranscript = {
  id: string;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  caller: string | null;
  callee: string | null;
  terminationReason: string | null;
  history: ConversationTranscriptEntry[];
};

export type PostCallAnalysisDetail = {
  name: string;
  type: string | null;
  time: string | null;
  data: Record<string, unknown>;
};

export type CreateCampaignInput = {
  campaignName: string;
  defaultBotName?: string;
  timeZone: string;
  startLocalTime: string;
  stopLocalTime: string;
  daysOfWeek: string[];
  beginningDate: string;
  endingDate: string;
  maxCps: number;
  maxConcurrentCalls: number;
  maxRetries: number;
  minDurationBetweenRetries: number;
  minWaitDurationForAnswer: number;
  machineDetection: MachineDetection;
  lockOnCreate?: boolean;
};

export type UpdateCampaignInput = Omit<CreateCampaignInput, 'campaignName' | 'lockOnCreate'> & {
  locked: boolean;
};

export type CampaignOverview = {
  campaignId: string;
  campaignName: string;
  adminState: 'Locked' | 'Unlocked';
  campaignStatus: string;
  targetsEnabled: number;
  targetsCompleted: number;
  targetsAnswered: number;
  targetsFailed: number;
  statistics: {
    targetStatistics: {
      enabledTargets: number;
      disabledTargets: number;
      completed: {
        dialerFailure: number;
        answeredBotFailure: number;
        answeredBotSuccess: number;
        answeredSuccess: number;
      };
      notCompleted: {
        notInitiated: number;
        duringCall: number;
        rescheduled: number;
      };
    };
    callsStatistics: {
      totalCallsGenerated: number;
      callsRescheduled: {
        noAnswer: number;
        faxOrAnswerMachine: number;
        busy: number;
        declined: number;
        botConnectivityError: number;
        systemCAC: number;
        unspecifiedError: number;
      };
    };
  };
};

export type CallNowResult = {
  accepted: boolean;
  reason?: string;
  phone?: string;
  attempt?: OutboundAttempt;
  dial?: {
    dialed: boolean;
    reason?: string;
    callId?: string;
    identityPrompt?: string;
    error?: string;
  };
};

export const api = {
  // Real per-tenant account auth (bcrypt + JWT), not the old shared-password
  // scheme — the only deliberate deviation from the original app's api.ts.
  me: () => request<{ role: string }>('tenant/auth', '/me'),
  login: (email: string, password: string) =>
    request<{ ok: boolean }>('tenant/auth', '/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('tenant/auth', '/logout', { method: 'POST' }),
  acceptInvite: (token: string, password: string) =>
    request<{ ok: boolean }>('tenant/auth', '/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean }>('tenant/auth', '/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>('tenant/auth', '/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('tenant/auth', '/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  upload: (batch: string, file: File, scheduledAt?: string, liveHubCampaignId?: string) => {
    const form = new FormData();
    form.append('batch', batch);
    form.append('file', file);
    if (scheduledAt) form.append('scheduledAt', scheduledAt);
    if (liveHubCampaignId) form.append('liveHubCampaignId', liveHubCampaignId);
    return request<UploadResult>('outreach', '/upload', {
      method: 'POST',
      body: form,
    });
  },
  attempts: (campaign?: string, status?: string) =>
    request<{ attempts: OutboundAttempt[] }>(
      'outreach',
      `/attempts?${new URLSearchParams({
        ...(campaign ? { campaign } : {}),
        ...(status ? { status } : {}),
      }).toString()}`,
    ),
  batches: () => request<{ batches: Batch[] }>('outreach', '/batches'),
  campaigns: () => request<{ campaigns: Campaign[] }>('outreach', '/campaigns'),
  timezones: () =>
    request<{ timezones: { timezone: string; offset: string }[] }>(
      'outreach',
      '/campaigns/timezones',
    ),
  bots: () =>
    request<{ bots: { botName: string; botDisplayName: string }[] }>(
      'outreach',
      '/campaigns/bots',
    ),
  createCampaign: (input: CreateCampaignInput) =>
    request<Campaign>('outreach', '/campaigns', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getCampaign: (id: string) => request<Campaign>('outreach', `/campaigns/${id}`),
  updateCampaign: (id: string, input: UpdateCampaignInput) =>
    request<Campaign>('outreach', `/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  campaignStats: (id: string) =>
    request<CampaignOverview>('outreach', `/campaigns/${id}/stats`),
  pauseCampaign: (id: string) =>
    request<{ locked: boolean }>('outreach', `/campaigns/${id}/pause`, { method: 'POST' }),
  resumeCampaign: (id: string) =>
    request<{ locked: boolean }>('outreach', `/campaigns/${id}/resume`, { method: 'POST' }),
  deleteCampaign: (id: string) =>
    request<{ deleted: boolean }>('outreach', `/campaigns/${id}`, { method: 'DELETE' }),
  campaignTargets: (id: string) =>
    request<{ targets: CampaignTarget[] }>('outreach', `/campaigns/${id}/targets`),
  addTarget: (campaignId: string, input: { targetNumber: string; tag?: string; reason?: string }) =>
    request<{ targetId?: string }>('outreach', `/campaigns/${campaignId}/targets`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  importTargets: (campaignId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadResult>('outreach', `/campaigns/${campaignId}/targets/import`, {
      method: 'POST',
      body: form,
    });
  },
  enableTarget: (campaignId: string, targetId: string) =>
    request<{ enabled: boolean }>(
      'outreach',
      `/campaigns/${campaignId}/targets/${targetId}/enable`,
      { method: 'POST' },
    ),
  disableTarget: (campaignId: string, targetId: string) =>
    request<{ enabled: boolean }>(
      'outreach',
      `/campaigns/${campaignId}/targets/${targetId}/disable`,
      { method: 'POST' },
    ),
  campaignReport: (id: string) => request<CampaignReport>('outreach', `/campaigns/${id}/report`),
  conversationTranscript: (conversationId: string) =>
    request<ConversationTranscript>('outreach', `/calls/${conversationId}/transcript`),
  fullCallAnalysis: (conversationId: string) =>
    request<{ results: PostCallAnalysisDetail[] }>('outreach', `/calls/${conversationId}/analysis`),
  upsertOutcome: (
    campaignId: string,
    targetId: string,
    input: {
      phone: string;
      outcome?: CampaignOutcome;
      nextStep?: CampaignNextStep;
      notes?: string;
    },
  ) =>
    request<{ ok: boolean }>('outreach', `/campaigns/${campaignId}/outcomes/${targetId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  setRecommendation: (campaignId: string, recommendation: string) =>
    request<{ ok: boolean }>('outreach', `/campaigns/${campaignId}/recommendation`, {
      method: 'PUT',
      body: JSON.stringify({ recommendation }),
    }),
  getAiContext: (campaignId: string) =>
    request<{ aiContext: string | null }>('outreach', `/campaigns/${campaignId}/ai-context`),
  setAiContext: (campaignId: string, aiContext: string) =>
    request<{ aiContext: string }>('outreach', `/campaigns/${campaignId}/ai-context`, {
      method: 'PUT',
      body: JSON.stringify({ aiContext }),
    }),
  addDnc: (phone: string, reason?: string) =>
    request<{ phone: string; dnc: boolean }>('outreach', '/dnc', {
      method: 'POST',
      body: JSON.stringify({ phone, reason }),
    }),
  analyticsOverview: (from?: string, to?: string) =>
    request<AnalyticsOverview>(
      'outreach',
      `/analytics/overview?${new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }).toString()}`,
    ),
  callNow: (phone: string, reason?: string, liveHubCampaignId?: string, instant?: boolean) =>
    request<CallNowResult>('outreach', '/call-now', {
      method: 'POST',
      body: JSON.stringify({ phone, reason, liveHubCampaignId, instant }),
    }),
};

// --- telephony credentials + team: new multitenancy infra with no
// equivalent in the original single-tenant app (which used one global env-
// var credential and one shared dashboard password) — same envelope/base
// pattern as everything above, just a different route prefix. ---

export type TelephonyCredential = {
  id: string;
  provider: 'stub' | 'twilio' | 'africastalking' | 'livehub';
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantBranding = { logoUrl: string | null; primaryColor: string | null };
export type TenantBrandingWithName = TenantBranding & { name: string };

export const brandingApi = {
  get: () => request<TenantBrandingWithName>('tenant/branding', ''),
  update: (dto: { logoUrl?: string; primaryColor?: string }) =>
    request<TenantBranding>('tenant/branding', '', { method: 'PUT', body: JSON.stringify(dto) }),
};

export const credentialsApi = {
  list: () => request<{ credentials: TelephonyCredential[] }>('tenant/telephony-credentials', ''),
  upsert: (dto: { provider: string; label: string; credentials: Record<string, string> }) =>
    request<{ credential: TelephonyCredential }>('tenant/telephony-credentials', '', {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  deactivate: (id: string) =>
    request<{ ok: boolean }>('tenant/telephony-credentials', `/${id}`, { method: 'DELETE' }),
};

export type AiAgentSummary = { id: string; name: string };
export type AiAgentDetail = AiAgentSummary & { llm: string | null };
export type AiAgentModel = { name: string; isRealtime: boolean; latencyMs: number | null };
export type KnowledgeDocument = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  fileNames: string[];
  nFiles: number;
  nChunks: number;
  nTokens: number;
  createdAt: string | null;
};
export type AgentTool = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  method: string | null;
  url: string | null;
};

export const aiAgentApi = {
  getConfig: () => request<{ agentId: string | null }>('tenant/ai-agent', '/config'),
  setAgent: (agentId: string) =>
    request<{ agentId: string }>('tenant/ai-agent', '/config', {
      method: 'PUT',
      body: JSON.stringify({ agentId }),
    }),
  listAgents: () => request<{ agents: AiAgentSummary[] }>('tenant/ai-agent', '/agents'),
  listModels: () => request<{ models: AiAgentModel[] }>('tenant/ai-agent', '/models'),
  getCurrent: () => request<AiAgentDetail>('tenant/ai-agent', '/current'),
  setModel: (llm: string) =>
    request<AiAgentDetail>('tenant/ai-agent', '/model', {
      method: 'PUT',
      body: JSON.stringify({ llm }),
    }),
  getPrompt: () => request<{ prompt: string }>('tenant/ai-agent', '/prompt'),
  setPrompt: (prompt: string) =>
    request<{ prompt: string }>('tenant/ai-agent', '/prompt', {
      method: 'PUT',
      body: JSON.stringify({ prompt }),
    }),
  listDocuments: () => request<{ documents: KnowledgeDocument[] }>('tenant/ai-agent', '/documents'),
  uploadDocument: (name: string, description: string, file: File) => {
    const form = new FormData();
    form.append('name', name);
    if (description) form.append('description', description);
    form.append('file', file);
    return request<KnowledgeDocument>('tenant/ai-agent', '/documents', { method: 'POST', body: form });
  },
  deleteDocument: (id: string) =>
    request<{ ok: boolean }>('tenant/ai-agent', `/documents/${id}`, { method: 'DELETE' }),
  listTools: () => request<{ tools: AgentTool[] }>('tenant/ai-agent', '/tools'),
};

export type TeamMember = {
  id: string;
  email: string;
  displayName: string;
  role: 'tenant_admin' | 'agent';
  status: 'active' | 'invited' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
};

export const teamApi = {
  list: () => request<{ members: TeamMember[] }>('tenant/team', ''),
  invite: (dto: { email: string; displayName: string; role: 'tenant_admin' | 'agent' }) =>
    request<{ user: TeamMember }>('tenant/team', '/invite', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: { role?: string; status?: string }) =>
    request<{ member: TeamMember }>('tenant/team', `/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
