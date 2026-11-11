import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/database.module';
import type { Database } from '../src/db/client';
import { tenantUsers, tenants } from '../src/db/schema';
import { tenantWhere } from '../src/common/tenant-scope';

/**
 * Standing regression test for tenant isolation — run from M1 onward and
 * extended as each milestone adds tenant-scoped tables/endpoints. Seeds two
 * fully separate tenants and asserts there is no way to see across them,
 * either through the query-layer guard-rail or through the auth guards.
 */
describe('tenant isolation', () => {
  let app: INestApplication;
  let db: Database;
  const password = 'IsolationTest123!';

  let tenantA: { id: string };
  let tenantB: { id: string };
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await app.init();
    db = moduleRef.get(DRIZZLE);

    const passwordHash = await bcrypt.hash(password, 12);
    const suffix = Date.now();

    [tenantA] = await db
      .insert(tenants)
      .values({ name: `Isolation Tenant A ${suffix}`, slug: `iso-a-${suffix}`, status: 'active' })
      .returning({ id: tenants.id });
    [tenantB] = await db
      .insert(tenants)
      .values({ name: `Isolation Tenant B ${suffix}`, slug: `iso-b-${suffix}`, status: 'active' })
      .returning({ id: tenants.id });

    [userA] = await db
      .insert(tenantUsers)
      .values({
        tenantId: tenantA.id,
        email: `owner-a-${suffix}@isolation.test`,
        passwordHash,
        displayName: 'Tenant A Owner',
        role: 'tenant_admin',
        status: 'active',
      })
      .returning({ id: tenantUsers.id, email: tenantUsers.email });
    [userB] = await db
      .insert(tenantUsers)
      .values({
        tenantId: tenantB.id,
        email: `owner-b-${suffix}@isolation.test`,
        passwordHash,
        displayName: 'Tenant B Owner',
        role: 'tenant_admin',
        status: 'active',
      })
      .returning({ id: tenantUsers.id, email: tenantUsers.email });
  });

  afterAll(async () => {
    await db.delete(tenants).where(eq(tenants.id, tenantA.id));
    await db.delete(tenants).where(eq(tenants.id, tenantB.id));
    await app.close();
  });

  it('query-layer: tenantWhere() excludes every row from the other tenant', async () => {
    const rowsForA = await db
      .select()
      .from(tenantUsers)
      .where(tenantWhere(tenantUsers.tenantId, tenantA.id));
    expect(rowsForA.map((r) => r.id)).toContain(userA.id);
    expect(rowsForA.map((r) => r.id)).not.toContain(userB.id);

    const rowsForB = await db
      .select()
      .from(tenantUsers)
      .where(tenantWhere(tenantUsers.tenantId, tenantB.id));
    expect(rowsForB.map((r) => r.id)).toContain(userB.id);
    expect(rowsForB.map((r) => r.id)).not.toContain(userA.id);
  });

  it("auth: tenant A's session only ever reports tenant A's id, never tenant B's", async () => {
    const server = app.getHttpServer();
    const loginRes = await request(server)
      .post('/api/v1/tenant/auth/login')
      .send({ email: userA.email, password });
    expect(loginRes.status).toBe(201);
    const cookie = loginRes.headers['set-cookie'];

    const meRes = await request(server).get('/api/v1/tenant/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.tenantId).toBe(tenantA.id);
    expect(meRes.body.tenantId).not.toBe(tenantB.id);
  });

  it('auth: suspending tenant B does not affect tenant A sessions', async () => {
    const server = app.getHttpServer();

    await db.update(tenants).set({ status: 'suspended' }).where(eq(tenants.id, tenantB.id));

    const loginA = await request(server)
      .post('/api/v1/tenant/auth/login')
      .send({ email: userA.email, password });
    const cookieA = loginA.headers['set-cookie'];
    const meA = await request(server).get('/api/v1/tenant/auth/me').set('Cookie', cookieA);
    expect(meA.status).toBe(200);

    const meB = await request(server)
      .get('/api/v1/tenant/auth/me')
      .set('Cookie', [`tenant_session=${'not-a-real-token'}`]);
    expect(meB.status).toBe(401);

    await db.update(tenants).set({ status: 'active' }).where(eq(tenants.id, tenantB.id));
  });
});
