import {
  CallStatusEvent,
  InboundCallEvent,
  StartOutboundCallInput,
  TransferCallInput,
  VoiceProviderAdapter,
} from './voice-provider.adapter';
import type { LiveHubCredentials } from './credentials.types';
import { badRequest } from '../../../common/errors';

const BASE_URL = 'https://livehub.audiocodes.io';
const AI_AGENTS_PATH = '/ai-framework-management/api/v1';

export interface AiAgentSummary {
  id: string;
  name: string;
}

export interface AiAgentDetail extends AiAgentSummary {
  llm: string | null;
  prompt: string;
  documents: string[];
}

export interface AiAgentModel {
  name: string;
  isRealtime: boolean;
  latencyMs: number | null;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  description: string | null;
  status: string;
  fileNames: string[];
  nFiles: number;
  nChunks: number;
  nTokens: number;
  createdAt: string | null;
}

function toE164Ghana(local: string): string {
  const digits = local.replace(/\D/g, '');
  if (digits.startsWith('233')) return `+${digits}`;
  if (digits.startsWith('0')) return `+233${digits.slice(1)}`;
  return `+${digits}`;
}

interface Campaign {
  campaignID: string;
  campaignName: string;
}

export interface CampaignTarget {
  targetID: string;
  setting: {
    tag: string | null;
    enabled: boolean;
    botName: string | null;
    botDisplayName: string | null;
    targetNumber: string;
    callingNumber: string | null;
    botMetadata: string | null;
  };
  status: {
    status: string;
    lastFailureReason: string | null;
    lastCallTime: string | null;
    numOfRetries: number;
    botResultMetadata: unknown;
  };
}

export interface ReconciledTarget {
  targetId: string;
  outcome: 'success' | 'no_answer' | 'busy' | 'failed';
  failureReason: string | null;
  endedAt: Date | null;
  botResultMetadata: unknown;
}

export interface FullCampaign {
  campaignName: string;
  campaignID: string;
  detectionCapabilities: Record<string, unknown>;
  schedulerSettings: Record<string, unknown>;
  defaultBotName: string;
  defaultBotDisplayName: string;
  maxRetries: number;
  adminState: 'Locked' | 'Unlocked';
  status: {
    campaignStatus: string;
    timeTotalHours: number;
    timeProgressHours: number;
    targetsEnabled: number;
    targetsCompleted: number;
    targetsAnswered: number;
    targetsFailed: number;
  };
}

export interface CampaignStatistics {
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
}

export interface DialoutInput {
  botName: string;
  target: string;
  callerDisplayName?: string;
  notifyUrl?: string;
  metadata?: Record<string, unknown>;
  answerTimeoutSec?: number;
  machineDetection?: 'disabled' | 'disconnect' | 'detect';
  voicemailEndTimeoutSec?: number;
}

export interface DialoutResult {
  callId: string;
  conversationId: string;
}

export interface CallRecord {
  callId: string;
  botConversationId: string | null;
  campaignId: string | null;
  calledPhone: string;
  setupTime: string;
  endTime: string | null;
  durationSeconds: number;
  successful: boolean;
  terminationDescription: string | null;
  recorded: boolean;
}

export interface PostCallAnalysisResult {
  conversationId: string | null;
  time: string | null;
  outcome: string | null;
  nextStep: string | null;
  summary: string | null;
}

export interface PostCallAnalysisDetail {
  name: string;
  type: string | null;
  time: string | null;
  data: Record<string, unknown>;
}

export interface ConversationTranscriptEntry {
  time: string | null;
  taskName: string | null;
  fromName: string;
  toName: string | null;
  message: string;
  label: string;
  type: string | null;
}

export interface ConversationDetail {
  id: string;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  caller: string | null;
  callee: string | null;
  terminationReason: string | null;
  history: ConversationTranscriptEntry[];
}

export interface ToolSummary {
  id: string;
  name: string;
  description: string | null;
  type: string;
  method: string | null;
  url: string | null;
}

