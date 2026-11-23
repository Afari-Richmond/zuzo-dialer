import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { unauthorized } from '../../../common/errors';
import type { ActorRequest } from '../current-actor.decorator';
import { TenantApiKeysService } from '../../tenant/api-keys/tenant-api-keys.service';

/** Authenticates a request via `Authorization: Bearer <tenant API key>`
 * instead of the browser session cookie — for a tenant's own backend
 * systems calling our API directly (notification calls, future webhooks),
 * never for the dashboard itself. */
@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: TenantApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ActorRequest>();
    const header = req.headers.authorization;
    const rawKey = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
    if (!rawKey) {
      throw unauthorized('API_KEY_REQUIRED', 'Provide the tenant API key as a Bearer token');
    }

    const tenantId = await this.apiKeys.verify(rawKey);
    if (!tenantId) {
      throw unauthorized('INVALID_API_KEY', 'That API key is not valid');
    }

    req.actor = { kind: 'tenant', tenantUserId: 'api-key', tenantId, role: 'tenant_admin' };
    return true;
  }
}
