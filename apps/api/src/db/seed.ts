import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { createDb } from './client';
import { platformAdmins, tenantUsers, tenants } from './schema';

const DEV_PASSWORD = 'ChangeMe123!';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, client } = createDb(url);

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  const [admin] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.email, 'admin@zuzo-dialer.local'))
    .limit(1);
  if (!admin) {
    await db.insert(platformAdmins).values({
      email: 'admin@zuzo-dialer.local',
      passwordHash,
      displayName: 'Platform Admin',
    });
    console.log('Seeded platform admin: admin@zuzo-dialer.local / ' + DEV_PASSWORD);
  } else {
    console.log('Platform admin already exists, skipping.');
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'acme'))
    .limit(1);
  const tenantId =
    tenant?.id ??
    (
      await db
        .insert(tenants)
        .values({ name: 'Acme Co (demo)', slug: 'acme', status: 'active' })
        .returning({ id: tenants.id })
    )[0].id;
  if (!tenant) console.log('Seeded demo tenant: acme');

  const [owner] = await db
    .select()
    .from(tenantUsers)
    .where(eq(tenantUsers.email, 'owner@acme.test'))
    .limit(1);
  if (!owner) {
    await db.insert(tenantUsers).values({
      tenantId,
      email: 'owner@acme.test',
      passwordHash,
      displayName: 'Acme Owner',
      role: 'tenant_admin',
      status: 'active',
    });
    console.log('Seeded tenant admin: owner@acme.test / ' + DEV_PASSWORD);
  } else {
    console.log('Tenant admin already exists, skipping.');
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
