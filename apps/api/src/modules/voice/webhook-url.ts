/** Shared by whoever starts a call (to tell the provider where to POST
 * status updates) and the webhook handler itself (Twilio's signature is
 * computed over this exact URL, so both sides must derive it identically). */
export function voiceWebhookUrl(publicApiUrl: string, tenantId: string): string {
  return `${publicApiUrl.replace(/\/+$/, '')}/api/v1/webhooks/voice/${tenantId}/status`;
}