export interface CampaignOverview {
  campaignId: string;
  campaignName: string;
  adminState: 'Locked' | 'Unlocked';
  campaignStatus: string;
  targetsEnabled: number;
  targetsCompleted: number;
  targetsAnswered: number;
  targetsFailed: number;
  statistics: CampaignStatistics;
}

export interface CreateCampaignInput {
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
  machineDetection: 'Disabled' | 'Disconnect' | 'Notify Answer Machine';
  lockOnCreate?: boolean;
}

export interface UpdateCampaignInput {
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
  machineDetection: 'Disabled' | 'Disconnect' | 'Notify Answer Machine';
  locked: boolean;
}

const CAMPAIGN_NAME = 'Outreach';

// One instance per tenant (via VoiceAdapterFactoryService) — all caches below
// are correct to keep as instance state now, since they're scoped to one
// tenant's own LiveHub account instead of being a process-wide global.
export class LiveHubAdapter implements VoiceProviderAdapter {
  readonly name = 'livehub';

  private tokenCache: { token: string; expiresAt: number } | null = null;
  private campaignIdCache: string | null = null;
  private accountIdCache: string | null = null;

  constructor(private readonly creds: LiveHubCredentials) {}

  verifyWebhook(): boolean {
    return true;
  }

  parseInbound(payload: Record<string, unknown>): InboundCallEvent {
    return {
      provider: this.name,
      providerCallId: String(payload.callId || payload.providerCallId || ''),
      from: payload.from ? String(payload.from) : undefined,
      to: payload.to ? String(payload.to) : undefined,
      raw: payload,
    };
  }

