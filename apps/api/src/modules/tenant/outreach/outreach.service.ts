import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import {
  tenantAiAgentConfig,
  voiceCampaignOutcomes,
  voiceCampaignReports,
  voiceOutboundAttempts,
} from '../../../db/schema';
import { badRequest } from '../../../common/errors';
import { VoiceAdapterFactoryService } from '../../voice/voice-adapter-factory.service';
import type { CallRecord, PostCallAnalysisResult } from '../../voice/adapters/livehub.adapter';
import { OutreachDialService } from './outreach-dial.service';
import { normalizeGhanaPhone } from './phone';
import type {
  AddTargetDto,
  CreateCampaignDto,
  OutreachDncDto,
  SetAiContextDto,
  SetRecommendationDto,
  UpdateCampaignDto,
  UpsertOutcomeDto,
} from './dto/outreach.dto';

const MAX_ROWS = 500;
const PHONE_HEADERS = ['phone', 'phone number', 'mobile', 'mobile number', 'number'];
const REASON_HEADERS = ['reason', 'notes', 'note', 'call reason', 'reason/notes'];
const NAME_HEADERS = ['name', 'full name', 'contact name', 'customer name'];

function findKey(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  return candidates
    .map((cand) => keys.find((k) => k.trim().toLowerCase() === cand))
    .find((k) => k !== undefined);
}

/**
 * Tenant-scoped port of the old single-tenant repo's OutreachService.
 * Campaign management is LiveHub-only (same as the original — no other
 * provider has a campaign/target-list concept), obtained per-tenant via
 * VoiceAdapterFactoryService instead of one global injected instance.
 * getCampaignReport drops the old customers-table name lookup (no shared
 * customers table across tenants) in favor of the name captured directly on
 * the uploaded contact row.
 */
