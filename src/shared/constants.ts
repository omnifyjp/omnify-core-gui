/**
 * Shared constants for @famgia/omnify-gui
 */

export const DEFAULT_PORT = 3456;
export const DEFAULT_HOST = 'localhost';

export const API_ROUTES = {
  SCHEMAS: '/api/schemas',
  SCHEMA: '/api/schemas/:name',
  VALIDATE: '/api/validate',
  PREVIEW: '/api/preview/:type',
  CONFIG: '/api/config',
} as const;

export const WS_EVENTS = {
  // Server → Client
  SCHEMA_CHANGED: 'schema:changed',
  SCHEMA_VALIDATED: 'schema:validated',
  SCHEMAS_RELOADED: 'schemas:reloaded',
  CONNECTION_READY: 'connection:ready',

  // Client → Server
  SCHEMA_SAVE: 'schema:save',
  SCHEMA_VALIDATE: 'schema:validate',
} as const;

// Primary key types - only for ID fields, not shown in regular property dropdown
export const PK_TYPES = ['Id', 'Uuid'] as const;

// Regular property types - shown in property dropdown
export const PROPERTY_TYPES = [
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'Text',
  'LongText',
  'Date',
  'Time',
  'Timestamp',
  'Json',
  'Email',
  'Password',
  'File',
  'Point',
  'Coordinates',
  'Enum',
  'EnumRef',
] as const;

// All types including PK types - for loading/displaying existing schemas
export const ALL_PROPERTY_TYPES = [...PK_TYPES, ...PROPERTY_TYPES] as const;

export const RELATION_TYPES = [
  'OneToOne',
  'OneToMany',
  'ManyToOne',
  'ManyToMany',
] as const;

export const POLYMORPHIC_RELATION_TYPES = [
  'MorphTo',
  'MorphOne',
  'MorphMany',
  'MorphToMany',
  'MorphedByMany',
] as const;

export const REFERENTIAL_ACTIONS = [
  'CASCADE',
  'SET NULL',
  'SET DEFAULT',
  'RESTRICT',
  'NO ACTION',
] as const;

// Types allowed for pivot fields (basic types only, no Association)
export const PIVOT_FIELD_TYPES = [
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'Text',
  'Date',
  'Time',
  'Timestamp',
  'Json',
] as const;
