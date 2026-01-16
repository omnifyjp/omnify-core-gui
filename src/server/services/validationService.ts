/**
 * Schema validation service using omnify-core
 */

import { loadSchemas, validateSchemas, OmnifyError } from '@famgia/omnify-core';
import type { LoadedSchema, SchemaCollection, SchemaOptions } from '@famgia/omnify-types';
import { resolveLocalizedString } from '@famgia/omnify-types';
import type { GuiSchema, ValidationError } from '../../shared/types.js';

interface ValidateResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Convert GuiSchema to LoadedSchema format
 * Handles exactOptionalPropertyTypes by only setting defined properties
 */
function toLoadedSchema(schema: GuiSchema): LoadedSchema {
  // Start with required fields only
  const result = {
    name: schema.name,
    kind: schema.kind,
    filePath: schema.filePath,
    relativePath: schema.relativePath ?? schema.name + '.yaml',
  } as LoadedSchema;

  // Only add optional fields if they're defined
  if (schema.displayName !== undefined) {
    (result as { displayName: string }).displayName = schema.displayName;
  }
  if (schema.properties !== undefined) {
    (result as { properties: LoadedSchema['properties'] }).properties = schema.properties as LoadedSchema['properties'];
  }
  if (schema.options !== undefined) {
    (result as { options: SchemaOptions }).options = schema.options as SchemaOptions;
  }
  if (schema.values !== undefined) {
    // Convert GuiEnumValue[] to readonly string[] for validation
    (result as { values: readonly string[] }).values = schema.values.map((v) => v.value);
  }

  return result;
}

class ValidationService {
  async validateSchema(schema: GuiSchema, schemasDir: string): Promise<ValidateResult> {
    try {
      // Load all schemas to validate references
      const allSchemas = await loadSchemas(schemasDir);

      // Convert GuiSchema to LoadedSchema format
      const loadedSchema = toLoadedSchema(schema);

      // Create mutable copy and add the schema
      const schemasToValidate: Record<string, LoadedSchema> = { ...allSchemas };
      schemasToValidate[schema.name] = loadedSchema;

      // Validate all schemas together
      const result = validateSchemas(schemasToValidate);

      // Filter errors for this schema from schema results
      const schemaResult = result.schemas.find((s) => s.schemaName === schema.name);
      const schemaErrors: ValidationError[] = [];

      if (schemaResult) {
        for (const e of schemaResult.errors) {
          schemaErrors.push({
            path: this.getErrorPath(e, schema.name),
            message: e.message,
            severity: 'error' as const,
          });
        }
      }

      return {
        valid: schemaErrors.length === 0,
        errors: schemaErrors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: schema.name,
            message: (error as Error).message,
            severity: 'error',
          },
        ],
      };
    }
  }

  async validateAll(schemas: Record<string, GuiSchema>): Promise<ValidateResult> {
    try {
      // Convert GuiSchemas to LoadedSchemas
      const loadedSchemas: SchemaCollection = {};
      for (const [name, schema] of Object.entries(schemas)) {
        (loadedSchemas as Record<string, LoadedSchema>)[name] = toLoadedSchema(schema);
      }

      const result = validateSchemas(loadedSchemas);

      const errors: ValidationError[] = [];
      for (const schemaResult of result.schemas) {
        for (const e of schemaResult.errors) {
          errors.push({
            path: this.getErrorPath(e, schemaResult.schemaName),
            message: e.message,
            severity: 'error' as const,
          });
        }
      }

      return {
        valid: result.valid,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: 'root',
            message: (error as Error).message,
            severity: 'error',
          },
        ],
      };
    }
  }

  async validateFromDisk(schemasDir: string): Promise<ValidateResult> {
    try {
      const schemas = await loadSchemas(schemasDir);

      // Convert to GuiSchemas
      const guiSchemas: Record<string, GuiSchema> = {};
      for (const [name, schema] of Object.entries(schemas)) {
        guiSchemas[name] = {
          name: schema.name,
          kind: schema.kind ?? 'object',
          displayName: resolveLocalizedString(schema.displayName),
          filePath: schema.filePath,
          relativePath: schema.relativePath,
          properties: schema.properties as GuiSchema['properties'],
          options: schema.options as GuiSchema['options'],
          // Convert readonly string[] to GuiEnumValue[]
          values: schema.values?.map((v) => ({ value: v })),
        };
      }

      return this.validateAll(guiSchemas);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: 'root',
            message: (error as Error).message,
            severity: 'error',
          },
        ],
      };
    }
  }

  private getErrorPath(error: OmnifyError, schemaName: string): string {
    // Try to extract property name from the error message or details
    const details = error.details;
    if (details && 'propertyName' in details && details.propertyName) {
      return `${schemaName}.${String(details.propertyName)}`;
    }
    return schemaName;
  }
}

export const validationService = new ValidationService();
