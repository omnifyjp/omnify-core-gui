/**
 * Validation utilities for Omnify GUI
 *
 * This module provides browser-safe UI validation helpers.
 * For full schema validation, use the server API which calls @famgia/omnify-core.
 *
 * Note: The validation logic here mirrors @famgia/omnify-core validation,
 * but is duplicated for browser compatibility (core uses Node.js APIs).
 */

// ============================================================================
// Default Value Validation (browser-safe mirror of core validation)
// ============================================================================

/**
 * Validate default value based on property type.
 * This is a browser-safe implementation matching @famgia/omnify-core.
 */
export function validateDefaultValueUI(
  typeName: string,
  value: unknown,
  property?: { enum?: readonly string[] }
): ValidationResult {
  // Empty values are always valid
  if (value === undefined || value === null || value === '') {
    return { valid: true };
  }

  const strValue = String(value);

  switch (typeName) {
    // Numeric types
    case 'Int':
    case 'BigInt':
      if (!/^-?\d+$/.test(strValue)) {
        return { valid: false, error: 'Must be an integer' };
      }
      break;

    case 'Float':
    case 'Decimal':
      if (!/^-?\d+(\.\d+)?$/.test(strValue)) {
        return { valid: false, error: 'Must be a number' };
      }
      break;

    // Boolean
    case 'Boolean':
      if (!['true', 'false', '1', '0'].includes(strValue.toLowerCase())) {
        return { valid: false, error: 'Must be true or false' };
      }
      break;

    // Email
    case 'Email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
        return { valid: false, error: 'Must be a valid email address' };
      }
      break;

    // Temporal types
    case 'Date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
        return { valid: false, error: 'Must be in YYYY-MM-DD format' };
      }
      break;

    case 'Time':
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(strValue)) {
        return { valid: false, error: 'Must be in HH:MM or HH:MM:SS format' };
      }
      break;

    case 'DateTime':
    case 'Timestamp':
      if (!/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}(:\d{2})?/.test(strValue)) {
        return { valid: false, error: 'Must be in YYYY-MM-DD HH:MM:SS format' };
      }
      break;

    // Special types
    case 'Json':
      try {
        JSON.parse(strValue);
      } catch {
        return { valid: false, error: 'Must be valid JSON' };
      }
      break;

    case 'Uuid':
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strValue)) {
        return { valid: false, error: 'Must be a valid UUID' };
      }
      break;

    // Enum type (inline values)
    case 'Enum': {
      const enumValues = property?.enum;
      if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
        if (!enumValues.includes(strValue)) {
          return { valid: false, error: `Must be one of: ${enumValues.join(', ')}` };
        }
      }
      break;
    }

    // EnumRef type (reference to enum schema - validation same as Enum)
    case 'EnumRef': {
      const enumValues = property?.enum;
      if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
        if (!enumValues.includes(strValue)) {
          return { valid: false, error: `Must be one of: ${enumValues.join(', ')}` };
        }
      }
      break;
    }

    // String, Text, LongText, Password, File, MultiFile - no validation
    default:
      break;
  }

  return { valid: true };
}

// ============================================================================
// UI Helper Functions (browser-safe, for instant feedback in forms)
// ============================================================================

/**
 * Check if a value is a valid identifier (for enum values, property names)
 * Valid: starts with letter or underscore, followed by alphanumeric or underscore
 */
export function isValidIdentifier(value: string): boolean {
  if (!value || !value.trim()) return false;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value.trim());
}

/**
 * Check if a value is a valid schema name (PascalCase)
 */
export function isValidSchemaName(value: string): boolean {
  if (!value || !value.trim()) return false;
  return /^[A-Z][a-zA-Z0-9]*$/.test(value.trim());
}

/**
 * Check for duplicate in array
 */
export function hasDuplicate(values: string[], value: string, currentIndex?: number): boolean {
  const trimmed = value.trim();
  return values.some((v, i) => i !== currentIndex && v === trimmed);
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate enum value for UI (quick feedback)
 */
export function validateEnumValueUI(
  value: string | undefined,
  existingValues: string[],
  currentIndex?: number
): ValidationResult {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return { valid: false, error: 'Value is required' };
  }

  if (!isValidIdentifier(trimmed)) {
    return { valid: false, error: 'Must be a valid identifier (a-z, A-Z, 0-9, _)' };
  }

  if (hasDuplicate(existingValues, trimmed, currentIndex)) {
    return { valid: false, error: 'Duplicate value' };
  }

  return { valid: true };
}

/**
 * Validate property name for UI (quick feedback)
 */
export function validatePropertyNameUI(
  name: string | undefined,
  existingNames: string[],
  currentIndex?: number
): ValidationResult {
  const trimmed = name?.trim() ?? '';

  if (!trimmed) {
    return { valid: false, error: 'Name is required' };
  }

  if (!isValidIdentifier(trimmed)) {
    return { valid: false, error: 'Invalid property name' };
  }

  // Reserved words (auto-managed by schema)
  const reserved = ['id', 'created_at', 'updated_at', 'deleted_at'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: `"${trimmed}" is reserved` };
  }

  if (hasDuplicate(existingNames, trimmed, currentIndex)) {
    return { valid: false, error: 'Duplicate property name' };
  }

  return { valid: true };
}

/**
 * Validate schema name for UI (quick feedback)
 */
export function validateSchemaNameUI(
  name: string | undefined,
  existingNames: string[],
  currentName?: string
): ValidationResult {
  const trimmed = name?.trim() ?? '';

  if (!trimmed) {
    return { valid: false, error: 'Name is required' };
  }

  if (!isValidSchemaName(trimmed)) {
    return { valid: false, error: 'Must be PascalCase (e.g., User, BlogPost)' };
  }

  if (trimmed !== currentName && existingNames.includes(trimmed)) {
    return { valid: false, error: 'Schema name already exists' };
  }

  return { valid: true };
}
