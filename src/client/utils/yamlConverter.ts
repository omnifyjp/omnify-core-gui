/**
 * Utilities for converting between GuiSchema and YAML format
 */

import { stringify, parse } from 'yaml';
import type { GuiSchema, GuiPropertyDefinition, GuiEnumValue, GuiSchemaOptions, GuiIndexDefinition } from '../../shared/types.js';

/**
 * Convert a GuiPropertyDefinition to a YAML-friendly object
 */
function propertyToYaml(prop: GuiPropertyDefinition): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: prop.type,
  };

  // Common fields
  if (prop.displayName) result.displayName = prop.displayName;
  if (prop.description) result.description = prop.description;
  if (prop.nullable) result.nullable = prop.nullable;
  if (prop.unique) result.unique = prop.unique;
  if (prop.default !== undefined) result.default = prop.default;

  // String fields
  if (prop.length) result.length = prop.length;

  // Numeric fields
  if (prop.precision) result.precision = prop.precision;
  if (prop.scale) result.scale = prop.scale;
  if (prop.unsigned) result.unsigned = prop.unsigned;

  // Enum fields
  if (prop.enum !== undefined) result.enum = prop.enum;

  // Association fields
  if (prop.relation) result.relation = prop.relation;
  if (prop.target) result.target = prop.target;
  if (prop.targets && prop.targets.length > 0) result.targets = prop.targets;
  if (prop.morphName) result.morphName = prop.morphName;
  if (prop.inversedBy) result.inversedBy = prop.inversedBy;
  if (prop.mappedBy) result.mappedBy = prop.mappedBy;
  if (prop.onDelete) result.onDelete = prop.onDelete;
  if (prop.onUpdate) result.onUpdate = prop.onUpdate;
  if (prop.owning !== undefined) result.owning = prop.owning;
  if (prop.joinTable) result.joinTable = prop.joinTable;
  if (prop.pivotFields && Object.keys(prop.pivotFields).length > 0) {
    result.pivotFields = prop.pivotFields;
  }

  // File type fields
  if (prop.multiple) result.multiple = prop.multiple;
  if (prop.maxFiles) result.maxFiles = prop.maxFiles;
  if (prop.accept && prop.accept.length > 0) result.accept = prop.accept;
  if (prop.maxSize) result.maxSize = prop.maxSize;

  return result;
}

/**
 * Convert YAML property object to GuiPropertyDefinition
 */
function yamlToProperty(data: Record<string, unknown>): GuiPropertyDefinition {
  const prop: GuiPropertyDefinition = {
    type: (data.type as string) || 'String',
  };

  // Common fields
  if (data.displayName) prop.displayName = data.displayName as string;
  if (data.description) prop.description = data.description as string;
  if (data.nullable) prop.nullable = data.nullable as boolean;
  if (data.unique) prop.unique = data.unique as boolean;
  if (data.default !== undefined) prop.default = data.default;

  // String fields
  if (data.length) prop.length = data.length as number;

  // Numeric fields
  if (data.precision) prop.precision = data.precision as number;
  if (data.scale) prop.scale = data.scale as number;
  if (data.unsigned) prop.unsigned = data.unsigned as boolean;

  // Enum fields
  if (data.enum !== undefined) {
    prop.enum = data.enum as string | Array<string | { value: string; label?: string }>;
  }

  // Association fields
  if (data.relation) prop.relation = data.relation as string;
  if (data.target) prop.target = data.target as string;
  if (data.targets) prop.targets = data.targets as string[];
  if (data.morphName) prop.morphName = data.morphName as string;
  if (data.inversedBy) prop.inversedBy = data.inversedBy as string;
  if (data.mappedBy) prop.mappedBy = data.mappedBy as string;
  if (data.onDelete) prop.onDelete = data.onDelete as string;
  if (data.onUpdate) prop.onUpdate = data.onUpdate as string;
  if (data.owning !== undefined) prop.owning = data.owning as boolean;
  if (data.joinTable) prop.joinTable = data.joinTable as string;
  if (data.pivotFields) {
    prop.pivotFields = data.pivotFields as Record<string, { type: string; nullable?: boolean; default?: unknown }>;
  }

  // File type fields
  if (data.multiple) prop.multiple = data.multiple as boolean;
  if (data.maxFiles) prop.maxFiles = data.maxFiles as number;
  if (data.accept) prop.accept = data.accept as string[];
  if (data.maxSize) prop.maxSize = data.maxSize as number;

  return prop;
}

