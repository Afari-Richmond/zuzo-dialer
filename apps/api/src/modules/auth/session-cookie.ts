import type { Request, Response } from 'express';
import { SESSION_TTL_SECONDS } from './jwt-signing.service';

export const PLATFORM_COOKIE = 'platform_session';
export const TENANT_COOKIE = 'tenant_session';

export function isSecureRequest(req: Request): boolean {
  if (req.protocol === 'https') return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  return typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() === 'https';
}

/** SameSite=None is required once the frontend and API live on different
 * origins (e.g. Vercel + Render) — browsers refuse to send a Lax cookie on
 * a cross-site fetch. None requires Secure (HTTPS), so it's only safe to
 * use when the request actually arrived over HTTPS; local http dev falls
 * back to Lax, which is fine there since both sides are same-origin. */
export function setSessionCookie(
  res: Response,
  req: Request,
  name: string,
  token: string,
): void {
  const secure = isSecureRequest(req);
  const parts = [
    `${name}=${token}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${secure ? 'None' : 'Lax'}`,
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: Response, req: Request, name: string): void {
  const secure = isSecureRequest(req);
  const parts = [`${name}=`, 'Path=/', 'HttpOnly', `SameSite=${secure ? 'None' : 'Lax'}`, 'Max-Age=0'];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}
