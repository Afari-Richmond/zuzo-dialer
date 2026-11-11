/**
 * Ported as-is from the old repo's SpokenInputService.normalizeGhanaPhone
 * (minus the spoken-word-to-digits step, which only applied to live ASR
 * input). Ghana-specific — other-country tenants will need their own
 * normalization added here later; flagging rather than silently
 * generalizing it away.
 */
export function normalizeGhanaPhone(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;
  let local = digits;
  if (local.startsWith('233') && local.length >= 12) {
    local = `0${local.slice(3)}`;
  } else if (local.length === 9 && !local.startsWith('0')) {
    local = `0${local}`;
  }
  if (/^0\d{9}$/.test(local)) return local;
  return undefined;
}