/**
 * Convert GuiEnumValue array to YAML format
 */
function enumValuesToYaml(values: GuiEnumValue[]): Array<string | Record<string, unknown>> {
  return values.map((v) => {
    // If no label and no extra, just return the value string
    if (!v.label && (!v.extra || Object.keys(v.extra).length === 0)) {
      return v.value;
    }

    // Otherwise, return as object
    const obj: Record<string, unknown> = { value: v.value };
    if (v.label) obj.label = v.label;
    if (v.extra && Object.keys(v.extra).length > 0) {
      Object.assign(obj, v.extra);
    }
    return obj;
  });
}

/**
 * Convert YAML enum values to GuiEnumValue array
 */
function yamlToEnumValues(values: Array<string | Record<string, unknown>>): GuiEnumValue[] {
  return values.map((v) => {
    if (typeof v === 'string') {
      return { value: v };
    }

    const result: GuiEnumValue = {
      value: v.value as string,
    };

    if (v.label) result.label = v.label as string;

    // Extract extra properties (everything except value and label)
    const extra: Record<string, string | number | boolean> = {};
    for (const [key, val] of Object.entries(v)) {
      if (key !== 'value' && key !== 'label') {
        extra[key] = val as string | number | boolean;
      }
    }
    if (Object.keys(extra).length > 0) {
      result.extra = extra;
    }

    return result;
  });
}

/**
 * Convert GuiSchemaOptions to YAML-friendly object
 */
function optionsToYaml(options: GuiSchemaOptions): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (options.id === false) result.id = false;
  if (options.idType && options.idType !== 'BigInt') result.idType = options.idType;
  if (options.timestamps === false) result.timestamps = false;
  if (options.softDelete) result.softDelete = true;
  if (options.tableName) result.tableName = options.tableName;
  if (options.translations) result.translations = true;
  if (options.authenticatable) result.authenticatable = true;
  if (options.authenticatableLoginIdField) {
    result.authenticatableLoginIdField = options.authenticatableLoginIdField;
  }
  if (options.authenticatablePasswordField) {
    result.authenticatablePasswordField = options.authenticatablePasswordField;
  }
  if (options.authenticatableGuardName) {
    result.authenticatableGuardName = options.authenticatableGuardName;
  }

  // Indexes
  if (options.indexes && options.indexes.length > 0) {
    result.indexes = options.indexes.map((idx) => {
      const indexObj: Record<string, unknown> = { columns: idx.columns };
      if (idx.unique) indexObj.unique = idx.unique;
      if (idx.name) indexObj.name = idx.name;
      if (idx.type) indexObj.type = idx.type;
      return indexObj;
    });
  }

  // Unique constraints
  if (options.unique && options.unique.length > 0) {
    result.unique = options.unique;
  }

  return result;
}

/**
 * Convert YAML options to GuiSchemaOptions
 */
