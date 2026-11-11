import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

export function createDb(connectionString: string): {
  db: Database;
  client: ReturnType<typeof postgres>;
} {
  const client = postgres(connectionString, {
    // Neon pooler-friendly defaults (harmless against plain local Postgres too)
    prepare: false,
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    connection: {
      statement_timeout: 10_000,
      idle_in_transaction_session_timeout: 10_000,
    },
  });
  const db = drizzle(client, { schema });
  return { db, client };
}
