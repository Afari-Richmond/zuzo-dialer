import { Inject, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { campaignTargets, campaigns } from '../../../db/schema';
import { badRequest, notFound } from '../../../common/errors';

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

@Injectable()
export class ContactsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async uploadBatch(tenantId: string, campaignId: string, buffer: Buffer) {
    const [campaign] = await this.db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, campaignId)))
      .limit(1);
    if (!campaign) throw notFound('CAMPAIGN_NOT_FOUND', 'Campaign not found');

    let rows: Record<string, unknown>[];
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // raw:false forces SheetJS to use each cell's formatted display text
      // rather than its coerced numeric value — without it, phone numbers
      // with a leading 0 silently lose that digit (confirmed empirically).
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    } catch {
      throw badRequest('INVALID_FILE', 'Could not parse the uploaded file as Excel/CSV');
    }
    if (rows.length === 0) throw badRequest('EMPTY_FILE', 'No rows found in the uploaded file');
    if (rows.length > MAX_ROWS) {
      throw badRequest('TOO_MANY_ROWS', `Max ${MAX_ROWS} contacts per upload`);
    }

    const phoneKey = findKey(rows[0], PHONE_HEADERS);
    if (!phoneKey) {
      throw badRequest('MISSING_PHONE_COLUMN', 'Could not find a phone column (expected a header like "phone")');
    }
    const reasonKey = findKey(rows[0], REASON_HEADERS);
    const nameKey = findKey(rows[0], NAME_HEADERS);

    const results: Array<{ row: number; accepted: boolean; reason?: string; phone?: string }> = [];
    const toInsert: Array<typeof campaignTargets.$inferInsert> = [];

    rows.forEach((row, index) => {
      const phone = String(row[phoneKey] ?? '').trim();
      if (!phone) {
        results.push({ row: index + 2, accepted: false, reason: 'missing_phone' });
        return;
      }
      toInsert.push({
        tenantId,
        campaignId,
        phone,
        name: nameKey ? String(row[nameKey] ?? '').trim() || null : null,
        reasonNotes: reasonKey ? String(row[reasonKey] ?? '').trim() || null : null,
      });
      results.push({ row: index + 2, accepted: true, phone });
    });

    if (toInsert.length > 0) {
      await this.db.insert(campaignTargets).values(toInsert);
    }

    const accepted = results.filter((r) => r.accepted).length;
    return { accepted, rejected: results.length - accepted, results };
  }
}
