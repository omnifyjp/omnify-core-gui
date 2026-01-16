/**
 * Schema API operations
 */

import { api } from './client.js';
import type { GuiSchema, PreviewResult, PreviewType } from '../../shared/types.js';

export const schemasApi = {
  getAll: (): Promise<Record<string, GuiSchema>> => api.get('/api/schemas'),

  get: (name: string): Promise<GuiSchema> => api.get(`/api/schemas/${name}`),

  create: (schema: GuiSchema): Promise<GuiSchema> => api.post('/api/schemas', schema),

  update: (name: string, schema: GuiSchema): Promise<GuiSchema> =>
    api.put(`/api/schemas/${name}`, schema),

  delete: (name: string): Promise<void> => api.delete(`/api/schemas/${name}`),

  validate: (
    schema?: GuiSchema
  ): Promise<{ valid: boolean; errors: { path: string; message: string }[] }> =>
    api.post('/api/validate', schema ? { schema } : {}),

  preview: (type: PreviewType, name?: string): Promise<PreviewResult[]> =>
    name ? api.get(`/api/preview/${type}/${name}`) : api.get(`/api/preview/${type}`),
};