  parseCallStatus(payload: Record<string, unknown>): CallStatusEvent {
    const raw = String(payload.status || 'in_progress').toLowerCase();
    const map: Record<string, CallStatusEvent['status']> = {
      answered: 'in_progress',
      failed: 'failed',
      completed: 'completed',
      no_answer: 'no_answer',
      busy: 'busy',
    };
    return {
      provider: this.name,
      providerCallId: String(payload.callId || ''),
      status: map[raw] ?? 'in_progress',
      answeredBy: 'unknown',
    };
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.token;
    }
    const res = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.creds.clientId,
        client_secret: this.creds.clientSecret,
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub oauth/token failed (${res.status}): ${bodyText}`);
    }
    const json = JSON.parse(bodyText) as { access_token: string; expires_in: number };
    this.tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  }

  /** Like request(), but for multipart/form-data bodies — fetch must set its
   * own Content-Type with the multipart boundary, so none is forced here. */
  private async requestMultipart(path: string, body: FormData): Promise<Response> {
    const token = await this.getToken();
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  private async getOrCreateCampaignId(): Promise<string> {
    if (this.campaignIdCache) return this.campaignIdCache;

    const listRes = await this.request(
      `/api/v1/campaignDialer/campaigns?campaignName=${encodeURIComponent(CAMPAIGN_NAME)}`,
    );
    const listBody = await listRes.text();
    if (!listRes.ok) {
      throw new Error(`LiveHub campaign lookup failed (${listRes.status}): ${listBody}`);
    }
    const listJson = JSON.parse(listBody || '{}') as Record<string, unknown>;
    const list = (listJson.docs ?? listJson.campaigns ?? listJson.items ?? []) as Campaign[];
    const existing = list.find((c) => c.campaignName === CAMPAIGN_NAME);
    if (existing) {
      this.campaignIdCache = existing.campaignID;
      return existing.campaignID;
    }

    const today = new Date();
    const beginningDate = today.toISOString().slice(0, 10);
    const farFuture = new Date(today);
    farFuture.setFullYear(farFuture.getFullYear() + 5);
    const endingDate = farFuture.toISOString().slice(0, 10);

    const createRes = await this.request('/api/v1/campaignDialer/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        campaignName: CAMPAIGN_NAME,
        defaultBotName: this.creds.outreachBotId,
        schedulerSettings: {
          maxCps: 1,
          maxConcurrentCalls: 5,
          timeZone: 'Africa/Accra',
          beginningDate,
          endingDate,
          daysOfWeek: ['Everyday'],
          minDurationBetweenRetries: 60,
          startLocalTime: '08:00',
          stopLocalTime: '18:00',
        },
        adminState: 'Unlocked',
      }),
    });
    const createBody = await createRes.text();
    if (!createRes.ok) {
      throw new Error(`LiveHub campaign create failed (${createRes.status}): ${createBody}`);
    }
    const createJson = JSON.parse(createBody) as { campaignID: string };
    this.campaignIdCache = createJson.campaignID;
    return createJson.campaignID;
  }

  async startOutboundCall(input: StartOutboundCallInput): Promise<{ providerCallId: string }> {
    const campaignId = input.campaignId ?? (await this.getOrCreateCampaignId());
    const target = toE164Ghana(input.to);
    const res = await this.request(`/api/v1/campaignDialer/campaigns/${campaignId}/targets`, {
      method: 'POST',
      body: JSON.stringify({
        targets: [
          {
            targetNumber: `tel:${target}`,
            callingNumber: 'Anonymous',
            botName: this.creds.outreachBotId,
            enabled: true,
            ...(input.metadata ? { botMetadata: JSON.stringify(input.metadata) } : {}),
          },
        ],
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub add-target failed (${res.status}) for ${target}: ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as
      | { result: string; targetID: string }[]
      | { targets: { result: string; targetID: string }[] };
    const entry = Array.isArray(parsed) ? parsed[0] : parsed.targets?.[0];
    if (!entry || entry.result !== 'Success') {
      throw new Error(`LiveHub target rejected for ${target}: ${bodyText}`);
    }
    return { providerCallId: entry.targetID };
  }

  async transfer(_input: TransferCallInput): Promise<void> {
    return;
  }

  /**
   * Adds one or more targets directly to a campaign's target list — the
   * "Add new target" / additive "Import" actions on LiveHub's own Target
   * List screen. Deliberately append-only: LiveHub's own Import endpoint
   * replaces every existing target on the campaign, which would wipe a live
   * campaign's real target list if used carelessly, so this always goes
   * through Add targets (POST, appends) instead.
   */
  async addTargetsToCampaign(
    campaignId: string,
    targets: { targetNumber: string; tag?: string; botName?: string; botMetadata?: string; enabled?: boolean }[],
  ): Promise<{ result: string; targetID?: string }[]> {
    const res = await this.request(`/api/v1/campaignDialer/campaigns/${campaignId}/targets`, {
      method: 'POST',
      body: JSON.stringify({
        targets: targets.map((t) => ({
          targetNumber: `tel:${toE164Ghana(t.targetNumber)}`,
          callingNumber: 'Anonymous',
          enabled: t.enabled ?? true,
          ...(t.tag ? { tag: t.tag } : {}),
          ...(t.botName ? { botName: t.botName } : {}),
          ...(t.botMetadata ? { botMetadata: t.botMetadata } : {}),
        })),
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub add-targets failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as
      | { result: string; targetID?: string }[]
      | { targets: { result: string; targetID?: string }[] };
    return Array.isArray(parsed) ? parsed : (parsed.targets ?? []);
  }

  /**
   * Campaign Dialer has no per-call status push and no single-target GET, so
   * reconciling 'dialing' attempts means listing every target on the given
   * campaign and matching on targetID (stored as providerCallId at dial
   * time). The API caps page size at 50 regardless of a larger `limit`.
   */
  async listCampaignTargets(campaignId: string): Promise<CampaignTarget[]> {
    const targets: CampaignTarget[] = [];
    let page = 1;
    for (;;) {
      const res = await this.request(
        `/api/v1/campaignDialer/campaigns/${campaignId}/targets?limit=50&page=${page}`,
      );
      const bodyText = await res.text();
      if (!res.ok) {
        throw new Error(`LiveHub targets list failed (${res.status}): ${bodyText}`);
      }
      const parsed = JSON.parse(bodyText) as { targets?: CampaignTarget[]; hasNextPage?: boolean };
      targets.push(...(parsed.targets ?? []));
      if (!parsed.hasNextPage) break;
      page += 1;
    }
    return targets;
  }

  /** Returns null while the target is still pending/in-flight (no terminal status yet). */
  reconcileTarget(target: CampaignTarget): ReconciledTarget | null {
    const { status, lastFailureReason, lastCallTime, botResultMetadata } = target.status;
    const endedAt = lastCallTime ? new Date(lastCallTime) : null;
    if (status === 'Dialer Success') {
      return { targetId: target.targetID, outcome: 'success', failureReason: null, endedAt, botResultMetadata };
    }
    if (status === 'Dialer Failure') {
      const reason = (lastFailureReason || '').toLowerCase();
      const outcome = reason.includes('no answer') ? 'no_answer' : reason.includes('busy') ? 'busy' : 'failed';
      return { targetId: target.targetID, outcome, failureReason: lastFailureReason, endedAt, botResultMetadata };
    }
    if (status === 'Bot Success') {
      return { targetId: target.targetID, outcome: 'success', failureReason: null, endedAt, botResultMetadata };
    }
    if (status === 'Bot Failure') {
      return { targetId: target.targetID, outcome: 'failed', failureReason: lastFailureReason, endedAt, botResultMetadata };
    }
    return null;
  }

  async getCampaignOverview(campaignId: string): Promise<CampaignOverview> {
    const [campaignRes, statsRes] = await Promise.all([
      this.request(`/api/v1/campaignDialer/campaigns/${campaignId}`),
      this.request(`/api/v1/campaignDialer/campaigns/${campaignId}/statistics`),
    ]);
    const campaignBody = await campaignRes.text();
    if (!campaignRes.ok) {
      throw new Error(`LiveHub campaign fetch failed (${campaignRes.status}): ${campaignBody}`);
    }
    const statsBody = await statsRes.text();
    if (!statsRes.ok) {
      throw new Error(`LiveHub campaign statistics fetch failed (${statsRes.status}): ${statsBody}`);
    }
    const campaign = JSON.parse(campaignBody) as FullCampaign;
    const statistics = JSON.parse(statsBody) as CampaignStatistics;
    return {
      campaignId: campaign.campaignID,
      campaignName: campaign.campaignName,
      adminState: campaign.adminState,
      campaignStatus: campaign.status.campaignStatus,
      targetsEnabled: campaign.status.targetsEnabled,
      targetsCompleted: campaign.status.targetsCompleted,
      targetsAnswered: campaign.status.targetsAnswered,
      targetsFailed: campaign.status.targetsFailed,
      statistics,
    };
  }

  /**
   * PUT replaces the campaign resource, so this round-trips the full object
   * from GET with only adminState flipped — a blind partial body risks the
   * API treating missing fields as cleared rather than "unchanged".
   */
  async setCampaignLock(campaignId: string, locked: boolean): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    await this.putCampaignRaw(campaignId, {
      campaignName: campaign.campaignName,
      defaultBotName: campaign.defaultBotName,
      defaultBotDisplayName: campaign.defaultBotDisplayName,
      maxRetries: campaign.maxRetries,
      detectionCapabilities: campaign.detectionCapabilities,
      schedulerSettings: campaign.schedulerSettings,
      adminState: locked ? 'Locked' : 'Unlocked',
    });
  }

  async getCampaign(campaignId: string): Promise<FullCampaign> {
    const res = await this.request(`/api/v1/campaignDialer/campaigns/${campaignId}`);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub campaign fetch failed (${res.status}): ${bodyText}`);
    }
    return JSON.parse(bodyText) as FullCampaign;
  }

  /**
   * campaignName is immutable once a campaign exists, so this always sends
   * the name back unchanged — fetched fresh rather than trusted from the caller.
   */
  async updateCampaign(campaignId: string, input: UpdateCampaignInput): Promise<void> {
    const current = await this.getCampaign(campaignId);
    await this.putCampaignRaw(campaignId, {
      campaignName: current.campaignName,
      ...(input.defaultBotName ? { defaultBotName: input.defaultBotName } : {}),
      maxRetries: input.maxRetries,
      adminState: input.locked ? 'Locked' : 'Unlocked',
      detectionCapabilities: {
        minWaitDurationForAnswer: input.minWaitDurationForAnswer,
        machineDetection: input.machineDetection,
        answerMachineBeepTimeout: input.minWaitDurationForAnswer,
      },
      schedulerSettings: {
        maxCps: input.maxCps,
        maxConcurrentCalls: input.maxConcurrentCalls,
        timeZone: input.timeZone,
        beginningDate: input.beginningDate,
        endingDate: input.endingDate,
        daysOfWeek: input.daysOfWeek,
        minDurationBetweenRetries: input.minDurationBetweenRetries,
        startLocalTime: input.startLocalTime,
        stopLocalTime: input.stopLocalTime,
      },
    });
  }

  private async putCampaignRaw(campaignId: string, body: Record<string, unknown>): Promise<void> {
    const res = await this.request(`/api/v1/campaignDialer/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub campaign update failed (${res.status}): ${bodyText}`);
    }
  }

  async listCampaigns(): Promise<FullCampaign[]> {
    const campaigns: FullCampaign[] = [];
    let page = 1;
    for (;;) {
      const res = await this.request(`/api/v1/campaignDialer/campaigns?limit=50&page=${page}`);
      const bodyText = await res.text();
      if (!res.ok) {
        throw new Error(`LiveHub campaigns list failed (${res.status}): ${bodyText}`);
      }
      const parsed = JSON.parse(bodyText || '{}') as {
        campaigns?: FullCampaign[];
        docs?: FullCampaign[];
        hasNextPage?: boolean;
      };
      campaigns.push(...(parsed.campaigns ?? parsed.docs ?? []));
      if (!parsed.hasNextPage) break;
      page += 1;
    }
    return campaigns;
  }

  async createCampaign(input: CreateCampaignInput): Promise<FullCampaign> {
    const res = await this.request('/api/v1/campaignDialer/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        campaignName: input.campaignName,
        ...(input.defaultBotName ? { defaultBotName: input.defaultBotName } : {}),
        maxRetries: input.maxRetries,
        adminState: input.lockOnCreate ? 'Locked' : 'Unlocked',
        detectionCapabilities: {
          minWaitDurationForAnswer: input.minWaitDurationForAnswer,
          machineDetection: input.machineDetection,
          answerMachineBeepTimeout: input.minWaitDurationForAnswer,
        },
        schedulerSettings: {
          maxCps: input.maxCps,
          maxConcurrentCalls: input.maxConcurrentCalls,
          timeZone: input.timeZone,
          beginningDate: input.beginningDate,
          endingDate: input.endingDate,
          daysOfWeek: input.daysOfWeek,
          minDurationBetweenRetries: input.minDurationBetweenRetries,
          startLocalTime: input.startLocalTime,
          stopLocalTime: input.stopLocalTime,
        },
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub campaign create failed (${res.status}): ${bodyText}`);
    }
    return JSON.parse(bodyText) as FullCampaign;
  }

  /** For the "Default bot name" dropdown — reuses this tenant's configured outreach bot. */
  defaultBotId(): string | undefined {
    return this.creds.outreachBotId;
  }

  /** Falls back to the legacy single outreach campaign for rows/calls dialed before multi-campaign support. */
  async resolveCampaignId(explicit?: string | null): Promise<string> {
    return explicit ?? (await this.getOrCreateCampaignId());
  }

  async listTimezones(): Promise<{ timezone: string; offset: string }[]> {
    const res = await this.request('/api/v1/campaignDialer/timezone');
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub timezone list failed (${res.status}): ${bodyText}`);
    }
    return JSON.parse(bodyText) as { timezone: string; offset: string }[];
  }

  /**
   * There's no REST endpoint to list bot connections, so this derives the
   * known set from defaultBotName/defaultBotDisplayName on every existing
   * campaign — a practical proxy for "bots already used in a campaign".
   */
  async listKnownBots(): Promise<{ botName: string; botDisplayName: string }[]> {
    const campaigns = await this.listCampaigns();
    const seen = new Map<string, string>();
    for (const c of campaigns) {
      if (c.defaultBotName) seen.set(c.defaultBotName, c.defaultBotDisplayName || c.defaultBotName);
    }
    const configuredId = this.defaultBotId();
    if (configuredId && !seen.has(configuredId)) seen.set(configuredId, configuredId);
    return [...seen.entries()].map(([botName, botDisplayName]) => ({ botName, botDisplayName }));
  }

  /**
   * Single-call Dialout API — distinct from Campaign Dialer, no scheduler/pacing,
   * dials immediately. Uses HTTP Basic auth (client_id:client_secret), not the
   * OAuth bearer token the rest of this adapter uses.
   */
  async dialout(input: DialoutInput): Promise<DialoutResult> {
    const basicAuth = Buffer.from(`${this.creds.clientId}:${this.creds.clientSecret}`).toString(
      'base64',
    );
    const target = toE164Ghana(input.target);
    const res = await fetch(`${BASE_URL}/api/v1/actions/dialout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        bot: input.botName,
        target: `tel:${target}`,
        caller: 'Anonymous',
        ...(input.callerDisplayName ? { callerDisplayName: input.callerDisplayName } : {}),
        ...(input.notifyUrl ? { notifyUrl: input.notifyUrl } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        ...(input.answerTimeoutSec ? { answerTimeoutSec: input.answerTimeoutSec } : {}),
        ...(input.machineDetection ? { machineDetection: input.machineDetection } : {}),
        ...(input.voicemailEndTimeoutSec
          ? { voicemailEndTimeoutSec: input.voicemailEndTimeoutSec }
          : {}),
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub dialout failed (${res.status}) for ${target}: ${bodyText}`);
    }
    return JSON.parse(bodyText) as DialoutResult;
  }

  /**
   * PATCH requires the same array-wrapped {targets: [...]} shape as POST, even
   * for a single target.
   */
  async setTargetEnabled(campaignId: string, targetId: string, enabled: boolean): Promise<void> {
    const res = await this.request(`/api/v1/campaignDialer/campaigns/${campaignId}/targets`, {
      method: 'PATCH',
      body: JSON.stringify({ targets: [{ targetID: targetId, enabled }] }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub target update failed (${res.status}): ${bodyText}`);
    }
  }

  /** Irreversible per LiveHub's docs — deletes the campaign and all its target/call data. */
  async deleteCampaign(campaignId: string): Promise<void> {
    const res = await this.request(`/api/v1/campaignDialer/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub campaign delete failed (${res.status}): ${bodyText}`);
    }
  }

  private async getAccountId(): Promise<string> {
    if (this.accountIdCache) return this.accountIdCache;
    const res = await this.request('/vaic/api/Accounts/Current');
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub account lookup failed (${res.status}): ${bodyText}`);
    }
    const { id } = JSON.parse(bodyText) as { id: string };
    this.accountIdCache = id;
    return id;
  }

  /**
   * GET /api/v1/calls requires either botConversationId or a setupTime range;
   * the actual filter syntax is `filter=(field>=value,field<=value)`.
   */
  async listCallsForCampaign(campaignId: string, fromISO: string, toISO: string): Promise<CallRecord[]> {
    const calls: CallRecord[] = [];
    let page = 1;
    for (;;) {
      const filter = `(setupTime>=${encodeURIComponent(fromISO)},setupTime<=${encodeURIComponent(toISO)},campaignId=${campaignId})`;
      const res = await this.request(`/api/v1/calls?filter=${filter}&limit=100&page=${page}`);
      const bodyText = await res.text();
      if (!res.ok) {
        throw new Error(`LiveHub calls list failed (${res.status}): ${bodyText}`);
      }
      const parsed = JSON.parse(bodyText || '{}') as {
        calls?: Record<string, any>[];
        pages?: { total: number; current: number };
      };
      for (const c of parsed.calls ?? []) {
        calls.push({
          callId: c.callId,
          botConversationId: c.botConversationId ?? null,
          campaignId: c.campaignId ?? null,
          calledPhone: c.calledEntity?.phoneNumber ?? '',
          setupTime: c.setupTime,
          endTime: c.endTime ?? null,
          durationSeconds: c.durationSeconds ?? 0,
          successful: !!c.successful,
          terminationDescription: c.terminationDescription ?? null,
          recorded: !!c.recorded,
        });
      }
      const pages = parsed.pages;
      if (!pages || pages.current >= pages.total || page > 20) break;
      page += 1;
    }
    return calls;
  }

  /**
   * LiveHub's own "Post call analysis" LLM extraction (configured per-bot in
   * the portal) — classifies outcome/next_step/summary per call server-side.
   * 404 means no analysis yet for that conversation.
   */
  async getPostCallAnalysis(conversationId: string): Promise<PostCallAnalysisResult | null> {
    const accountId = await this.getAccountId();
    const res = await this.request(
      `/ai-framework-management/api/v1/accounts/${accountId}/post_call_analysis_data/${conversationId}`,
    );
    if (res.status === 404) return null;
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub post-call-analysis fetch failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as {
      id: string;
      time: string;
      results?: { name: string; type: string; data?: Record<string, unknown> }[];
    };
    const result = parsed.results?.find((r) => r.name === 'outreach-call-outcome') ?? parsed.results?.[0];
    const data = result?.data ?? {};
    return {
      conversationId: parsed.id,
      time: parsed.time,
      outcome: (data.outcome as string) ?? null,
      nextStep: (data.next_step as string) ?? (data.nextStep as string) ?? null,
      summary: (data.summary as string) ?? null,
    };
  }

  /** Every post-call analysis result for a conversation (sentiment, extracted
   * structured variables, summaries — whatever the tenant's analyses are
   * configured to produce), not just the single outcome/next_step/summary
   * pick getPostCallAnalysis() makes for the campaign report table. */
  async getFullPostCallAnalysis(conversationId: string): Promise<PostCallAnalysisDetail[]> {
    const accountId = await this.getAccountId();
    const res = await this.request(
      `/ai-framework-management/api/v1/accounts/${accountId}/post_call_analysis_data/${conversationId}`,
    );
    if (res.status === 404) return [];
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub post-call-analysis fetch failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as {
      results?: { name: string; type?: string | null; time?: string | null; data?: Record<string, unknown> }[];
    };
    return (parsed.results ?? []).map((r) => ({
      name: r.name,
      type: r.type ?? null,
      time: r.time ?? null,
      data: r.data ?? {},
    }));
  }

  /** Full call transcript — the log of who said what, in order. */
  async getConversation(conversationId: string): Promise<ConversationDetail | null> {
    const res = await this.request(`${AI_AGENTS_PATH}/conversations/${conversationId}`);
    if (res.status === 404) return null;
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub get conversation failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as {
      id: string;
      start_time: string | null;
      end_time: string | null;
      duration: number;
      caller: string | null;
      callee: string | null;
      termination_reason: string | null;
      history?: {
        time: string | null;
        task_name: string | null;
        from_name: string;
        to_name: string | null;
        message: string;
        label: string;
        type: string | null;
      }[];
    };
    return {
      id: parsed.id,
      startTime: parsed.start_time ?? null,
      endTime: parsed.end_time ?? null,
      durationSeconds: parsed.duration ?? 0,
      caller: parsed.caller ?? null,
      callee: parsed.callee ?? null,
      terminationReason: parsed.termination_reason ?? null,
      history: (parsed.history ?? []).map((h) => ({
        time: h.time ?? null,
        taskName: h.task_name ?? null,
        fromName: h.from_name,
        toName: h.to_name ?? null,
        message: h.message,
        label: h.label,
        type: h.type ?? null,
      })),
    };
  }

  async listTools(): Promise<ToolSummary[]> {
    const res = await this.request(`${AI_AGENTS_PATH}/tools?limit=200`);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub list tools failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as {
      tools?: { id: string; name: string; description?: string | null; type: string; method?: string | null; url?: string | null }[];
    };
    return (parsed.tools ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      type: t.type,
      method: t.method ?? null,
      url: t.url ?? null,
    }));
  }

  /**
   * AI Agents framework methods — separate ID space and permission namespace
   * (LIVEHUB/AIFRAMEWORK/*) from the campaignDialer bots/campaigns above, but
   * same OAuth client/token. A 401/403 here almost always means this
   * tenant's LiveHub API client hasn't been granted the AI Agents role in
   * Access control (IAM), not that something is broken — callers surface
   * that distinctly (see AiAgentService).
   */
  async listAgents(): Promise<AiAgentSummary[]> {
    const res = await this.request(`${AI_AGENTS_PATH}/agents?limit=200`);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub list agents failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as { agents?: { id: string; name: string }[] };
    return (parsed.agents ?? []).map((a) => ({ id: a.id, name: a.name }));
  }

  async getAgent(agentId: string): Promise<AiAgentDetail> {
    const res = await this.request(`${AI_AGENTS_PATH}/agents/${agentId}`);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub get agent failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as {
      id: string;
      name: string;
      llm: string | null;
      prompt: string | null;
      documents: string[] | null;
    };
    return {
      id: parsed.id,
      name: parsed.name,
      llm: parsed.llm ?? null,
      prompt: parsed.prompt ?? '',
      documents: parsed.documents ?? [],
    };
  }

  async updateAgentModel(agentId: string, llm: string): Promise<void> {
    const res = await this.request(`${AI_AGENTS_PATH}/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify({ llm }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub update agent model failed (${res.status}): ${bodyText}`);
    }
  }

  async updateAgentPrompt(agentId: string, prompt: string): Promise<void> {
    const res = await this.request(`${AI_AGENTS_PATH}/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify({ prompt }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub update agent prompt failed (${res.status}): ${bodyText}`);
    }
  }

  async updateAgentDocuments(agentId: string, documentIds: string[]): Promise<void> {
    const res = await this.request(`${AI_AGENTS_PATH}/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify({ documents: documentIds }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub update agent documents failed (${res.status}): ${bodyText}`);
    }
  }

  async listModels(): Promise<AiAgentModel[]> {
    const res = await this.request(`${AI_AGENTS_PATH}/info/models`);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub list models failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as {
      models: { name: string; is_realtime: boolean; latency_ms: number | null }[];
    };
    return parsed.models.map((m) => ({
      name: m.name,
      isRealtime: m.is_realtime,
      latencyMs: m.latency_ms ?? null,
    }));
  }

  private static toKnowledgeDocument(d: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    file_names: string[] | null;
    n_files: number;
    n_chunks: number;
    n_tokens: number;
    created_at: string | null;
  }): KnowledgeDocument {
    return {
      id: d.id,
      name: d.name,
      description: d.description ?? null,
      status: d.status,
      fileNames: d.file_names ?? [],
      nFiles: d.n_files ?? 0,
      nChunks: d.n_chunks ?? 0,
      nTokens: d.n_tokens ?? 0,
      createdAt: d.created_at ?? null,
    };
  }

  async listDocuments(): Promise<KnowledgeDocument[]> {
    const res = await this.request(`${AI_AGENTS_PATH}/documents?limit=200`);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub list documents failed (${res.status}): ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as { documents: Parameters<typeof LiveHubAdapter.toKnowledgeDocument>[0][] };
    return (parsed.documents ?? []).map(LiveHubAdapter.toKnowledgeDocument);
  }

  async uploadDocument(name: string, description: string | undefined, file: Buffer, fileName: string): Promise<KnowledgeDocument> {
    const form = new FormData();
    form.append('name', name);
    if (description) form.append('description', description);
    form.append('file', new Blob([Uint8Array.from(file)]), fileName);
    const res = await this.requestMultipart(`${AI_AGENTS_PATH}/documents/form`, form);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub upload document failed (${res.status}): ${bodyText}`);
    }
    return LiveHubAdapter.toKnowledgeDocument(JSON.parse(bodyText));
  }

  async deleteDocument(documentId: string): Promise<void> {
    const res = await this.request(`${AI_AGENTS_PATH}/documents/${documentId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      const bodyText = await res.text();
      throw new Error(`LiveHub delete document failed (${res.status}): ${bodyText}`);
    }
  }
}
