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

export const voiceOutboundStatusEnum = pgEnum('voice_outbound_status', [
  'queued',
  'dialing',
  'answered',
  'machine',
  'no_answer',
  'failed',
  'completed',
  'dnc',
  'outside_window',
]);

export const campaignOutcomeEnum = pgEnum('campaign_outcome', [
  'interested',
  'not_interested',
  'callback_requested',
  'wrong_number',
  'converted',
  'no_decision_yet',
  'other',
]);

export const campaignNextStepEnum = pgEnum('campaign_next_step', [
  'schedule_follow_up',
  'send_email_sms',
  'escalate_to_agent',
  'add_to_dnc',
  'no_action_needed',
]);

export const voiceCallDirectionEnum = pgEnum('voice_call_direction', [
  'inbound',
  'outbound',
]);

export const voiceCallStatusEnum = pgEnum('voice_call_status', [
  'ringing',
  'in_progress',
  'completed',
  'failed',
  'transferred',
  'voicemail',
  'no_answer',
  'busy',
]);
