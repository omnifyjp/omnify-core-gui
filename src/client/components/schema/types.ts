/**
 * Types and constants for schema components
 */

// Relation type visual configs
export const RELATION_TYPE_CONFIGS: Record<string, { icon: string; desc: string }> = {
  OneToOne: { icon: '1:1', desc: 'One to One' },
  OneToMany: { icon: '1:n', desc: 'One to Many' },
  ManyToOne: { icon: 'n:1', desc: 'Many to One' },
  ManyToMany: { icon: 'n:n', desc: 'Many to Many' },
  MorphTo: { icon: '?:1', desc: 'Morph To' },
  MorphOne: { icon: '1:?', desc: 'Morph One' },
  MorphMany: { icon: 'n:?', desc: 'Morph Many' },
  MorphToMany: { icon: '?:n', desc: 'Morph To Many' },
  MorphedByMany: { icon: 'n:?', desc: 'Morphed By Many' },
};

// Property types that have specific additional fields
export const STRING_TYPES = ['String', 'Email', 'Password'];
export const NUMERIC_TYPES = ['Int', 'BigInt', 'Float', 'Decimal'];

// Pivot field for GUI state
export interface GuiPivotField {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
}

export interface PropertyFormData {
  name: string;
  type: string;
  nullable?: boolean | undefined;
  unique?: boolean | undefined;
  primaryKey?: boolean | undefined;
  autoIncrement?: boolean | undefined;
  default?: string | undefined;
  displayName?: string | undefined;
  description?: string | undefined;
  // Association fields
  relation?: string | undefined;
  target?: string | undefined;
  targets?: string[] | undefined;
  morphName?: string | undefined;
  inversedBy?: string | undefined;
  mappedBy?: string | undefined;
  onDelete?: string | undefined;
  onUpdate?: string | undefined;
  owning?: boolean | undefined;
  joinTable?: string | undefined;
  // String type fields
  length?: number | undefined;
  // Numeric type fields
  precision?: number | undefined;
  scale?: number | undefined;
  unsigned?: boolean | undefined;
  // Enum type fields (inline values with value/label)
  enum?: string | Array<string | { value: string; label?: string }> | undefined;
  // Pivot fields for ManyToMany/MorphToMany
  pivotFields?: Record<string, { type: string; nullable?: boolean; default?: unknown }> | undefined;
  // File type fields
  multiple?: boolean | undefined;
  maxFiles?: number | undefined;
  accept?: string[] | undefined;
  maxSize?: number | undefined;
}

export interface IndexFormData {
  name?: string | undefined;
  columns: string[];
  unique?: boolean | undefined;
  type?: string | undefined;
}

export interface SchemaFormData {
  name: string;
  kind: 'object' | 'enum' | 'partial' | 'pivot';
  displayName?: string | undefined;
  singular?: string | undefined;
  plural?: string | undefined;
  titleIndex?: string | undefined;
  group?: string | undefined;
  tableName?: string | undefined;
  primaryKey?: 'BigInt' | 'Int' | 'Uuid' | 'none';
  timestamps?: boolean | undefined;
  softDelete?: boolean | undefined;
  translations?: boolean | undefined;
  authenticatable?: boolean | undefined;
  authenticatableLoginIdField?: string | undefined;
  authenticatablePasswordField?: string | undefined;
  authenticatableGuardName?: string | undefined;
}

export interface EnumFormData {
  value: string;
  label?: string | undefined;
}

export interface PivotFieldFormData {
  name: string;
  type: string;
  nullable?: boolean | undefined;
  default?: string | undefined;
}
