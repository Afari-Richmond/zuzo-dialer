import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { dncEntries } from '../../../db/schema';
import { tenantWhere } from '../../../common/tenant-scope';
import { notFound } from '../../../common/errors';
import type { AddDncDto } from './dto/dnc.dto';

@Injectable()
export class DncService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  list(tenantId: string) {
    return this.db.select().from(dncEntries).where(tenantWhere(dncEntries.tenantId, tenantId));
  }

  async add(tenantId: string, dto: AddDncDto) {
    const [row] = await this.db
      .insert(dncEntries)
      .values({ tenantId, phone: dto.phone, reason: dto.reason, source: 'manual' })
      .onConflictDoUpdate({
        target: [dncEntries.tenantId, dncEntries.phone],
        set: { reason: dto.reason },
      })
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    const [existing] = await this.db
      .select({ id: dncEntries.id })
      .from(dncEntries)
      .where(and(tenantWhere(dncEntries.tenantId, tenantId), eq(dncEntries.id, id)))
      .limit(1);
    if (!existing) throw notFound('DNC_ENTRY_NOT_FOUND', 'DNC entry not found');
    await this.db.delete(dncEntries).where(eq(dncEntries.id, id));
    return { ok: true };
  }

  async isListed(tenantId: string, phone: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: dncEntries.id })
      .from(dncEntries)
      .where(and(tenantWhere(dncEntries.tenantId, tenantId), eq(dncEntries.phone, phone)))
      .limit(1);
    return !!row;
  }
}
