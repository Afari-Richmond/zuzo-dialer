import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { Database } from '../../db/client';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  async check() {
    await this.db.execute(sql`select 1`);
    return { status: 'ok', db: 'ok' };
  }
}
