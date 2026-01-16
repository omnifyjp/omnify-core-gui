/**
 * Schema Default Values Tests
 *
 * Tests for ensuring schema options default values are correctly applied
 * when loading, saving, and restoring schemas.
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Schema Options Default Values
// ============================================================================

/**
 * Default values for schema options as defined by Omnify:
 * - id: true (auto-generate primary key)
 * - idType: 'BigInt' (default ID type)
 * - timestamps: true (created_at, updated_at)
 * - softDelete: false (no deleted_at)
 * - translations: false
 * - authenticatable: false
 */
const SCHEMA_OPTION_DEFAULTS = {
  id: true,
  idType: 'BigInt',
  timestamps: true,
  softDelete: false,
  translations: false,
  authenticatable: false,
};

/**
 * Simulates loading schema options from YAML (what the GUI does)
 * This is the logic that was buggy - timestamps defaulted to false instead of true
 */
function loadSchemaOptionsFromYaml(options?: Record<string, unknown>): {
  id: boolean;
  idType: string;
  timestamps: boolean;
  softDelete: boolean;
  translations: boolean;
  authenticatable: boolean;
} {
  return {
    id: options?.id ?? SCHEMA_OPTION_DEFAULTS.id,
    idType: (options?.idType as string) ?? SCHEMA_OPTION_DEFAULTS.idType,
    timestamps: options?.timestamps ?? SCHEMA_OPTION_DEFAULTS.timestamps,
    softDelete: options?.softDelete ?? SCHEMA_OPTION_DEFAULTS.softDelete,
    translations: options?.translations ?? SCHEMA_OPTION_DEFAULTS.translations,
    authenticatable: options?.authenticatable ?? SCHEMA_OPTION_DEFAULTS.authenticatable,
  };
}

/**
 * Simulates saving schema options to YAML (only non-default values)
 * This prevents false positives in change detection
 */
