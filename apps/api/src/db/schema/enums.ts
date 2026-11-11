import { pgEnum } from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', [
  'trial',
  'active',
  'suspended',
]);

export const platformAdminStatusEnum = pgEnum('platform_admin_status', [
  'active',
  'suspended',
]);

export const tenantUserRoleEnum = pgEnum('tenant_user_role', [
  'tenant_admin',
  'agent',
]);

export const tenantUserStatusEnum = pgEnum('tenant_user_status', [
  'invited',
  'active',
  'suspended',
]);

export const telephonyProviderEnum = pgEnum('telephony_provider', [
  'livehub',
  'twilio',
  'africastalking',
  'stub',
]);

export const authLoginScopeEnum = pgEnum('auth_login_scope', [
  'platform',
  'tenant',
]);
