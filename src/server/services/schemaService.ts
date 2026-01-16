/**
 * Schema CRUD service using omnify-core
 */

import { loadSchemas } from '@famgia/omnify-core';
import { resolveLocalizedString } from '@famgia/omnify-types';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { stringify } from 'yaml';
import type { GuiSchema, GuiEnumValue, GuiIndexDefinition } from '../../shared/types.js';

/**
 * Convert indexes from various formats to GuiIndexDefinition[]
 * Indexes can be:
 * - string: "column_name" -> { columns: ["column_name"] }
 * - string[]: ["col1", "col2"] -> { columns: ["col1", "col2"] }
 * - object: { columns: [...], unique: true } -> as-is
 */
function normalizeIndexes(indexes: unknown): GuiIndexDefinition[] | undefined {
  if (!indexes || !Array.isArray(indexes)) return undefined;

  return indexes.map((idx) => {
    // Already an object with columns property
    if (typeof idx === 'object' && idx !== null && 'columns' in idx) {
      return idx as GuiIndexDefinition;
    }
    // Array of column names (composite index)
    if (Array.isArray(idx)) {
      return { columns: idx.map(String) };
    }
    // Single column name as string
    return { columns: [String(idx)] };
  });
}

/**
 * Convert enum values from various formats to GuiEnumValue[]
 */
function normalizeEnumValues(values: unknown): GuiEnumValue[] | undefined {
  if (!values || !Array.isArray(values)) return undefined;

  return values.map((v) => {
    // Already an object with value property
    if (typeof v === 'object' && v !== null && 'value' in v) {
      const obj = v as Record<string, unknown>;
      return {
        value: String(obj.value),
        label: obj.label ? String(obj.label) : undefined,
        extra: obj.extra as GuiEnumValue['extra'],
      };
    }
    // Simple string value
    return { value: String(v) };
  });
}

class SchemaService {
  private cache: Map<string, Record<string, GuiSchema>> = new Map();

  async loadAll(schemasDir: string): Promise<Record<string, GuiSchema>> {
    try {
      const schemas = await loadSchemas(schemasDir);
      const guiSchemas: Record<string, GuiSchema> = {};

      for (const [name, schema] of Object.entries(schemas)) {
        // Normalize options with indexes
        const normalizedOptions = schema.options ? {
          ...schema.options,
          indexes: normalizeIndexes(schema.options.indexes),
        } : undefined;

        guiSchemas[name] = {
          name: schema.name,
          kind: schema.kind ?? 'object',
          displayName: resolveLocalizedString(schema.displayName),
          filePath: schema.filePath,
          relativePath: schema.relativePath,
          properties: schema.properties as GuiSchema['properties'],
          options: normalizedOptions as GuiSchema['options'],
          values: normalizeEnumValues(schema.values),
          isDirty: false,
          validationErrors: [],
        };
      }

      this.cache.set(schemasDir, guiSchemas);
      return guiSchemas;
    } catch (error) {
      // Return empty if no schemas found
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  async load(schemasDir: string, name: string): Promise<GuiSchema | null> {
    const schemas = await this.loadAll(schemasDir);
    return schemas[name] ?? null;
  }

  async save(schemasDir: string, schema: GuiSchema): Promise<GuiSchema> {
    // Extract fields that shouldn't be saved to YAML
    const {
      isDirty: _isDirty,
      validationErrors: _validationErrors,
      filePath,
      relativePath,
      name,       // Derived from filename, don't save
      kind,       // Only save if enum (object is default)
      ...yamlData
    } = schema;

    // Build YAML data - only include kind for enums
    const dataToSave = kind === 'enum'
      ? { kind, ...yamlData }
      : yamlData;

    // Use existing path if available (update), otherwise create at root (new)
    let targetPath: string;
    let targetRelativePath: string;

    if (filePath && relativePath) {
      // Updating existing schema - keep original location
      targetPath = filePath;
      targetRelativePath = relativePath;
    } else {
      // New schema - create at root of schemasDir
      const fileName = `${name}.yaml`;
      targetPath = join(schemasDir, fileName);
      targetRelativePath = fileName;
    }

    // Convert to YAML
    const yamlContent = stringify(dataToSave, {
      lineWidth: 120,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'PLAIN',
    });

    await writeFile(targetPath, yamlContent, 'utf-8');

    // Return updated schema with file path
    return {
      ...schema,
      filePath: targetPath,
      relativePath: targetRelativePath,
      isDirty: false,
      validationErrors: [],
    };
  }

  async delete(schemasDir: string, name: string): Promise<void> {
    // Find the schema to get its actual file path
    const schemas = await this.loadAll(schemasDir);
    const schema = schemas[name];

    if (!schema?.filePath) {
      throw new Error(`Schema "${name}" not found`);
    }

    await unlink(schema.filePath);

    // Clear cache
    this.cache.delete(schemasDir);
  }

  clearCache(schemasDir?: string): void {
    if (schemasDir) {
      this.cache.delete(schemasDir);
    } else {
      this.cache.clear();
    }
  }
}

export const schemaService = new SchemaService();