@Injectable()
export class OutreachService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly dial: OutreachDialService,
    private readonly adapterFactory: VoiceAdapterFactoryService,
  ) {}

  async listCampaigns(tenantId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return liveHub.listCampaigns();
  }

  async listTimezones(tenantId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return liveHub.listTimezones();
  }

  async listBots(tenantId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return liveHub.listKnownBots();
  }

  async createCampaign(tenantId: string, dto: CreateCampaignDto) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return liveHub.createCampaign({
      campaignName: dto.campaignName,
      defaultBotName: dto.defaultBotName,
      timeZone: dto.timeZone,
      startLocalTime: dto.startLocalTime,
      stopLocalTime: dto.stopLocalTime,
      daysOfWeek: dto.daysOfWeek,
      beginningDate: dto.beginningDate,
      endingDate: dto.endingDate,
      maxCps: dto.maxCps,
      maxConcurrentCalls: dto.maxConcurrentCalls,
      maxRetries: dto.maxRetries,
      minDurationBetweenRetries: dto.minDurationBetweenRetries,
      minWaitDurationForAnswer: dto.minWaitDurationForAnswer,
      machineDetection: dto.machineDetection,
      lockOnCreate: dto.lockOnCreate,
    });
  }

  async getCampaignOverview(tenantId: string, campaignId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return liveHub.getCampaignOverview(campaignId);
  }

  async getCampaign(tenantId: string, campaignId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return liveHub.getCampaign(campaignId);
  }

  async updateCampaign(tenantId: string, campaignId: string, dto: UpdateCampaignDto) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await liveHub.updateCampaign(campaignId, {
      defaultBotName: dto.defaultBotName,
      timeZone: dto.timeZone,
      startLocalTime: dto.startLocalTime,
      stopLocalTime: dto.stopLocalTime,
      daysOfWeek: dto.daysOfWeek,
      beginningDate: dto.beginningDate,
      endingDate: dto.endingDate,
      maxCps: dto.maxCps,
      maxConcurrentCalls: dto.maxConcurrentCalls,
      maxRetries: dto.maxRetries,
      minDurationBetweenRetries: dto.minDurationBetweenRetries,
      minWaitDurationForAnswer: dto.minWaitDurationForAnswer,
      machineDetection: dto.machineDetection,
      locked: dto.locked,
    });
    return liveHub.getCampaign(campaignId);
  }

  async setCampaignLock(tenantId: string, campaignId: string, locked: boolean) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await liveHub.setCampaignLock(campaignId, locked);
    return { locked };
  }

  async deleteCampaign(tenantId: string, campaignId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await liveHub.deleteCampaign(campaignId);
    return { deleted: true };
  }

  async listTargets(tenantId: string, campaignId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    return liveHub.listCampaignTargets(campaignId);
  }

  async setTargetEnabled(tenantId: string, campaignId: string, targetId: string, enabled: boolean) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    await liveHub.setTargetEnabled(campaignId, targetId, enabled);
    return { enabled };
  }

  /** The "Add new target" action on the Target List tab — adds one target
   * directly to the campaign, DNC-checked, with the campaign's own AI
   * context plus this target's reason carried as botMetadata (same shape
   * the regular upload→dial pipeline already sends). */
  async addTarget(tenantId: string, campaignId: string, dto: AddTargetDto) {
    const normalized = normalizeGhanaPhone(dto.targetNumber);
    if (!normalized) throw badRequest('INVALID_PHONE', 'Need a Ghana phone number');
    if (await this.dial.isDnc(tenantId, normalized)) {
      throw badRequest('DNC_BLOCKED', 'This number is on the do-not-call list');
    }
    const { aiContext } = await this.getAiContext(tenantId, campaignId);
    const metadata = {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.reason ? { reason: dto.reason } : {}),
      ...(aiContext ? { campaignContext: aiContext } : {}),
    };
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    let result: { result: string; targetID?: string } | undefined;
    try {
      [result] = await liveHub.addTargetsToCampaign(campaignId, [
        {
          targetNumber: normalized,
          tag: dto.tag,
          botMetadata: Object.keys(metadata).length ? JSON.stringify(metadata) : undefined,
        },
      ]);
    } catch (err) {
      throw badRequest('LIVEHUB_REJECTED', (err as Error).message);
    }
    if (!result || result.result !== 'Success') {
      throw badRequest('TARGET_REJECTED', `Target was rejected: ${result?.result ?? 'unknown error'}`);
    }
    return { targetId: result.targetID };
  }

  /**
   * The "Import" action on the Target List tab — bulk-adds targets straight
   * to a campaign from a spreadsheet, DNC-checked per row. Deliberately
   * additive only (appends via addTargetsToCampaign), unlike LiveHub's own
   * native Import which replaces the entire existing target list — that
   * replace-all behavior would silently wipe a live campaign's real
   * targets, so it's not exposed here.
   */
  async importTargets(tenantId: string, campaignId: string, buffer: Buffer) {
    let rows: Record<string, unknown>[];
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    } catch {
      throw badRequest('INVALID_FILE', 'Could not parse the uploaded file as Excel/CSV');
    }
    if (rows.length === 0) throw badRequest('EMPTY_FILE', 'No rows found in the uploaded file');
    if (rows.length > MAX_ROWS) throw badRequest('TOO_MANY_ROWS', `Max ${MAX_ROWS} targets per import`);

    const phoneKey = findKey(rows[0], PHONE_HEADERS);
    if (!phoneKey) {
      throw badRequest('MISSING_PHONE_COLUMN', 'Could not find a phone column (expected a header like "phone")');
    }
    const reasonKey = findKey(rows[0], REASON_HEADERS);
    const nameKey = findKey(rows[0], NAME_HEADERS);

    const { aiContext } = await this.getAiContext(tenantId, campaignId);
    const parsed = rows.map((row, index) => {
      const phone = normalizeGhanaPhone(String(row[phoneKey] ?? '').trim());
      const reason = reasonKey ? String(row[reasonKey] ?? '').trim() : '';
      const name = nameKey ? String(row[nameKey] ?? '').trim() : '';
      return { row: index + 2, phone, reason: reason || undefined, name: name || undefined };
    });

    const results: { row: number; phone?: string; accepted: boolean; reason?: string }[] = [];
    const toAdd: { row: number; targetNumber: string; botMetadata?: string }[] = [];
    for (const r of parsed) {
      if (!r.phone) {
        results.push({ row: r.row, accepted: false, reason: 'invalid_phone' });
        continue;
      }
      if (await this.dial.isDnc(tenantId, r.phone)) {
        results.push({ row: r.row, phone: r.phone, accepted: false, reason: 'dnc' });
        continue;
      }
      const metadata = {
        ...(r.name ? { name: r.name } : {}),
        ...(r.reason ? { reason: r.reason } : {}),
        ...(aiContext ? { campaignContext: aiContext } : {}),
      };
      toAdd.push({
        row: r.row,
        targetNumber: r.phone,
        botMetadata: Object.keys(metadata).length ? JSON.stringify(metadata) : undefined,
      });
    }

    if (toAdd.length > 0) {
      const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
      let liveHubResults: { result: string; targetID?: string }[];
      try {
        liveHubResults = await liveHub.addTargetsToCampaign(
          campaignId,
          toAdd.map((t) => ({ targetNumber: t.targetNumber, botMetadata: t.botMetadata })),
        );
      } catch (err) {
        throw badRequest('LIVEHUB_REJECTED', (err as Error).message);
      }
      toAdd.forEach((t, i) => {
        const lhResult = liveHubResults[i];
        const accepted = !!lhResult && lhResult.result === 'Success';
        results.push({
          row: t.row,
          phone: t.targetNumber,
          accepted,
          reason: accepted ? undefined : (lhResult?.result ?? 'rejected'),
        });
      });
    }

    results.sort((a, b) => a.row - b.row);
    const accepted = results.filter((r) => r.accepted).length;
    return { accepted, rejected: results.length - accepted, results };
  }

  /**
   * LiveHub's own botResultMetadata is null on every target we've checked, so
   * "what happened" is primarily a staff-entered log (voice_campaign_outcomes),
   * joined here against LiveHub's live target list. Where the old repo looked
   * up a contact's display name from a shared `customers` table, this uses the
   * name captured directly on the uploaded contact row instead (no per-tenant
   * customers table).
   */
  async getCampaignReport(tenantId: string, campaignId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const [overview, campaign, targets, outcomeRows, reportRows] = await Promise.all([
      liveHub.getCampaignOverview(campaignId),
      liveHub.getCampaign(campaignId),
      liveHub.listCampaignTargets(campaignId),
      this.db
        .select()
        .from(voiceCampaignOutcomes)
        .where(
          and(eq(voiceCampaignOutcomes.tenantId, tenantId), eq(voiceCampaignOutcomes.liveHubCampaignId, campaignId)),
        ),
      this.db
        .select()
        .from(voiceCampaignReports)
        .where(and(eq(voiceCampaignReports.tenantId, tenantId), eq(voiceCampaignReports.liveHubCampaignId, campaignId)))
        .limit(1),
    ]);

    const schedulerSettings = campaign.schedulerSettings as { beginningDate?: string };
    const fromISO = `${schedulerSettings.beginningDate ?? '2020-01-01'}T00:00:00.000Z`;
    const toISO = new Date(Date.now() + 60_000).toISOString();
    const calls = await liveHub
      .listCallsForCampaign(campaignId, fromISO, toISO)
      .catch((): CallRecord[] => []);

    const normalizePhone = (p: string) => p.replace(/\D/g, '');
    const toLocalPhone = (p: string) => {
      const digits = normalizePhone(p);
      if (digits.startsWith('233') && digits.length >= 12) return `0${digits.slice(3)}`;
      if (digits.length === 9 && !digits.startsWith('0')) return `0${digits}`;
      return digits;
    };
    const callByPhone = new Map<string, (typeof calls)[number]>();
    for (const c of calls) {
      const key = normalizePhone(c.calledPhone);
      if (!key) continue;
      const existing = callByPhone.get(key);
      if (!existing || c.setupTime > existing.setupTime) callByPhone.set(key, c);
    }
    const conversationIds = [
      ...new Set(calls.map((c) => c.botConversationId).filter((id): id is string => !!id)),
    ];
    const pcaEntries = await Promise.all(
      conversationIds.map((id) => liveHub.getPostCallAnalysis(id).catch((): PostCallAnalysisResult | null => null)),
    );
    const pcaByConversationId = new Map(
      conversationIds
        .map((id, i) => [id, pcaEntries[i]] as const)
        .filter((entry): entry is [string, PostCallAnalysisResult] => !!entry[1]),
    );

    const targetLocalPhones = [...new Set(targets.map((t) => toLocalPhone(t.setting.targetNumber)))];
    const attemptRows = targetLocalPhones.length
      ? await this.db
          .select({
            phone: voiceOutboundAttempts.phone,
            name: voiceOutboundAttempts.name,
            reason: voiceOutboundAttempts.reason,
            createdAt: voiceOutboundAttempts.createdAt,
          })
          .from(voiceOutboundAttempts)
          .where(eq(voiceOutboundAttempts.tenantId, tenantId))
      : [];
    const byPhone = new Map<string, { name: string | null; reason: string | null; createdAt: Date }>();
    for (const a of attemptRows) {
      const existing = byPhone.get(a.phone);
      if (!existing || a.createdAt > existing.createdAt) {
        byPhone.set(a.phone, { name: a.name, reason: a.reason, createdAt: a.createdAt });
      }
    }

    const outcomeByTarget = new Map(outcomeRows.map((o) => [o.targetId, o]));
    const rows = targets.map((t) => {
      const localPhone = toLocalPhone(t.setting.targetNumber);
      const o = outcomeByTarget.get(t.targetID);
      const call = callByPhone.get(normalizePhone(t.setting.targetNumber));
      const pca = call?.botConversationId ? (pcaByConversationId.get(call.botConversationId) ?? null) : null;
      const contact = byPhone.get(localPhone);
      // Name/reason set at import time (Excel upload or single add) live on
      // the target's own botMetadata, since those targets go straight to
      // LiveHub's Campaign Dialer and never touch voiceOutboundAttempts;
      // the attempts-table join only catches calls placed through our own
      // queue (call-now/upload-contacts), so it's just a fallback here.
      let targetMeta: { name?: string; reason?: string } = {};
      try {
        targetMeta = t.setting.botMetadata ? JSON.parse(t.setting.botMetadata) : {};
      } catch {
        targetMeta = {};
      }
      return {
        targetId: t.targetID,
        phone: t.setting.targetNumber,
        name: targetMeta.name || contact?.name || null,
        reason: targetMeta.reason || contact?.reason || null,
        status: t.status.status,
        lastFailureReason: t.status.lastFailureReason,
        lastCallTime: t.status.lastCallTime,
        numOfRetries: t.status.numOfRetries,
        outcome: o?.outcome ?? null,
        nextStep: o?.nextStep ?? null,
        notes: o?.notes ?? null,
        updatedAt: o?.updatedAt ?? null,
        call: call
          ? {
              callId: call.callId,
              conversationId: call.botConversationId,
              setupTime: call.setupTime,
              durationSeconds: call.durationSeconds,
              successful: call.successful,
              terminationDescription: call.terminationDescription,
            }
          : null,
        aiSuggestion: pca ? { outcome: pca.outcome, nextStep: pca.nextStep, summary: pca.summary } : null,
      };
    });

    const outcomeCounts: Record<string, number> = {};
    for (const o of outcomeRows) {
      if (o.outcome) outcomeCounts[o.outcome] = (outcomeCounts[o.outcome] ?? 0) + 1;
    }
    const needsFollowUp = outcomeRows.filter((o) => o.nextStep && o.nextStep !== 'no_action_needed').length;

    return {
      campaignId,
      campaignName: overview.campaignName,
      summary: overview,
      rows,
      outcomeCounts,
      reviewedCount: outcomeRows.length,
      needsFollowUp,
      recommendation: reportRows[0]?.recommendation ?? null,
    };
  }

  async getConversationTranscript(tenantId: string, conversationId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const conversation = await liveHub.getConversation(conversationId);
    if (!conversation) throw badRequest('CONVERSATION_NOT_FOUND', 'No transcript found for that call');
    return conversation;
  }

  async getFullCallAnalysis(tenantId: string, conversationId: string) {
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const results = await liveHub.getFullPostCallAnalysis(conversationId);
    return { results };
  }

  async exportCampaignReport(tenantId: string, campaignId: string): Promise<{ filename: string; buffer: Buffer }> {
    const report = await this.getCampaignReport(tenantId, campaignId);
    const t = report.summary.statistics.targetStatistics;
    const responded = t.completed.answeredSuccess + t.completed.answeredBotFailure;

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Campaign', report.campaignName],
      ['Generated', new Date().toISOString()],
      [],
      ['Total contacts', report.summary.targetsEnabled],
      ['Responded', responded],
      ['Reviewed', report.reviewedCount],
      ['Needs follow-up', report.needsFollowUp],
      [],
      ['Recommendation', report.recommendation ?? ''],
    ]);
    summarySheet['!cols'] = [{ wch: 18 }, { wch: 60 }];

    const callsSheet = XLSX.utils.json_to_sheet(
      report.rows.map((r) => ({
        Name: r.name ?? '',
        Phone: r.phone.replace(/^tel:/, ''),
        Reason: r.reason ?? '',
        Date: r.call?.setupTime ?? r.lastCallTime ?? '',
        'Duration (s)': r.call?.durationSeconds ?? '',
        Answered: r.call ? (r.call.successful ? 'Yes' : 'No') : '',
        'LiveHub status': r.status,
        Outcome: r.outcome ?? '',
        'Next step': r.nextStep ?? '',
        Notes: r.notes ?? '',
        'AI suggested outcome': r.aiSuggestion?.outcome ?? '',
        'AI suggested next step': r.aiSuggestion?.nextStep ?? '',
        'AI summary': r.aiSuggestion?.summary ?? '',
        'Logged at': r.updatedAt ?? '',
      })),
    );
    callsSheet['!cols'] = [
      { wch: 20 },
      { wch: 16 },
      { wch: 40 },
      { wch: 22 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 40 },
      { wch: 20 },
      { wch: 20 },
      { wch: 60 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, callsSheet, 'Calls');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const safeName = report.campaignName.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '');
    return { filename: `${safeName || 'campaign'}-report.xlsx`, buffer };
  }

  async upsertOutcome(tenantId: string, campaignId: string, targetId: string, dto: UpsertOutcomeDto) {
    await this.db
      .insert(voiceCampaignOutcomes)
      .values({
        tenantId,
        liveHubCampaignId: campaignId,
        targetId,
        phone: dto.phone,
        outcome: dto.outcome,
        nextStep: dto.nextStep,
        notes: dto.notes,
      })
      .onConflictDoUpdate({
        target: [voiceCampaignOutcomes.liveHubCampaignId, voiceCampaignOutcomes.targetId],
        set: { phone: dto.phone, outcome: dto.outcome, nextStep: dto.nextStep, notes: dto.notes, updatedAt: new Date() },
      });
    return { ok: true };
  }

  async setRecommendation(tenantId: string, campaignId: string, dto: SetRecommendationDto) {
    await this.db
      .insert(voiceCampaignReports)
      .values({ tenantId, liveHubCampaignId: campaignId, recommendation: dto.recommendation })
      .onConflictDoUpdate({
        target: voiceCampaignReports.liveHubCampaignId,
        set: { recommendation: dto.recommendation, updatedAt: new Date() },
      });
    return { ok: true };
  }

  /**
   * Industry/use-case context for the AI bot on this campaign — e.g. "this is
   * a parking renewal reminder for a Ghanaian audience; be brief and quote
   * amounts in GHS". Merged into botMetadata on every call for the campaign
   * (see OutreachDialService.startOutbound/dialoutNow), alongside the
   * per-contact `reason` already captured at upload time.
   */
  async getAiContext(tenantId: string, campaignId: string) {
    const [row] = await this.db
      .select({
        aiContext: voiceCampaignReports.aiContext,
        toolNames: voiceCampaignReports.toolNames,
        documentIds: voiceCampaignReports.documentIds,
      })
      .from(voiceCampaignReports)
      .where(and(eq(voiceCampaignReports.tenantId, tenantId), eq(voiceCampaignReports.liveHubCampaignId, campaignId)))
      .limit(1);

    const [config] = await this.db
      .select({ lastAppliedCampaignId: tenantAiAgentConfig.lastAppliedCampaignId })
      .from(tenantAiAgentConfig)
      .where(eq(tenantAiAgentConfig.tenantId, tenantId))
      .limit(1);
    const lastAppliedCampaignId = config?.lastAppliedCampaignId ?? null;
    const isLive = lastAppliedCampaignId === null || lastAppliedCampaignId === campaignId;

    let liveCampaignName: string | null = null;
    if (!isLive && lastAppliedCampaignId) {
      try {
        const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
        const liveCampaign = await liveHub.getCampaign(lastAppliedCampaignId);
        liveCampaignName = liveCampaign?.campaignName ?? lastAppliedCampaignId;
      } catch {
        liveCampaignName = lastAppliedCampaignId;
      }
    }

    return {
      aiContext: row?.aiContext ?? null,
      toolNames: row?.toolNames ?? [],
      documentIds: row?.documentIds ?? [],
      isLive,
      liveCampaignName,
    };
  }

  /** Saving this is the only step there is — no separate "deploy" action.
   * Persists the campaign's own record, then immediately pushes the same
   * prompt/tools/documents onto the tenant's one bound LiveHub agent, so
   * the campaign you just set up is what the agent actually runs on its
   * next call. Only one campaign's settings can be "live" on the shared
   * agent at a time — saving a different campaign's AI settings overwrites
   * it, same as before. */
  async setAiContext(tenantId: string, campaignId: string, dto: SetAiContextDto) {
    const toolNames = dto.toolNames ?? [];
    const documentIds = dto.documentIds ?? [];
    await this.db
      .insert(voiceCampaignReports)
      .values({ tenantId, liveHubCampaignId: campaignId, aiContext: dto.aiContext, toolNames, documentIds })
      .onConflictDoUpdate({
        target: voiceCampaignReports.liveHubCampaignId,
        set: { aiContext: dto.aiContext, toolNames, documentIds, updatedAt: new Date() },
      });

    // Only push to the live agent when there's real prompt content — an
    // empty save (e.g. a campaign that isn't using this feature) must never
    // blank out whatever the agent is actually running.
    if (dto.aiContext.trim()) {
      const [config] = await this.db
        .select({ agentId: tenantAiAgentConfig.agentId })
        .from(tenantAiAgentConfig)
        .where(eq(tenantAiAgentConfig.tenantId, tenantId))
        .limit(1);
      if (config?.agentId) {
        const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
        const agentId = config.agentId;
        await liveHub.updateAgentPrompt(agentId, dto.aiContext);
        await liveHub.updateAgentTools(agentId, toolNames);
        await liveHub.updateAgentDocuments(agentId, documentIds);
        await this.db
          .update(tenantAiAgentConfig)
          .set({ lastAppliedCampaignId: campaignId })
          .where(eq(tenantAiAgentConfig.tenantId, tenantId));
      }
    }

    return { aiContext: dto.aiContext, toolNames, documentIds };
  }

  async uploadBatch(
    tenantId: string,
    batch: string,
    buffer: Buffer,
    scheduledAt?: string,
    liveHubCampaignId?: string,
  ) {
    let rows: Record<string, unknown>[];
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // raw:false forces SheetJS to use each cell's formatted display text
      // rather than its coerced numeric value — without it, phone numbers
      // with a leading 0 silently lose that digit.
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    } catch {
      throw badRequest('INVALID_FILE', 'Could not parse the uploaded file as Excel/CSV');
    }
    if (rows.length === 0) throw badRequest('EMPTY_FILE', 'No rows found in the uploaded file');
    if (rows.length > MAX_ROWS) throw badRequest('TOO_MANY_ROWS', `Max ${MAX_ROWS} contacts per upload`);

    const phoneKey = findKey(rows[0], PHONE_HEADERS);
    if (!phoneKey) {
      throw badRequest('MISSING_PHONE_COLUMN', 'Could not find a phone column (expected a header like "phone")');
    }
    const reasonKey = findKey(rows[0], REASON_HEADERS);
    const nameKey = findKey(rows[0], NAME_HEADERS);

    const results = await Promise.all(
      rows.map(async (row, index) => {
        const phone = String(row[phoneKey] ?? '').trim();
        const reason = reasonKey ? String(row[reasonKey] ?? '').trim() : '';
        const name = nameKey ? String(row[nameKey] ?? '').trim() : '';
        if (!phone) {
          return { row: index + 2, accepted: false, reason: 'missing_phone' };
        }
        const result = await this.dial.enqueueOutbound(tenantId, {
          campaign: batch,
          liveHubCampaignId,
          phone,
          name: name || undefined,
          reason: reason || undefined,
          scheduledAt,
        });
        return { row: index + 2, phone, ...result };
      }),
    );
    const accepted = results.filter((r) => r.accepted).length;
    return { accepted, rejected: results.length - accepted, results };
  }

  listAttempts(tenantId: string, query: { campaign?: string; status?: string }) {
    return this.dial.listOutboundAttempts(tenantId, query);
  }

  listBatches(tenantId: string) {
    return this.dial.listBatches(tenantId);
  }

  addDnc(tenantId: string, dto: OutreachDncDto) {
    return this.dial.addDnc(tenantId, dto.phone, dto.reason, 'outreach');
  }

  /**
   * Cross-campaign analytics — aggregates across all of a tenant's activity
   * rather than one campaign's LiveHub targets, so it's built entirely from
   * our own attempt/outcome tables (no LiveHub calls needed).
   */
  async getAnalyticsOverview(tenantId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();

    const [statusRows, dailyRows, outcomeRows] = await Promise.all([
      this.db
        .select({ status: voiceOutboundAttempts.status, count: sql<number>`count(*)::int` })
        .from(voiceOutboundAttempts)
        .where(
          and(
            eq(voiceOutboundAttempts.tenantId, tenantId),
            gte(voiceOutboundAttempts.scheduledAt, fromDate),
            lte(voiceOutboundAttempts.scheduledAt, toDate),
          ),
        )
        .groupBy(voiceOutboundAttempts.status),
      this.db
        .select({
          date: sql<string>`date_trunc('day', ${voiceOutboundAttempts.scheduledAt})::date`,
          count: sql<number>`count(*)::int`,
        })
        .from(voiceOutboundAttempts)
        .where(
          and(
            eq(voiceOutboundAttempts.tenantId, tenantId),
            gte(voiceOutboundAttempts.scheduledAt, fromDate),
            lte(voiceOutboundAttempts.scheduledAt, toDate),
          ),
        )
        .groupBy(sql`date_trunc('day', ${voiceOutboundAttempts.scheduledAt})`)
        .orderBy(sql`date_trunc('day', ${voiceOutboundAttempts.scheduledAt})`),
      this.db
        .select({ outcome: voiceCampaignOutcomes.outcome, count: sql<number>`count(*)::int` })
        .from(voiceCampaignOutcomes)
        .where(
          and(
            eq(voiceCampaignOutcomes.tenantId, tenantId),
            gte(voiceCampaignOutcomes.updatedAt, fromDate),
            lte(voiceCampaignOutcomes.updatedAt, toDate),
          ),
        )
        .groupBy(voiceCampaignOutcomes.outcome),
    ]);

    const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
    const total = statusRows.reduce((sum, r) => sum + r.count, 0);
    const completed = byStatus.completed ?? 0;
    const failed = byStatus.failed ?? 0;
    const dnc = byStatus.dnc ?? 0;
    const connected = (byStatus.answered ?? 0) + (byStatus.machine ?? 0) + completed;
    const answerRate = total > 0 ? connected / total : 0;

    return {
      totals: { total, completed, failed, dnc, answerRate },
      dailyTrend: dailyRows.map((r) => ({ date: r.date, count: r.count })),
      outcomeBreakdown: outcomeRows
        .filter((r) => !!r.outcome)
        .map((r) => ({ outcome: r.outcome as string, count: r.count })),
    };
  }

  async callNow(tenantId: string, phone: string, reason?: string, liveHubCampaignId?: string, instant?: boolean) {
    if (instant) {
      const dial = await this.dial.dialoutNow(tenantId, phone, reason);
      return { accepted: dial.dialed, reason: dial.dialed ? undefined : dial.reason, phone, dial };
    }
    const enqueued = await this.dial.enqueueOutbound(tenantId, { campaign: 'Instant call', liveHubCampaignId, phone, reason });
    if (!enqueued.accepted || !enqueued.attempt) {
      return enqueued;
    }
    const dial = await this.dial.startOutbound(tenantId, enqueued.attempt.id);
    return { ...enqueued, dial };
  }

}
