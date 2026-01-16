/**
 * Shared types for @famgia/omnify-gui
 */

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Enum value with optional label and extra properties for form components
export interface GuiEnumValue {
  value: string;
  label?: string | undefined;
  // Extra properties for customization (e.g., bgColor, textColor, icon, etc.)
  extra?: Record<string, string | number | boolean> | undefined;
}

// GUI-specific schema type that extends LoadedSchema with UI state
export interface GuiSchema {
  name: string;
  kind: 'object' | 'enum' | 'partial' | 'pivot';
  displayName?: string | undefined;
  singular?: string | undefined;
  plural?: string | undefined;
  titleIndex?: string | undefined;
  group?: string | undefined;
  filePath?: string | undefined;
  relativePath?: string | undefined;
  properties?: Record<string, GuiPropertyDefinition> | undefined;
  associations?: Record<string, unknown> | undefined;
  options?: GuiSchemaOptions | undefined;
  values?: GuiEnumValue[] | undefined;
  // GUI-specific fields
  isDirty?: boolean | undefined;
  validationErrors?: ValidationError[] | undefined;
}

export interface GuiPropertyDefinition {
  type: string;
  nullable?: boolean | undefined;
  unique?: boolean | undefined;
  default?: unknown;
  displayName?: string | undefined;
  description?: string | undefined;
  // Association fields
  relation?: string | undefined;
  target?: string | undefined;
  targets?: string[] | undefined; // For MorphTo polymorphic
  morphName?: string | undefined; // For MorphOne, MorphMany, MorphedByMany
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
  // Primary key / Auto increment (when Auto ID = None)
  primaryKey?: boolean | undefined;
  autoIncrement?: boolean | undefined;
  // Enum type fields (Enum: inline values, EnumRef: string reference)
  enum?: string | Array<string | { value: string; label?: string; extra?: Record<string, string | number | boolean> }> | undefined;
  // Pivot fields for ManyToMany/MorphToMany
  pivotFields?: Record<string, { type: string; nullable?: boolean; default?: unknown }> | undefined;
  // File type fields
  multiple?: boolean | undefined;
  maxFiles?: number | undefined;
  accept?: string[] | undefined;
  maxSize?: number | undefined;
}

export interface GuiIndexDefinition {
  columns: string[];
  unique?: boolean | undefined;
  name?: string | undefined;
  type?: 'btree' | 'hash' | 'fulltext' | 'spatial' | 'gin' | 'gist' | undefined;
}

export type IdType = 'BigInt' | 'Int' | 'Uuid' | 'String';

export interface GuiSchemaOptions {
  id?: boolean | undefined;
  idType?: IdType | undefined;
  timestamps?: boolean | undefined;
  softDelete?: boolean | undefined;
  tableName?: string | undefined;
  indexes?: GuiIndexDefinition[] | undefined;
  unique?: string[] | string[][] | undefined;
  translations?: boolean | undefined;
  authenticatable?: boolean | undefined;
  authenticatableLoginIdField?: string | undefined;
  authenticatablePasswordField?: string | undefined;
  authenticatableGuardName?: string | undefined;
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

// Preview types
export type PreviewType = 'laravel' | 'typescript' | 'sql';

export interface PreviewResult {
  type: PreviewType;
  content: string;
  fileName: string;
}

// Config types
export interface GuiConfig {
  schemasDir: string;
  port: number;
  host: string;
  customTypes: string[];
  plugins: PluginInfo[];
}

// Plugin types
export type PluginConfigFieldType = 'string' | 'boolean' | 'number' | 'select' | 'path';

export interface PluginConfigSelectOption {
  value: string;
  label: string;
}

export interface PluginConfigField {
  key: string;
  type: PluginConfigFieldType;
  label: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  options?: PluginConfigSelectOption[];
  placeholder?: string;
  group?: string;
}

export interface PluginConfigSchema {
  fields: PluginConfigField[];
}

export interface PluginInfo {
  name: string;
  packageName: string;
  version: string;
  description?: string;
  enabled: boolean;
  types: string[];
  configSchema?: PluginConfigSchema;
  config?: Record<string, unknown>;
}

// Editor state types
export interface EditorState {
  selectedSchema: string | null;
  selectedProperty: string | null;
  previewType: PreviewType;
  isDirty: boolean;
}
