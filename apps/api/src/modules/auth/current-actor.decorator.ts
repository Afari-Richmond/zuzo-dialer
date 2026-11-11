import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Actor, PlatformActor, TenantActor } from './jwt-types';

export interface ActorRequest extends Request {
  actor?: Actor;
}

export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<ActorRequest>();
  if (!req.actor) {
    throw new Error('CurrentActor used without an auth guard populating req.actor');
  }
  return req.actor;
});

export const CurrentPlatformActor = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PlatformActor => {
    const req = ctx.switchToHttp().getRequest<ActorRequest>();
    if (!req.actor || req.actor.kind !== 'platform') {
      throw new Error('CurrentPlatformActor used outside a platform-guarded route');
    }
    return req.actor;
  },
);

export const CurrentTenantActor = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TenantActor => {
    const req = ctx.switchToHttp().getRequest<ActorRequest>();
    if (!req.actor || req.actor.kind !== 'tenant') {
      throw new Error('CurrentTenantActor used outside a tenant-guarded route');
    }
    return req.actor;
  },
);
