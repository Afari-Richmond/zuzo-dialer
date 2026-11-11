export interface StubCredentials {}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  from?: string;
  webhookSecret?: string;
}

export interface AfricaTalkingCredentials {
  username: string;
  apiKey: string;
  from?: string;
  webhookSecret?: string;
}

export interface LiveHubCredentials {
  clientId: string;
  clientSecret: string;
  outreachBotId: string;
}

export type ProviderCredentials =
  | { provider: 'stub'; credentials: StubCredentials }
  | { provider: 'twilio'; credentials: TwilioCredentials }
  | { provider: 'africastalking'; credentials: AfricaTalkingCredentials }
  | { provider: 'livehub'; credentials: LiveHubCredentials };

export const REQUIRED_CREDENTIAL_FIELDS: Record<ProviderCredentials['provider'], string[]> = {
  stub: [],
  twilio: ['accountSid', 'authToken'],
  africastalking: ['username', 'apiKey'],
  livehub: ['clientId', 'clientSecret', 'outreachBotId'],
};
