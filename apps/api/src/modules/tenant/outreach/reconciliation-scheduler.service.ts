import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenants } from '../../../db/schema';
import { OutboundDialerService } from './outbound-dialer.service';

const TICK_INTERVAL_MS = 60_000;

/**
 * Nothing else in this app calls drainQueue/reconcileOutboundStatuses
 * automatically (the tenant-facing /outreach/drain endpoint exists only for
 * manual/UI-triggered use, and @nestjs/schedule is avoided — its ESM-only
 * build breaks Jest's CJS test loader). Without this, LiveHub-provider
 * voiceCalls rows never get endedAt set, so anything that counts completed
 * call minutes (billing usage included) reads zero forever.
 */
@Injectable()
export class ReconciliationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly dialer: OutboundDialerService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), TICK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(inArray(tenants.status, ['trial', 'active']));
      for (const { id: tenantId } of rows) {
        try {
          await this.dialer.drainQueue(tenantId);
          await this.dialer.reconcileOutboundStatuses(tenantId);
        } catch (err) {
          this.logger.warn(`Reconcile tick failed for tenant ${tenantId}: ${(err as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
