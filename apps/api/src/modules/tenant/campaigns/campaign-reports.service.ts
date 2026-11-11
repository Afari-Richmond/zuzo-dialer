import { Inject, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { callOutcomes, campaignReports, campaignTargets, campaigns } from '../../../db/schema';
import { notFound } from '../../../common/errors';
import type { SetRecommendationDto, UpsertOutcomeDto } from './dto/report.dto';

@Injectable()
export class CampaignReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async getCampaign(tenantId: string, campaignId: string) {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, campaignId)))
      .limit(1);
    if (!campaign) throw notFound('CAMPAIGN_NOT_FOUND', 'Campaign not found');
    return campaign;
  }

  async getReport(tenantId: string, campaignId: string) {
    const campaign = await this.getCampaign(tenantId, campaignId);

    const [targets, outcomeRows, reportRows] = await Promise.all([
      this.db
        .select()
        .from(campaignTargets)
        .where(and(eq(campaignTargets.tenantId, tenantId), eq(campaignTargets.campaignId, campaignId))),
      this.db
        .select()
        .from(callOutcomes)
        .where(and(eq(callOutcomes.tenantId, tenantId), eq(callOutcomes.campaignId, campaignId))),
      this.db
        .select()
        .from(campaignReports)
        .where(eq(campaignReports.campaignId, campaignId))
        .limit(1),
    ]);

    const outcomeByTarget = new Map(outcomeRows.map((o) => [o.targetId, o]));
    const rows = targets.map((t) => {
      const o = outcomeByTarget.get(t.id);
      return {
        targetId: t.id,
        phone: t.phone,
        name: t.name,
        reasonNotes: t.reasonNotes,
        status: t.status,
        attemptNumber: t.attemptNumber,
        lastError: t.lastError,
        startedAt: t.startedAt,
        outcome: o?.outcome ?? null,
        nextStep: o?.nextStep ?? null,
        notes: o?.notes ?? null,
        loggedAt: o?.updatedAt ?? null,
      };
    });

    const outcomeCounts: Record<string, number> = {};
    for (const o of outcomeRows) {
      if (o.outcome) outcomeCounts[o.outcome] = (outcomeCounts[o.outcome] ?? 0) + 1;
    }
    const needsFollowUp = outcomeRows.filter(
      (o) => o.nextStep && o.nextStep !== 'no_action_needed',
    ).length;

    const statusCounts: Record<string, number> = {};
    for (const t of targets) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;

    return {
      campaignId,
      campaignName: campaign.name,
      totalContacts: targets.length,
      statusCounts,
      rows,
      outcomeCounts,
      reviewedCount: outcomeRows.length,
      needsFollowUp,
      recommendation: reportRows[0]?.recommendation ?? null,
    };
  }

  /** .xlsx built from the same data as getReport — a Summary sheet plus one
   * row per contact on a Calls sheet, mirroring the single-tenant original. */
  async exportReport(tenantId: string, campaignId: string): Promise<{ filename: string; buffer: Buffer }> {
    const report = await this.getReport(tenantId, campaignId);

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Campaign', report.campaignName],
      ['Generated', new Date().toISOString()],
      [],
      ['Total contacts', report.totalContacts],
      ['Completed', report.statusCounts.completed ?? 0],
      ['Failed', report.statusCounts.failed ?? 0],
      ['DNC', report.statusCounts.dnc ?? 0],
      ['Reviewed', report.reviewedCount],
      ['Needs follow-up', report.needsFollowUp],
      [],
      ['Recommendation', report.recommendation ?? ''],
    ]);
    summarySheet['!cols'] = [{ wch: 18 }, { wch: 60 }];

    const callsSheet = XLSX.utils.json_to_sheet(
      report.rows.map((r) => ({
        Name: r.name ?? '',
        Phone: r.phone,
        Reason: r.reasonNotes ?? '',
        Status: r.status,
        'Started At': r.startedAt ? r.startedAt.toISOString() : '',
        Outcome: r.outcome ?? '',
        'Next step': r.nextStep ?? '',
        Notes: r.notes ?? '',
        'Logged at': r.loggedAt ? r.loggedAt.toISOString() : '',
      })),
    );
    callsSheet['!cols'] = [
      { wch: 20 },
      { wch: 16 },
      { wch: 40 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 40 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, callsSheet, 'Calls');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const safeName = report.campaignName.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '');
    return { filename: `${safeName || 'campaign'}-report.xlsx`, buffer };
  }

  async upsertOutcome(
    tenantId: string,
    campaignId: string,
    targetId: string,
    dto: UpsertOutcomeDto,
    loggedByUserId: string,
  ) {
    const [target] = await this.db
      .select({ phone: campaignTargets.phone })
      .from(campaignTargets)
      .where(
        and(
          eq(campaignTargets.tenantId, tenantId),
          eq(campaignTargets.campaignId, campaignId),
          eq(campaignTargets.id, targetId),
        ),
      )
      .limit(1);
    if (!target) throw notFound('TARGET_NOT_FOUND', 'Campaign target not found');

    await this.db
      .insert(callOutcomes)
      .values({
        tenantId,
        campaignId,
        targetId,
        phone: target.phone,
        outcome: dto.outcome,
        nextStep: dto.nextStep,
        notes: dto.notes,
        loggedByUserId,
      })
      .onConflictDoUpdate({
        target: [callOutcomes.campaignId, callOutcomes.targetId],
        set: {
          outcome: dto.outcome,
          nextStep: dto.nextStep,
          notes: dto.notes,
          loggedByUserId,
          updatedAt: new Date(),
        },
      });
    return { ok: true };
  }

  async setRecommendation(tenantId: string, campaignId: string, dto: SetRecommendationDto) {
    await this.getCampaign(tenantId, campaignId);
    await this.db
      .insert(campaignReports)
      .values({ campaignId, tenantId, recommendation: dto.recommendation })
      .onConflictDoUpdate({
        target: campaignReports.campaignId,
        set: { recommendation: dto.recommendation, updatedAt: new Date() },
      });
    return { ok: true };
  }
}
