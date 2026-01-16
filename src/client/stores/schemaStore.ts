/**
 * Schema state management with Zustand
 */

import { create } from 'zustand';
import { schemasApi } from '../services/schemas.js';
import type { GuiSchema, ValidationError, PreviewResult, PreviewType } from '../../shared/types.js';

interface SchemaStore {
  // State
  schemas: Record<string, GuiSchema>;
  selectedSchema: string | null;
  loading: boolean;
  error: string | null;
  validationErrors: ValidationError[];
  previews: PreviewResult[];
  previewType: PreviewType;

  // Actions
  loadSchemas: () => Promise<void>;
  selectSchema: (name: string | null) => void;
  createSchema: (schema: GuiSchema) => Promise<void>;
  updateSchema: (name: string, schema: GuiSchema) => Promise<void>;
  deleteSchema: (name: string) => Promise<void>;
  validateSchema: (schema?: GuiSchema) => Promise<void>;
  loadPreview: (type: PreviewType, name?: string) => Promise<void>;
  setSchemas: (schemas: Record<string, GuiSchema>) => void;
  updateSchemaInStore: (name: string, schema: GuiSchema) => void;
}

export const useSchemaStore = create<SchemaStore>((set) => ({
  // Initial state
  schemas: {},
  selectedSchema: null,
  loading: false,
  error: null,
  validationErrors: [],
  previews: [],
  previewType: 'laravel',

  // Actions
  loadSchemas: async () => {
    set({ loading: true, error: null });
    try {
      const schemas = await schemasApi.getAll();
      set({ schemas, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  selectSchema: (name: string | null) => {
    set({ selectedSchema: name, validationErrors: [] });
  },

  createSchema: async (schema: GuiSchema) => {
    set({ loading: true, error: null });
    try {
      const saved = await schemasApi.create(schema);
      set((state) => ({
        schemas: { ...state.schemas, [saved.name]: saved },
        loading: false,
      }));
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  updateSchema: async (name: string, schema: GuiSchema) => {
    set({ loading: true, error: null });
    try {
      const saved = await schemasApi.update(name, schema);
      set((state) => ({
        schemas: { ...state.schemas, [name]: saved },
        loading: false,
      }));
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  deleteSchema: async (name: string) => {
    set({ loading: true, error: null });
    try {
      await schemasApi.delete(name);
      set((state) => {
        const { [name]: _, ...rest } = state.schemas;
        return {
          schemas: rest,
          selectedSchema: state.selectedSchema === name ? null : state.selectedSchema,
          loading: false,
        };
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  validateSchema: async (schema?: GuiSchema) => {
    try {
      const result = await schemasApi.validate(schema);
      set({
        validationErrors: result.errors.map((e) => ({
          path: e.path,
          message: e.message,
          severity: 'error' as const,
        })),
      });
    } catch (e) {
      set({
        validationErrors: [
          {
            path: 'root',
            message: (e as Error).message,
            severity: 'error',
          },
        ],
      });
    }
  },

  loadPreview: async (type: PreviewType, name?: string) => {
    set({ loading: true, previewType: type });
    try {
      const previews = await schemasApi.preview(type, name);
      set({ previews, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setSchemas: (schemas: Record<string, GuiSchema>) => {
    set({ schemas });
  },

  updateSchemaInStore: (name: string, schema: GuiSchema) => {
    set((state) => ({
      schemas: { ...state.schemas, [name]: schema },
    }));
  },
}));
