import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { Database } from '../../db/client';
import { idempotencyKeys } from '../../db/schema';
import { conflict } from '../errors';
import type { ActorRequest } from '../../modules/auth/current-actor.decorator';

const STALE_CLAIM_MS = 60_000;

type Claim = { status: string; responseBody: unknown };

/**
 * Opt-in via an `Idempotency-Key` header (ignored if absent, so every
 * existing caller is unaffected). A retried request with the same key on
 * the same route — a client timeout-and-retry, a double-click, a flaky
 * connection — gets back the original response instead of the handler
 * (and its side effect, e.g. dialing a number) running again. A second
 * request arriving while the first is still in flight gets 409, not a
 * second execution: the DB's unique constraint on (tenant, key, route) is
 * the actual race winner, not an application-level check-then-insert.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<ActorRequest>();
    const key = req.header('Idempotency-Key');
    if (!key || !req.actor || req.actor.kind !== 'tenant') {
      return next.handle();
    }
    const tenantId = req.actor.tenantId;
    const route = `${context.getClass().name}.${context.getHandler().name}`;

    return from(this.tryClaim(tenantId, key, route)).pipe(
      switchMap((existing) => {
        if (!existing) {
          return next.handle().pipe(
            tap({
              next: (body) => void this.complete(tenantId, key, route, body),
              error: () => void this.release(tenantId, key, route),
            }),
          );
        }
        if (existing.status === 'completed') {
          return of(existing.responseBody);
        }
        throw conflict('DUPLICATE_REQUEST', 'An identical request with this Idempotency-Key is already in progress');
      }),
    );
  }

  /** Returns null if this call claimed the key (handler should run), or the
   * existing claim if someone else already holds/held it. */
  private async tryClaim(tenantId: string, key: string, route: string): Promise<Claim | null> {
    try {
      await this.db.insert(idempotencyKeys).values({ tenantId, key, route, status: 'in_progress' });
      return null;
    } catch (err) {
      // drizzle-orm wraps the real postgres error (with .code) in a
      // DrizzleQueryError whose own .cause is that original error.
      const pgCode = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
      if (pgCode !== '23505') throw err;
      const [existing] = await this.db
        .select()
        .from(idempotencyKeys)
        .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.key, key), eq(idempotencyKeys.route, route)))
        .limit(1);
      if (!existing) return null;
      if (existing.status === 'in_progress' && Date.now() - existing.createdAt.getTime() > STALE_CLAIM_MS) {
        // Whoever held this claim never finished (crashed, timed out) — let a fresh attempt through.
        await this.db.delete(idempotencyKeys).where(eq(idempotencyKeys.id, existing.id));
        return this.tryClaim(tenantId, key, route);
      }
      return existing;
    }
  }

  private async complete(tenantId: string, key: string, route: string, body: unknown): Promise<void> {
    await this.db
      .update(idempotencyKeys)
      .set({ status: 'completed', responseBody: body })
      .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.key, key), eq(idempotencyKeys.route, route)));
  }

  /** A failed attempt releases its claim — the natural reason to retry is
   * that the first try failed, so a retry should actually run, not replay
   * the failure forever. */
  private async release(tenantId: string, key: string, route: string): Promise<void> {
    await this.db
      .delete(idempotencyKeys)
      .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.key, key), eq(idempotencyKeys.route, route)));
  }
}
