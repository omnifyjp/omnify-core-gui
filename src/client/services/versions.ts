/**
 * Version history API operations
 */

import { api } from './client.js';
import type { VersionSummary, VersionFile, VersionDiff, VersionChange } from '@famgia/omnify-core';

/**
 * Pending changes result type
 */
export interface PendingChangesResult {
  hasChanges: boolean;
  changes: readonly VersionChange[];
  currentSchemaCount: number;
  previousSchemaCount: number;
  latestVersion: number | null;
}

/**
 * Create version result type
 */
export interface CreateVersionResult {
  version: number;
  migration: string;
  changes: readonly VersionChange[];
}

/**
 * Discard changes result type
 */
export interface DiscardChangesResult {
  restored: number;
  deleted: number;
}

export const versionsApi = {
  getAll: (): Promise<VersionSummary[]> => api.get('/api/versions'),

  get: (version: number): Promise<VersionFile> => api.get(`/api/versions/${version}`),

  getLatest: (): Promise<VersionFile | null> => api.get('/api/versions/latest'),

  getDiff: (from: number, to: number): Promise<VersionDiff> =>
    api.get(`/api/versions/diff/${from}/${to}`),

  getPending: (): Promise<PendingChangesResult> => api.get('/api/versions/pending'),

  createVersion: (description?: string): Promise<CreateVersionResult> =>
    api.post('/api/versions', { description }),

  discardChanges: (): Promise<DiscardChangesResult> =>
    api.post('/api/versions/discard'),
};
