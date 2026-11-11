export interface PlatformJwtPayload {
  typ: 'platform';
  sub: string; // platformAdminId
  role: 'platform_admin';
}

export interface TenantJwtPayload {
  typ: 'tenant';
  sub: string; // tenantUserId
  tenantId: string;
  role: 'tenant_admin' | 'agent';
}

export type ActorPayload = PlatformJwtPayload | TenantJwtPayload;

export interface PlatformActor {
  kind: 'platform';
  platformAdminId: string;
}

export interface TenantActor {
  kind: 'tenant';
  tenantUserId: string;
  tenantId: string;
  role: 'tenant_admin' | 'agent';
}

export type Actor = PlatformActor | TenantActor;
