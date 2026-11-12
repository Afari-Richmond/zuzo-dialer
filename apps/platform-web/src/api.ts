export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.errorCode || 'ERROR', body.message || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type PlatformActor = { role: 'platform_admin'; platformAdminId: string };

export const auth = {
  login: (email: string, password: string) =>
    request<{ ok: true }>('/platform/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/platform/auth/logout', { method: 'POST' }),
  me: () => request<PlatformActor>('/platform/auth/me'),
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: 'trial' | 'active' | 'suspended';
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TenantAdminSettings = {
  plan: 'trial' | 'starter' | 'growth' | 'scale' | 'custom';
  monthlyMinuteQuota: number | null;
  ratePerMinuteCents: number | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  notes: string | null;
};

export const tenants = {
  list: (q?: string) => request<{ tenants: Tenant[] }>(`/platform/tenants${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (dto: { name: string; slug: string; adminEmail: string; adminDisplayName: string }) =>
    request<{ tenant: Tenant; adminUser: { email: string } }>('/platform/tenants', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  suspend: (id: string) => request<{ tenant: Tenant }>(`/platform/tenants/${id}/suspend`, { method: 'POST' }),
  activate: (id: string) => request<{ tenant: Tenant }>(`/platform/tenants/${id}/activate`, { method: 'POST' }),
  remove: (id: string) => request<{ ok: true }>(`/platform/tenants/${id}`, { method: 'DELETE' }),
  getAdminSettings: (id: string) =>
    request<{ adminSettings: TenantAdminSettings }>(`/platform/tenants/${id}/admin-settings`).then(
      (d) => d.adminSettings,
    ),
  updateAdminSettings: (id: string, dto: Partial<TenantAdminSettings>) =>
    request<{ adminSettings: TenantAdminSettings }>(`/platform/tenants/${id}/admin-settings`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }).then((d) => d.adminSettings),
};

export type PlatformAdmin = {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
};

export const platformAdmins = {
  list: () => request<{ admins: PlatformAdmin[] }>('/platform/platform-admins'),
  create: (dto: { email: string; password: string; displayName: string }) =>
    request<{ admin: PlatformAdmin }>('/platform/platform-admins', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: { displayName?: string; status?: string }) =>
    request<{ admin: PlatformAdmin }>(`/platform/platform-admins/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  remove: (id: string) => request<{ ok: true }>(`/platform/platform-admins/${id}`, { method: 'DELETE' }),
};

export type PlatformStats = {
  tenants: { total: number; active: number; trial: number; suspended: number };
  tenantUsers: { total: number; active: number };
};

export const stats = {
  overview: () => request<PlatformStats>('/platform/stats'),
};
