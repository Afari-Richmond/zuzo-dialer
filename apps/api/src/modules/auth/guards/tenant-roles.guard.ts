import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { forbidden } from '../../../common/errors';
import type { ActorRequest } from '../current-actor.decorator';
import type { TenantActor } from '../jwt-types';

export const TENANT_ROLES_KEY = 'tenantRoles';
export const TenantRoles = (...roles: Array<TenantActor['role']>) =>
  SetMetadata(TENANT_ROLES_KEY, roles);

@Injectable()
export class TenantRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Array<TenantActor['role']>>(
      TENANT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<ActorRequest>();
    const actor = req.actor;
    if (!actor || actor.kind !== 'tenant' || !required.includes(actor.role)) {
      throw forbidden('TENANT_ROLE_FORBIDDEN', `Requires role: ${required.join(' or ')}`);
    }
    return true;
  }
}