function yamlToOptions(data: Record<string, unknown>): GuiSchemaOptions {
  const options: GuiSchemaOptions = {};

  if (data.id === false) options.id = false;
  if (data.idType) options.idType = data.idType as GuiSchemaOptions['idType'];
  if (data.timestamps === false) options.timestamps = false;
  if (data.softDelete) options.softDelete = true;
  if (data.tableName) options.tableName = data.tableName as string;
  if (data.translations) options.translations = true;
  if (data.authenticatable) options.authenticatable = true;
  if (data.authenticatableLoginIdField) {
    options.authenticatableLoginIdField = data.authenticatableLoginIdField as string;
  }
  if (data.authenticatablePasswordField) {
    options.authenticatablePasswordField = data.authenticatablePasswordField as string;
  }
  if (data.authenticatableGuardName) {
    options.authenticatableGuardName = data.authenticatableGuardName as string;
  }

  // Indexes
  if (data.indexes && Array.isArray(data.indexes)) {
    options.indexes = (data.indexes as Array<Record<string, unknown>>).map((idx) => ({
      columns: idx.columns as string[],
      unique: idx.unique as boolean | undefined,
      name: idx.name as string | undefined,
      type: idx.type as GuiIndexDefinition['type'],
    }));
  }

  // Unique constraints
  if (data.unique) {
    options.unique = data.unique as string[] | string[][];
  }

  return options;
}

/**
 * Convert a GuiSchema to YAML string
 */
export function schemaToYaml(schema: GuiSchema): string {
  const output: Record<string, unknown> = {};

  // Basic fields
  if (schema.displayName) output.displayName = schema.displayName;
  if (schema.kind === 'enum') output.kind = 'enum';
  if (schema.singular) output.singular = schema.singular;
  if (schema.plural) output.plural = schema.plural;
  if (schema.titleIndex) output.titleIndex = schema.titleIndex;
  if (schema.group) output.group = schema.group;

  // Options
  if (schema.options) {
    const optionsYaml = optionsToYaml(schema.options);
    if (Object.keys(optionsYaml).length > 0) {
      output.options = optionsYaml;
    }
  }

  // Properties (for object schemas)
  if (schema.kind !== 'enum' && schema.properties) {
    const props: Record<string, unknown> = {};
    for (const [name, prop] of Object.entries(schema.properties)) {
      props[name] = propertyToYaml(prop);
    }
    if (Object.keys(props).length > 0) {
      output.properties = props;
    }
  }

  // Enum values (for enum schemas)
  if (schema.kind === 'enum' && schema.values && schema.values.length > 0) {
    output.values = enumValuesToYaml(schema.values);
  }

  return stringify(output, {
    lineWidth: 120,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'PLAIN',
  });
}

/**
 * Parse YAML string to GuiSchema
 * @throws Error if YAML is invalid or schema structure is invalid
 */
export function yamlToSchema(yamlContent: string, schemaName: string): GuiSchema {
  const parsed = parse(yamlContent) as Record<string, unknown> | null;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML: expected an object');
  }

  const schema: GuiSchema = {
    name: schemaName,
    kind: parsed.kind === 'enum' ? 'enum' : 'object',
  };

  // Basic fields
  if (parsed.displayName) schema.displayName = parsed.displayName as string;
  if (parsed.singular) schema.singular = parsed.singular as string;
  if (parsed.plural) schema.plural = parsed.plural as string;
  if (parsed.titleIndex) schema.titleIndex = parsed.titleIndex as string;
  if (parsed.group) schema.group = parsed.group as string;

  // Options
  if (parsed.options && typeof parsed.options === 'object') {
    schema.options = yamlToOptions(parsed.options as Record<string, unknown>);
  }

  // Properties
  if (parsed.properties && typeof parsed.properties === 'object') {
    const props: Record<string, GuiPropertyDefinition> = {};
    for (const [name, propData] of Object.entries(parsed.properties as Record<string, unknown>)) {
      if (propData && typeof propData === 'object') {
        props[name] = yamlToProperty(propData as Record<string, unknown>);
      }
    }
    schema.properties = props;
  }

  // Enum values
  if (parsed.values && Array.isArray(parsed.values)) {
    schema.values = yamlToEnumValues(parsed.values as Array<string | Record<string, unknown>>);
  }

  return schema;
}

/**
 * Validate YAML content and return error message if invalid
 */
export function validateYaml(yamlContent: string): string | null {
  try {
    parse(yamlContent);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid YAML syntax';
  }
}