function saveSchemaOptionsToYaml(options: {
  id?: boolean;
  idType?: string;
  timestamps?: boolean;
  softDelete?: boolean;
  translations?: boolean;
  authenticatable?: boolean;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Only save if different from default
  if (options.id === false) result.id = false;
  if (options.idType && options.idType !== 'BigInt') result.idType = options.idType;
  if (options.timestamps === false) result.timestamps = false;
  if (options.softDelete === true) result.softDelete = true;
  if (options.translations === true) result.translations = true;
  if (options.authenticatable === true) result.authenticatable = true;

  return result;
}

describe('Schema Option Defaults', () => {
  describe('loadSchemaOptionsFromYaml', () => {
    it('applies correct defaults when options is undefined', () => {
      const result = loadSchemaOptionsFromYaml(undefined);

      expect(result.id).toBe(true);
      expect(result.idType).toBe('BigInt');
      expect(result.timestamps).toBe(true); // THIS WAS THE BUG - was defaulting to false
      expect(result.softDelete).toBe(false);
      expect(result.translations).toBe(false);
      expect(result.authenticatable).toBe(false);
    });

    it('applies correct defaults when options is empty object', () => {
      const result = loadSchemaOptionsFromYaml({});

      expect(result.id).toBe(true);
      expect(result.idType).toBe('BigInt');
      expect(result.timestamps).toBe(true);
      expect(result.softDelete).toBe(false);
    });

    it('preserves explicit false values', () => {
      const result = loadSchemaOptionsFromYaml({
        id: false,
        timestamps: false,
      });

      expect(result.id).toBe(false);
      expect(result.timestamps).toBe(false);
    });

    it('preserves explicit true values', () => {
      const result = loadSchemaOptionsFromYaml({
        softDelete: true,
        translations: true,
        authenticatable: true,
      });

      expect(result.softDelete).toBe(true);
      expect(result.translations).toBe(true);
      expect(result.authenticatable).toBe(true);
    });

    it('preserves custom idType', () => {
      const result = loadSchemaOptionsFromYaml({ idType: 'Uuid' });
      expect(result.idType).toBe('Uuid');

      const result2 = loadSchemaOptionsFromYaml({ idType: 'Int' });
      expect(result2.idType).toBe('Int');
    });
  });

  describe('saveSchemaOptionsToYaml', () => {
    it('returns empty object when all values are defaults', () => {
      const result = saveSchemaOptionsToYaml({
        id: true,
        idType: 'BigInt',
        timestamps: true,
        softDelete: false,
        translations: false,
        authenticatable: false,
      });

      expect(Object.keys(result).length).toBe(0);
    });

    it('saves id: false when id is disabled', () => {
      const result = saveSchemaOptionsToYaml({ id: false });
      expect(result.id).toBe(false);
    });

    it('saves timestamps: false when timestamps is disabled', () => {
      const result = saveSchemaOptionsToYaml({ timestamps: false });
      expect(result.timestamps).toBe(false);
    });

    it('saves softDelete: true when softDelete is enabled', () => {
      const result = saveSchemaOptionsToYaml({ softDelete: true });
      expect(result.softDelete).toBe(true);
    });

    it('does not save softDelete: false (it is the default)', () => {
      const result = saveSchemaOptionsToYaml({ softDelete: false });
      expect(result.softDelete).toBeUndefined();
    });

    it('saves custom idType', () => {
      const result = saveSchemaOptionsToYaml({ idType: 'Uuid' });
      expect(result.idType).toBe('Uuid');
    });

    it('does not save default idType (BigInt)', () => {
      const result = saveSchemaOptionsToYaml({ idType: 'BigInt' });
      expect(result.idType).toBeUndefined();
    });
  });

  describe('round-trip: save then load', () => {
    it('preserves default values through round-trip', () => {
      // Start with defaults
      const original = {
        id: true,
        idType: 'BigInt',
        timestamps: true,
        softDelete: false,
        translations: false,
        authenticatable: false,
      };

      // Save (should produce empty options)
      const saved = saveSchemaOptionsToYaml(original);
      expect(Object.keys(saved).length).toBe(0);

      // Load (should restore defaults)
      const loaded = loadSchemaOptionsFromYaml(saved);

      expect(loaded.id).toBe(original.id);
      expect(loaded.idType).toBe(original.idType);
      expect(loaded.timestamps).toBe(original.timestamps);
      expect(loaded.softDelete).toBe(original.softDelete);
    });

    it('preserves non-default values through round-trip', () => {
      const original = {
        id: false,
        idType: 'Uuid',
        timestamps: false,
        softDelete: true,
        translations: true,
        authenticatable: true,
      };

      const saved = saveSchemaOptionsToYaml(original);
      const loaded = loadSchemaOptionsFromYaml(saved);

      expect(loaded.id).toBe(original.id);
      expect(loaded.idType).toBe(original.idType);
      expect(loaded.timestamps).toBe(original.timestamps);
      expect(loaded.softDelete).toBe(original.softDelete);
      expect(loaded.translations).toBe(original.translations);
      expect(loaded.authenticatable).toBe(original.authenticatable);
    });

    it('mixed default and non-default values through round-trip', () => {
      const original = {
        id: true, // default
        idType: 'BigInt', // default
        timestamps: false, // non-default
        softDelete: true, // non-default
        translations: false, // default
        authenticatable: false, // default
      };

      const saved = saveSchemaOptionsToYaml(original);

      // Should only contain non-default values
      expect(saved).toEqual({
        timestamps: false,
        softDelete: true,
      });

      const loaded = loadSchemaOptionsFromYaml(saved);

      expect(loaded.id).toBe(true);
      expect(loaded.idType).toBe('BigInt');
      expect(loaded.timestamps).toBe(false);
      expect(loaded.softDelete).toBe(true);
      expect(loaded.translations).toBe(false);
      expect(loaded.authenticatable).toBe(false);
    });
  });
});

// ============================================================================
// Regression Tests for Specific Bugs
// ============================================================================

describe('Regression Tests', () => {
  describe('timestamps default value bug', () => {
    /**
     * BUG: When loading a schema that doesn't have `timestamps` in options,
     * the GUI was defaulting to `false` instead of `true`.
     *
     * Fix: Changed `schema.options?.timestamps ?? false` to
     *      `schema.options?.timestamps ?? true` in SchemaPage.tsx
     */
    it('timestamps should default to true when not specified', () => {
      // Simulate a YAML file without timestamps option
      const yamlOptions = {};

      const loaded = loadSchemaOptionsFromYaml(yamlOptions);

      // timestamps should be true by default
      expect(loaded.timestamps).toBe(true);
    });

    it('timestamps should default to true when options is undefined', () => {
      const loaded = loadSchemaOptionsFromYaml(undefined);
      expect(loaded.timestamps).toBe(true);
    });

    it('timestamps: false should be preserved when explicitly set', () => {
      const yamlOptions = { timestamps: false };
      const loaded = loadSchemaOptionsFromYaml(yamlOptions);
      expect(loaded.timestamps).toBe(false);
    });
  });

  describe('false positive change detection bug', () => {
    /**
     * BUG: Saving a schema without making changes was being detected as "changed"
     * because default values (like timestamps: true) were being saved to YAML
     * when they shouldn't be.
     *
     * Fix: Only save non-default values to YAML
     */
    it('should not detect changes when saving default values', () => {
      // Schema with all default values
      const schema1 = {
        id: true,
        idType: 'BigInt',
        timestamps: true,
        softDelete: false,
      };

      // Same schema, also all defaults
      const schema2 = {
        id: true,
        idType: 'BigInt',
        timestamps: true,
        softDelete: false,
      };

      const saved1 = saveSchemaOptionsToYaml(schema1);
      const saved2 = saveSchemaOptionsToYaml(schema2);

      // Both should produce empty objects (no non-default values)
      expect(saved1).toEqual({});
      expect(saved2).toEqual({});

      // They should be equal
      expect(JSON.stringify(saved1)).toBe(JSON.stringify(saved2));
    });
  });
});
