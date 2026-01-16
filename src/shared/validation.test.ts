/**
 * Validation tests for Omnify GUI
 * Tests browser-safe UI validation helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateDefaultValueUI,
  isValidIdentifier,
  isValidSchemaName,
  hasDuplicate,
  validateEnumValueUI,
  validatePropertyNameUI,
  validateSchemaNameUI,
} from './validation.js';

// ============================================================================
// Default Value Validation Tests
// ============================================================================

describe('validateDefaultValueUI', () => {
  describe('empty values', () => {
    it('accepts undefined', () => {
      expect(validateDefaultValueUI('Int', undefined)).toEqual({ valid: true });
    });

    it('accepts null', () => {
      expect(validateDefaultValueUI('Int', null)).toEqual({ valid: true });
    });

    it('accepts empty string', () => {
      expect(validateDefaultValueUI('Int', '')).toEqual({ valid: true });
    });
  });

  describe('Int type', () => {
    it('accepts valid integers', () => {
      expect(validateDefaultValueUI('Int', '123')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Int', '-456')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Int', '0')).toEqual({ valid: true });
    });

    it('rejects non-integers', () => {
      expect(validateDefaultValueUI('Int', '12.34')).toEqual({
        valid: false,
        error: 'Must be an integer',
      });
      expect(validateDefaultValueUI('Int', 'abc')).toEqual({
        valid: false,
        error: 'Must be an integer',
      });
    });
  });

  describe('BigInt type', () => {
    it('accepts valid big integers', () => {
      expect(validateDefaultValueUI('BigInt', '9999999999999')).toEqual({ valid: true });
      expect(validateDefaultValueUI('BigInt', '-9999999999999')).toEqual({ valid: true });
    });

    it('rejects non-integers', () => {
      expect(validateDefaultValueUI('BigInt', '12.34')).toEqual({
        valid: false,
        error: 'Must be an integer',
      });
    });
  });

  describe('Float type', () => {
    it('accepts valid numbers', () => {
      expect(validateDefaultValueUI('Float', '12.34')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Float', '-56.78')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Float', '100')).toEqual({ valid: true });
    });

    it('rejects non-numbers', () => {
      expect(validateDefaultValueUI('Float', 'abc')).toEqual({
        valid: false,
        error: 'Must be a number',
      });
    });
  });

  describe('Decimal type', () => {
    it('accepts valid decimals', () => {
      expect(validateDefaultValueUI('Decimal', '99.99')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Decimal', '1000')).toEqual({ valid: true });
    });

    it('rejects non-numbers', () => {
      expect(validateDefaultValueUI('Decimal', 'not a number')).toEqual({
        valid: false,
        error: 'Must be a number',
      });
    });
  });

  describe('Boolean type', () => {
    it('accepts valid booleans', () => {
      expect(validateDefaultValueUI('Boolean', 'true')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Boolean', 'false')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Boolean', 'TRUE')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Boolean', 'FALSE')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Boolean', '1')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Boolean', '0')).toEqual({ valid: true });
    });

    it('rejects invalid booleans', () => {
      expect(validateDefaultValueUI('Boolean', 'yes')).toEqual({
        valid: false,
        error: 'Must be true or false',
      });
      expect(validateDefaultValueUI('Boolean', 'no')).toEqual({
        valid: false,
        error: 'Must be true or false',
      });
    });
  });

  describe('Email type', () => {
    it('accepts valid emails', () => {
      expect(validateDefaultValueUI('Email', 'test@example.com')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Email', 'user.name@domain.co.jp')).toEqual({ valid: true });
    });

    it('rejects invalid emails', () => {
      expect(validateDefaultValueUI('Email', 'not-an-email')).toEqual({
        valid: false,
        error: 'Must be a valid email address',
      });
      expect(validateDefaultValueUI('Email', '@example.com')).toEqual({
        valid: false,
        error: 'Must be a valid email address',
      });
    });
  });

  describe('Date type', () => {
    it('accepts valid dates', () => {
      expect(validateDefaultValueUI('Date', '2024-01-15')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Date', '2023-12-31')).toEqual({ valid: true });
    });

    it('rejects invalid dates', () => {
      expect(validateDefaultValueUI('Date', '01-15-2024')).toEqual({
        valid: false,
        error: 'Must be in YYYY-MM-DD format',
      });
      expect(validateDefaultValueUI('Date', '2024/01/15')).toEqual({
        valid: false,
        error: 'Must be in YYYY-MM-DD format',
      });
    });
  });

  describe('Time type', () => {
    it('accepts valid times', () => {
      expect(validateDefaultValueUI('Time', '14:30')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Time', '09:00:00')).toEqual({ valid: true });
    });

    it('rejects invalid times', () => {
      expect(validateDefaultValueUI('Time', '2:30 PM')).toEqual({
        valid: false,
        error: 'Must be in HH:MM or HH:MM:SS format',
      });
    });
  });

  describe('DateTime type', () => {
    it('accepts valid datetimes', () => {
      expect(validateDefaultValueUI('DateTime', '2024-01-15T14:30:00')).toEqual({ valid: true });
      expect(validateDefaultValueUI('DateTime', '2024-01-15 14:30')).toEqual({ valid: true });
    });

    it('rejects invalid datetimes', () => {
      expect(validateDefaultValueUI('DateTime', '2024-01-15')).toEqual({
        valid: false,
        error: 'Must be in YYYY-MM-DD HH:MM:SS format',
      });
    });
  });

  describe('Timestamp type', () => {
    it('accepts valid timestamps', () => {
      expect(validateDefaultValueUI('Timestamp', '2024-01-15T14:30:00')).toEqual({ valid: true });
    });
  });

  describe('Json type', () => {
    it('accepts valid JSON', () => {
      expect(validateDefaultValueUI('Json', '{}')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Json', '{"key": "value"}')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Json', '[]')).toEqual({ valid: true });
      expect(validateDefaultValueUI('Json', '[1, 2, 3]')).toEqual({ valid: true });
    });

    it('rejects invalid JSON', () => {
      expect(validateDefaultValueUI('Json', '{invalid}')).toEqual({
        valid: false,
        error: 'Must be valid JSON',
      });
      expect(validateDefaultValueUI('Json', 'not json')).toEqual({
        valid: false,
        error: 'Must be valid JSON',
      });
    });
  });

  describe('Uuid type', () => {
    it('accepts valid UUIDs', () => {
      expect(validateDefaultValueUI('Uuid', '550e8400-e29b-41d4-a716-446655440000')).toEqual({
        valid: true,
      });
      expect(validateDefaultValueUI('Uuid', 'A550E840-E29B-41D4-A716-446655440000')).toEqual({
        valid: true,
      });
    });

    it('rejects invalid UUIDs', () => {
      expect(validateDefaultValueUI('Uuid', 'not-a-uuid')).toEqual({
        valid: false,
        error: 'Must be a valid UUID',
      });
      expect(validateDefaultValueUI('Uuid', '550e8400-e29b-41d4-a716')).toEqual({
        valid: false,
        error: 'Must be a valid UUID',
      });
    });
  });

  describe('Enum type', () => {
    it('accepts valid enum values', () => {
      const property = { enum: ['active', 'inactive', 'pending'] as const };
      expect(validateDefaultValueUI('Enum', 'active', property)).toEqual({ valid: true });
      expect(validateDefaultValueUI('Enum', 'inactive', property)).toEqual({ valid: true });
    });

    it('rejects invalid enum values', () => {
      const property = { enum: ['active', 'inactive'] as const };
      expect(validateDefaultValueUI('Enum', 'unknown', property)).toEqual({
        valid: false,
        error: 'Must be one of: active, inactive',
      });
    });

    it('accepts any value when no enum defined', () => {
      expect(validateDefaultValueUI('Enum', 'anything')).toEqual({ valid: true });
    });
  });

  describe('EnumRef type', () => {
    it('accepts valid enum values from referenced schema', () => {
      // EnumRef uses enum values passed from the referenced schema
      const property = { enum: ['ACTIVE', 'INACTIVE', 'PENDING'] as const };
      expect(validateDefaultValueUI('EnumRef', 'ACTIVE', property)).toEqual({ valid: true });
      expect(validateDefaultValueUI('EnumRef', 'INACTIVE', property)).toEqual({ valid: true });
    });

    it('rejects invalid enum values', () => {
      const property = { enum: ['ACTIVE', 'INACTIVE'] as const };
      expect(validateDefaultValueUI('EnumRef', 'UNKNOWN', property)).toEqual({
        valid: false,
        error: 'Must be one of: ACTIVE, INACTIVE',
      });
    });

    it('accepts any value when no enum values available', () => {
      expect(validateDefaultValueUI('EnumRef', 'anything')).toEqual({ valid: true });
    });

    it('accepts empty/null values', () => {
      const property = { enum: ['ACTIVE', 'INACTIVE'] as const };
      expect(validateDefaultValueUI('EnumRef', '', property)).toEqual({ valid: true });
      expect(validateDefaultValueUI('EnumRef', null, property)).toEqual({ valid: true });
    });
  });

  describe('String types (no validation)', () => {
    it('accepts any string for String type', () => {
      expect(validateDefaultValueUI('String', 'anything')).toEqual({ valid: true });
    });

    it('accepts any string for Text type', () => {
      expect(validateDefaultValueUI('Text', 'long text here')).toEqual({ valid: true });
    });

    it('accepts any string for LongText type', () => {
      expect(validateDefaultValueUI('LongText', 'very long text')).toEqual({ valid: true });
    });

    it('accepts any string for Password type', () => {
      expect(validateDefaultValueUI('Password', 'secret123')).toEqual({ valid: true });
    });
  });
});

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('isValidIdentifier', () => {
  it('accepts valid identifiers', () => {
    expect(isValidIdentifier('foo')).toBe(true);
    expect(isValidIdentifier('Foo')).toBe(true);
    expect(isValidIdentifier('FOO')).toBe(true);
    expect(isValidIdentifier('foo123')).toBe(true);
    expect(isValidIdentifier('foo_bar')).toBe(true);
    expect(isValidIdentifier('_foo')).toBe(true);
    expect(isValidIdentifier('_')).toBe(true);
    expect(isValidIdentifier('ACTIVE')).toBe(true);
    expect(isValidIdentifier('IN_PROGRESS')).toBe(true);
    expect(isValidIdentifier('camelCase')).toBe(true);
    expect(isValidIdentifier('PascalCase')).toBe(true);
    expect(isValidIdentifier('snake_case')).toBe(true);
    expect(isValidIdentifier('UPPER_SNAKE_CASE')).toBe(true);
  });

  it('rejects invalid identifiers', () => {
    expect(isValidIdentifier('')).toBe(false);
    expect(isValidIdentifier('   ')).toBe(false);
    expect(isValidIdentifier('123')).toBe(false);
    expect(isValidIdentifier('123abc')).toBe(false);
    expect(isValidIdentifier('foo-bar')).toBe(false);
    expect(isValidIdentifier('foo bar')).toBe(false);
    expect(isValidIdentifier('foo.bar')).toBe(false);
    expect(isValidIdentifier('@foo')).toBe(false);
    expect(isValidIdentifier('foo@bar')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isValidIdentifier('a')).toBe(true);
    expect(isValidIdentifier('A')).toBe(true);
    expect(isValidIdentifier('a1')).toBe(true);
    expect(isValidIdentifier('_1')).toBe(true);
  });
});

describe('isValidSchemaName', () => {
  it('accepts valid PascalCase names', () => {
    expect(isValidSchemaName('User')).toBe(true);
    expect(isValidSchemaName('BlogPost')).toBe(true);
    expect(isValidSchemaName('UserRole')).toBe(true);
    expect(isValidSchemaName('API')).toBe(true);
    expect(isValidSchemaName('OAuth2Token')).toBe(true);
    expect(isValidSchemaName('A')).toBe(true);
    expect(isValidSchemaName('A1')).toBe(true);
  });

  it('rejects invalid schema names', () => {
    expect(isValidSchemaName('')).toBe(false);
    expect(isValidSchemaName('   ')).toBe(false);
    expect(isValidSchemaName('user')).toBe(false); // must start with uppercase
    expect(isValidSchemaName('blogPost')).toBe(false);
    expect(isValidSchemaName('_User')).toBe(false);
    expect(isValidSchemaName('User_Role')).toBe(false);
    expect(isValidSchemaName('User-Role')).toBe(false);
    expect(isValidSchemaName('123User')).toBe(false);
  });
});

describe('hasDuplicate', () => {
  it('detects duplicates', () => {
    expect(hasDuplicate(['a', 'b', 'c'], 'a')).toBe(true);
    expect(hasDuplicate(['a', 'b', 'c'], 'b')).toBe(true);
    expect(hasDuplicate(['ACTIVE', 'INACTIVE'], 'ACTIVE')).toBe(true);
  });

  it('handles no duplicates', () => {
    expect(hasDuplicate(['a', 'b', 'c'], 'd')).toBe(false);
    expect(hasDuplicate([], 'a')).toBe(false);
  });

  it('excludes current index when checking', () => {
    expect(hasDuplicate(['a', 'b', 'c'], 'a', 0)).toBe(false);
    expect(hasDuplicate(['a', 'b', 'a'], 'a', 0)).toBe(true); // duplicate at index 2
    expect(hasDuplicate(['a', 'b', 'a'], 'a', 2)).toBe(true); // duplicate at index 0
  });

  it('trims values for comparison', () => {
    expect(hasDuplicate(['foo'], ' foo ')).toBe(true);
    expect(hasDuplicate(['foo'], '  foo')).toBe(true);
  });
});

// ============================================================================
// Enum Value Validation Tests
// ============================================================================

describe('validateEnumValueUI', () => {
  it('accepts valid enum values', () => {
    expect(validateEnumValueUI('ACTIVE', [])).toEqual({ valid: true });
    expect(validateEnumValueUI('IN_PROGRESS', [])).toEqual({ valid: true });
    expect(validateEnumValueUI('status1', [])).toEqual({ valid: true });
    expect(validateEnumValueUI('_internal', [])).toEqual({ valid: true });
    expect(validateEnumValueUI('camelCase', [])).toEqual({ valid: true });
    expect(validateEnumValueUI('PascalCase', [])).toEqual({ valid: true });
  });

  it('rejects empty values', () => {
    expect(validateEnumValueUI('', [])).toEqual({ valid: false, error: 'Value is required' });
    expect(validateEnumValueUI('   ', [])).toEqual({ valid: false, error: 'Value is required' });
    expect(validateEnumValueUI(undefined, [])).toEqual({ valid: false, error: 'Value is required' });
  });

  it('rejects invalid identifiers', () => {
    const result = validateEnumValueUI('123', []);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid identifier');

    expect(validateEnumValueUI('foo-bar', []).valid).toBe(false);
    expect(validateEnumValueUI('foo bar', []).valid).toBe(false);
  });

  it('detects duplicates', () => {
    const result = validateEnumValueUI('ACTIVE', ['ACTIVE', 'INACTIVE']);
    expect(result).toEqual({ valid: false, error: 'Duplicate value' });
  });

  it('allows same value at current index (edit mode)', () => {
    const result = validateEnumValueUI('ACTIVE', ['ACTIVE', 'INACTIVE'], 0);
    expect(result).toEqual({ valid: true });
  });
});

// ============================================================================
// Property Name Validation Tests
// ============================================================================

describe('validatePropertyNameUI', () => {
  it('accepts valid property names', () => {
    expect(validatePropertyNameUI('email', [])).toEqual({ valid: true });
    expect(validatePropertyNameUI('firstName', [])).toEqual({ valid: true });
    expect(validatePropertyNameUI('first_name', [])).toEqual({ valid: true });
    expect(validatePropertyNameUI('_private', [])).toEqual({ valid: true });
  });

  it('rejects empty names', () => {
    expect(validatePropertyNameUI('', [])).toEqual({ valid: false, error: 'Name is required' });
    expect(validatePropertyNameUI(undefined, [])).toEqual({ valid: false, error: 'Name is required' });
  });

  it('rejects invalid property names', () => {
    expect(validatePropertyNameUI('123abc', []).valid).toBe(false);
    expect(validatePropertyNameUI('foo-bar', []).valid).toBe(false);
  });

  it('rejects reserved field names', () => {
    expect(validatePropertyNameUI('id', [])).toEqual({ valid: false, error: '"id" is reserved' });
    expect(validatePropertyNameUI('ID', [])).toEqual({ valid: false, error: '"ID" is reserved' });
    expect(validatePropertyNameUI('created_at', [])).toEqual({ valid: false, error: '"created_at" is reserved' });
    expect(validatePropertyNameUI('updated_at', [])).toEqual({ valid: false, error: '"updated_at" is reserved' });
    expect(validatePropertyNameUI('deleted_at', [])).toEqual({ valid: false, error: '"deleted_at" is reserved' });
  });

  it('detects duplicates', () => {
    expect(validatePropertyNameUI('email', ['email', 'name'])).toEqual({
      valid: false,
      error: 'Duplicate property name',
    });
  });

  it('allows same name at current index (edit mode)', () => {
    expect(validatePropertyNameUI('email', ['email', 'name'], 0)).toEqual({ valid: true });
  });
});

// ============================================================================
// Schema Name Validation Tests
// ============================================================================

describe('validateSchemaNameUI', () => {
  it('accepts valid schema names', () => {
    expect(validateSchemaNameUI('User', [])).toEqual({ valid: true });
    expect(validateSchemaNameUI('BlogPost', [])).toEqual({ valid: true });
    expect(validateSchemaNameUI('OAuth2Token', [])).toEqual({ valid: true });
  });

  it('rejects empty names', () => {
    expect(validateSchemaNameUI('', [])).toEqual({ valid: false, error: 'Name is required' });
    expect(validateSchemaNameUI(undefined, [])).toEqual({ valid: false, error: 'Name is required' });
  });

  it('rejects non-PascalCase names', () => {
    expect(validateSchemaNameUI('user', [])).toEqual({
      valid: false,
      error: 'Must be PascalCase (e.g., User, BlogPost)',
    });
    expect(validateSchemaNameUI('blog_post', [])).toEqual({
      valid: false,
      error: 'Must be PascalCase (e.g., User, BlogPost)',
    });
  });

  it('detects duplicates', () => {
    expect(validateSchemaNameUI('User', ['User', 'Post'])).toEqual({
      valid: false,
      error: 'Schema name already exists',
    });
  });

  it('allows same name when editing (currentName matches)', () => {
    expect(validateSchemaNameUI('User', ['User', 'Post'], 'User')).toEqual({ valid: true });
  });
});
