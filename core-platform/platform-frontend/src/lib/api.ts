const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export interface User {
  id: string;
  username: string;
  globalRole: 'admin' | 'user';
  isActive: boolean;
  apps?: App[];
}

export interface App {
  id: string;
  name: string;
  slug: string;
  type: 'internal' | 'external';
  internalPath?: string;
  externalUrl?: string;
  iconSymbol?: string;
  isBeta?: boolean;
  iconKey?: string;
  version: string;
  isActive: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface VersionMeta {
  version: string;
  build: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error?.message || 'An error occurred');
  }

  return response.json();
}

export async function login(username: string, password: string) {
  return fetchApi<{ user: User }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  return fetchApi<{ message: string }>('/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<{ user: User }> {
  return fetchApi<{ user: User }>('/me');
}

export async function getVersionMeta(): Promise<VersionMeta> {
  return fetchApi<VersionMeta>('/meta/version');
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  return fetchApi<{ message: string }>('/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// Admin APIs
export async function getUsers() {
  return fetchApi<{ users: any[] }>('/admin/users');
}

export async function createUser(userData: any) {
  return fetchApi<{ user: any }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id: string, userData: any) {
  return fetchApi<{ user: any }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
}

export async function setUserPassword(id: string, password: string) {
  return fetchApi<{ message: string }>(`/admin/users/${id}/password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function getApps() {
  return fetchApi<{ apps: App[] }>('/admin/apps');
}

export async function createApp(appData: any) {
  return fetchApi<{ app: App }>('/admin/apps', {
    method: 'POST',
    body: JSON.stringify(appData),
  });
}

export async function updateApp(id: string, appData: any) {
  return fetchApi<{ app: App }>(`/admin/apps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(appData),
  });
}

export async function deleteApp(id: string) {
  return fetchApi<{ app: App }>(`/admin/apps/${id}`, {
    method: 'DELETE',
  });
}

export async function getAuditLogs(limit = 100, offset = 0) {
  return fetchApi<{ logs: any[]; pagination: any }>(
    `/admin/audit?limit=${limit}&offset=${offset}`
  );
}
