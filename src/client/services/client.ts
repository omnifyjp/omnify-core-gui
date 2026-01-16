/**
 * API client for Omnify GUI
 */

import type { ApiResponse } from '../../shared/types.js';

const BASE_URL = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(BASE_URL + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new Error(data.error?.message ?? 'Request failed');
  }

  return data.data as T;
}

export const api = {
  get: <T>(url: string): Promise<T> => request<T>(url),

  post: <T>(url: string, body?: unknown): Promise<T> =>
    request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(url: string, body: unknown): Promise<T> =>
    request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(url: string): Promise<T> =>
    request<T>(url, {
      method: 'DELETE',
    }),
};
