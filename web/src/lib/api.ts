import { getAuthToken, setStoredAuth } from './auth-token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    // Token expired or invalid — drop it so the auth guard sends the user
    // back to /login instead of retrying the same request forever.
    setStoredAuth(null);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? response.statusText;
    throw new ApiError(response.status, Array.isArray(message) ? message.join(', ') : String(message));
  }

  return data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
};

export { API_BASE_URL };
