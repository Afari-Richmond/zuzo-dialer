import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDb, type Database } from './client';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) {
          throw new Error('DATABASE_URL is not set');
        }
        const { db } = createDb(url);
        return db;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
