import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { tenantUsers } from './tenant-users';
import { tenantTelephonyCredentials } from './tenant-telephony-credentials';
import { campaigns } from './campaigns';
import { campaignTargets } from './campaign-targets';
import { callOutcomes } from './call-outcomes';
import { campaignReports } from './campaign-reports';
import { voiceCalls } from './voice-calls';
import { dncEntries } from './dnc-entries';

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(tenantUsers),
  telephonyCredentials: many(tenantTelephonyCredentials),
  campaigns: many(campaigns),
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

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, { fields: [campaigns.tenantId], references: [tenants.id] }),
  credential: one(tenantTelephonyCredentials, {
    fields: [campaigns.credentialId],
    references: [tenantTelephonyCredentials.id],
  }),
  targets: many(campaignTargets),
  report: one(campaignReports, {
    fields: [campaigns.id],
    references: [campaignReports.campaignId],
  }),
}));

export const campaignTargetsRelations = relations(campaignTargets, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [campaignTargets.campaignId], references: [campaigns.id] }),
  outcomes: many(callOutcomes),
}));

export const callOutcomesRelations = relations(callOutcomes, ({ one }) => ({
  campaign: one(campaigns, { fields: [callOutcomes.campaignId], references: [campaigns.id] }),
  target: one(campaignTargets, {
    fields: [callOutcomes.targetId],
    references: [campaignTargets.id],
  }),
}));

export const voiceCallsRelations = relations(voiceCalls, ({ one }) => ({
  campaign: one(campaigns, { fields: [voiceCalls.campaignId], references: [campaigns.id] }),
  target: one(campaignTargets, {
    fields: [voiceCalls.targetId],
    references: [campaignTargets.id],
  }),
}));

export const dncEntriesRelations = relations(dncEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [dncEntries.tenantId], references: [tenants.id] }),
}));
