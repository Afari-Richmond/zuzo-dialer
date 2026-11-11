import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantUsers, tenants } from '../../../db/schema';

@Injectable()
export class PlatformStatsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async overview() {
    const [tenantCounts] = await this.db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        active: sql<number>`count(*) filter (where ${tenants.status} = 'active')`.mapWith(Number),
        trial: sql<number>`count(*) filter (where ${tenants.status} = 'trial')`.mapWith(Number),
        suspended: sql<number>`count(*) filter (where ${tenants.status} = 'suspended')`.mapWith(Number),
      })
      .from(tenants);

    const [userCounts] = await this.db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        active: sql<number>`count(*) filter (where ${tenantUsers.status} = 'active')`.mapWith(Number),
      })
      .from(tenantUsers);

    return { tenants: tenantCounts, tenantUsers: userCounts };
  }
}
