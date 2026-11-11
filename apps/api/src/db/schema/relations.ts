import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { tenantUsers } from './tenant-users';
import { tenantTelephonyCredentials } from './tenant-telephony-credentials';

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(tenantUsers),
  telephonyCredentials: many(tenantTelephonyCredentials),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantTelephonyCredentialsRelations = relations(
  tenantTelephonyCredentials,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [tenantTelephonyCredentials.tenantId],
      references: [tenants.id],
    }),
    createdByUser: one(tenantUsers, {
      fields: [tenantTelephonyCredentials.createdBy],
      references: [tenantUsers.id],
    }),
  }),
);
