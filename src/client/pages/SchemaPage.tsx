/**
 * Schema editor page with modal for property and index editing
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useBlocker } from 'react-router-dom';
import {
  Form,
  Button,
  Space,
  Typography,
  Spin,
  theme,
  App,
  Tag,
  Tooltip,
  Popconfirm,
  Segmented,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  FormOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSchemaStore } from '../stores/schemaStore.js';
import { useUiStore, INDEX_TYPES_BY_DB } from '../stores/uiStore.js';
import { RELATION_TYPES } from '../../shared/constants.js';
import type { GuiSchema, GuiPropertyDefinition, GuiEnumValue } from '../../shared/types.js';
import { validateEnumValueUI } from '../../shared/validation.js';
import { schemaToYaml, yamlToSchema } from '../utils/yamlConverter.js';
import {
  type PropertyFormData,
  type IndexFormData,
  type SchemaFormData,
  type GuiPivotField,
  RELATION_TYPE_CONFIGS,
  SchemaInfoCard,
  EnumValuesCard,
  PropertiesCard,
  IndexesCard,
  YamlEditorCard,
  SchemaModal,
  PropertyModal,
  IndexModal,
  EnumModal,
  PivotFieldModal,
  UnsavedChangesModal,
} from '../components/schema/index.js';

const { Text } = Typography;

export function SchemaPage(): React.ReactElement {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { schemas, loading, createSchema, updateSchema, validateSchema } = useSchemaStore();
  const { databaseType, customTypes } = useUiStore();
  const { token } = theme.useToken();
  const { message } = App.useApp();

  // Get index types for current database
  const indexTypes = INDEX_TYPES_BY_DB[databaseType];
  const [schemaForm] = Form.useForm();
  const [propertyForm] = Form.useForm();
  const [indexForm] = Form.useForm();
  const [schemaData, setSchemaData] = useState<SchemaFormData>({
    name: '',
    kind: 'object',
    primaryKey: 'BigInt',
    timestamps: true,
    softDelete: false,
  });
  const [properties, setProperties] = useState<PropertyFormData[]>([]);
  const [indexes, setIndexes] = useState<IndexFormData[]>([]);
  const [enumValues, setEnumValues] = useState<GuiEnumValue[]>([]);
  const [isNew, setIsNew] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Original values for change highlighting
  const [originalSchemaData, setOriginalSchemaData] = useState<SchemaFormData | null>(null);
  const [originalProperties, setOriginalProperties] = useState<PropertyFormData[]>([]);
  const [originalIndexes, setOriginalIndexes] = useState<IndexFormData[]>([]);
  const [originalEnumValues, setOriginalEnumValues] = useState<GuiEnumValue[]>([]);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(isDirty);

  // Helper to check if a property has changed (by index)
  const isPropertyChanged = (index: number): boolean => {
    if (isNew) return true;
    const original = originalProperties[index];
    const current = properties[index];
    if (!original || !current) return true;
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  // Check if property is new (not in original)
  const isPropertyNew = (index: number): boolean => {
    return index >= originalProperties.length;
  };

  // Check if index is new or changed
  const isIndexChanged = (index: number): boolean => {
    if (isNew) return true;
    const original = originalIndexes[index];
    const current = indexes[index];
    if (!original || !current) return true;
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  const isIndexNew = (index: number): boolean => {
    return index >= originalIndexes.length;
  };

  // Check if enum value is new or changed
  const isEnumValueChanged = (index: number): boolean => {
    if (isNew) return true;
    const original = originalEnumValues[index];
    const current = enumValues[index];
    if (!original || !current) return true;
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  const isEnumValueNew = (index: number): boolean => {
    return index >= originalEnumValues.length;
  };

  // Auto-computed values based on schema name
  const autoSingular = schemaData.name || '';
  const autoPlural = autoSingular
    ? autoSingular.endsWith('y')
      ? autoSingular.slice(0, -1) + 'ies'
      : autoSingular.endsWith('s')
        ? autoSingular + 'es'
        : autoSingular + 's'
    : '';
  const autoTableName = autoPlural
    ? autoPlural.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
    : '';

  // Schema modal state
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  // Property modal state
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [editingPropertyIndex, setEditingPropertyIndex] = useState<number | null>(null);

  // Index modal state
  const [indexModalOpen, setIndexModalOpen] = useState(false);
  const [editingIndexIndex, setEditingIndexIndex] = useState<number | null>(null);

  // Enum modal state
  const [enumModalOpen, setEnumModalOpen] = useState(false);
  const [editingEnumIndex, setEditingEnumIndex] = useState<number | null>(null);
  const [enumForm] = Form.useForm();
  const [enumExtraProps, setEnumExtraProps] = useState<Array<{ key: string; value: string }>>([]);
  const [enumEditMode, setEnumEditMode] = useState<'shared' | 'inline'>('shared');

  // Inline enum values for Enum type property
  const [inlineEnumValues, setInlineEnumValues] = useState<GuiEnumValue[]>([]);

  // Pivot fields for ManyToMany/MorphToMany associations
  const [pivotFields, setPivotFields] = useState<GuiPivotField[]>([]);
  const [pivotFieldModalOpen, setPivotFieldModalOpen] = useState(false);
  const [editingPivotFieldIndex, setEditingPivotFieldIndex] = useState<number | null>(null);
  const [pivotFieldForm] = Form.useForm();

  // Editor mode state
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [yamlContent, setYamlContent] = useState<string>('');
  const [yamlError, setYamlError] = useState<string | null>(null);

  const schema = name && name !== 'new' ? schemas[name] : null;
  const schemaNames = Object.keys(schemas).filter((n) => n !== name);
  const propertyNames = properties.map((p) => p.name).filter(Boolean);

  // Extract unique groups from all schemas for autocomplete
  const groupOptions = [...new Set(
    Object.values(schemas)
      .map((s) => s.group)
      .filter((g): g is string => Boolean(g))
  )].sort().map((g) => ({ value: g }));

  // Validate enum value using shared validation
  const getEnumValueError = (value: string | undefined, index: number): string | null => {
    const existingValues = enumValues.map((v) => v.value);
    const result = validateEnumValueUI(value, existingValues, index);
    return result.valid ? null : (result.error ?? 'Invalid value');
  };

  useEffect(() => {
    // Reset editor mode and dirty state when switching schemas
    setEditorMode('visual');
    setYamlContent('');
    setYamlError(null);
    setIsDirty(false);

    if (name === 'new') {
      setIsNew(true);
      const kindParam = searchParams.get('kind');
      const defaultKind: 'object' | 'enum' = kindParam === 'enum' ? 'enum' : 'object';
      const defaultData: SchemaFormData = {
        name: '',
        kind: defaultKind,
        primaryKey: 'BigInt',
        timestamps: true,
        softDelete: false,
        authenticatableLoginIdField: 'email',
        authenticatablePasswordField: 'password',
        authenticatableGuardName: 'web',
      };
      setSchemaData(defaultData);
      setProperties([]);
      setIndexes([]);
      setEnumValues([]);
      schemaForm.setFieldsValue(defaultData);
      setSchemaModalOpen(true);
    } else if (schema) {
      setIsNew(false);
      const hasAutoId = schema.options?.id !== false;
      const idType = schema.options?.idType ?? 'BigInt';
      const primaryKey = hasAutoId ? (idType as 'BigInt' | 'Int' | 'Uuid') : 'none';

      const data: SchemaFormData = {
        name: schema.name,
        kind: schema.kind,
        displayName: schema.displayName,
        singular: schema.singular,
        plural: schema.plural,
        titleIndex: schema.titleIndex,
        group: schema.group,
        primaryKey,
        timestamps: schema.options?.timestamps ?? true,
        softDelete: schema.options?.softDelete ?? false,
        tableName: schema.options?.tableName,
        translations: schema.options?.translations ?? false,
        authenticatable: schema.options?.authenticatable ?? false,
        authenticatableLoginIdField: schema.options?.authenticatableLoginIdField ?? 'email',
        authenticatablePasswordField: schema.options?.authenticatablePasswordField ?? 'password',
        authenticatableGuardName: schema.options?.authenticatableGuardName ?? 'web',
      };
      setSchemaData(data);

      const props: PropertyFormData[] = Object.entries(schema.properties ?? {}).map(
        ([propName, prop]) => ({
          name: propName,
          type: prop.type,
          nullable: prop.nullable,
          unique: prop.unique,
          primaryKey: prop.primaryKey,
          autoIncrement: prop.autoIncrement,
          default: prop.default !== undefined ? String(prop.default) : undefined,
          displayName: prop.displayName,
          description: prop.description,
          relation: prop.relation,
          target: prop.target,
          targets: prop.targets,
          morphName: prop.morphName,
          inversedBy: prop.inversedBy,
          mappedBy: prop.mappedBy,
          onDelete: prop.onDelete,
          onUpdate: prop.onUpdate,
          owning: prop.owning,
          joinTable: prop.joinTable,
          length: prop.length,
          precision: prop.precision,
          scale: prop.scale,
          unsigned: prop.unsigned,
          enum: prop.enum,
          pivotFields: prop.pivotFields,
        })
      );
      setProperties(props);

      const regularIndexes: IndexFormData[] = (schema.options?.indexes ?? []).map((idx) => ({
        name: idx.name,
        columns: [...idx.columns],
        unique: idx.unique,
        type: idx.type,
      }));

      let uniqueAsIndexes: IndexFormData[] = [];
      if (schema.options?.unique) {
        const rawUnique = schema.options.unique;
        const normalized = Array.isArray(rawUnique[0])
          ? (rawUnique as string[][])
          : [rawUnique as string[]];
        uniqueAsIndexes = normalized.map((cols) => ({
          columns: [...cols],
          unique: true,
        }));
      }

      const idxs = [...regularIndexes, ...uniqueAsIndexes];
      setIndexes(idxs);

      const enumVals = schema.values ? [...schema.values] : [];
      setEnumValues(enumVals);

      setOriginalSchemaData({ ...data });
      setOriginalProperties(props.map((p) => ({ ...p })));
      setOriginalIndexes(idxs.map((i) => ({ ...i, columns: [...i.columns] })));
      setOriginalEnumValues(enumVals.map((v) => ({ ...v })));
    } else {
      setOriginalSchemaData(null);
      setOriginalProperties([]);
      setOriginalIndexes([]);
      setOriginalEnumValues([]);
    }
  }, [name, schema, schemaForm, searchParams]);

  const handleSave = async (): Promise<void> => {
    try {
      if (schemaData.kind === 'enum') {
        for (let i = 0; i < enumValues.length; i++) {
          const enumVal = enumValues[i];
          if (!enumVal) continue;
          const error = getEnumValueError(enumVal.value, i);
          if (error) {
            void message.error(`Enum value ${i + 1}: ${error}`);
            return;
          }
        }
        if (enumValues.length === 0) {
          void message.error('Enum must have at least one value');
          return;
        }
      }

      const propsRecord: Record<string, GuiPropertyDefinition> = {};
      for (const prop of properties) {
        const propDef: GuiPropertyDefinition = {
          type: prop.type,
        };
        if (prop.nullable) propDef.nullable = prop.nullable;
        if (prop.unique) propDef.unique = prop.unique;
        if (prop.default !== undefined && prop.default !== '') propDef.default = prop.default;
        if (prop.displayName) propDef.displayName = prop.displayName;
        if (prop.description) propDef.description = prop.description;
        if (prop.relation) propDef.relation = prop.relation;
        if (prop.target) propDef.target = prop.target;
        if (prop.targets && prop.targets.length > 0) propDef.targets = prop.targets;
        if (prop.morphName) propDef.morphName = prop.morphName;
        if (prop.inversedBy) propDef.inversedBy = prop.inversedBy;
        if (prop.mappedBy) propDef.mappedBy = prop.mappedBy;
        if (prop.onDelete) propDef.onDelete = prop.onDelete;
        if (prop.onUpdate) propDef.onUpdate = prop.onUpdate;
        if (prop.owning !== undefined) propDef.owning = prop.owning;
        if (prop.joinTable) propDef.joinTable = prop.joinTable;
        if (prop.length !== undefined) propDef.length = prop.length;
        if (prop.precision !== undefined) propDef.precision = prop.precision;
        if (prop.scale !== undefined) propDef.scale = prop.scale;
        if (prop.unsigned) propDef.unsigned = prop.unsigned;
        if (prop.enum) propDef.enum = prop.enum;
        if (prop.pivotFields && Object.keys(prop.pivotFields).length > 0) {
          propDef.pivotFields = prop.pivotFields;
        }

        propsRecord[prop.name] = propDef;
      }

      const schemaToSave: GuiSchema = {
        name: schemaData.name,
        kind: schemaData.kind,
        filePath: schema?.filePath,
        relativePath: schema?.relativePath,
      };

      if (schemaData.displayName) schemaToSave.displayName = schemaData.displayName;
      if (schemaData.singular) schemaToSave.singular = schemaData.singular;
      if (schemaData.plural) schemaToSave.plural = schemaData.plural;
      if (schemaData.titleIndex) schemaToSave.titleIndex = schemaData.titleIndex;
      if (schemaData.group) schemaToSave.group = schemaData.group;

      if (schemaData.kind === 'enum') {
        schemaToSave.values = enumValues;
      } else {
        schemaToSave.properties = propsRecord;
      }

      schemaToSave.options = {};
      if (schemaData.primaryKey === 'none') {
        schemaToSave.options.id = false;
      } else if (schemaData.primaryKey && schemaData.primaryKey !== 'BigInt') {
        schemaToSave.options.idType = schemaData.primaryKey as 'BigInt' | 'Int' | 'Uuid';
      }
      if (schemaData.timestamps === false) schemaToSave.options.timestamps = false;
      if (schemaData.softDelete) schemaToSave.options.softDelete = true;
      if (schemaData.tableName) schemaToSave.options.tableName = schemaData.tableName;
      if (schemaData.translations) schemaToSave.options.translations = schemaData.translations;
      if (schemaData.authenticatable) {
        schemaToSave.options.authenticatable = true;
        if (schemaData.authenticatableLoginIdField) {
          schemaToSave.options.authenticatableLoginIdField = schemaData.authenticatableLoginIdField;
        }
        if (schemaData.authenticatablePasswordField) {
          schemaToSave.options.authenticatablePasswordField = schemaData.authenticatablePasswordField;
        }
        if (schemaData.authenticatableGuardName) {
          schemaToSave.options.authenticatableGuardName = schemaData.authenticatableGuardName;
        }
      }
      if (indexes.length > 0) {
        schemaToSave.options.indexes = indexes.map((idx) => ({
          columns: idx.columns,
          unique: idx.unique,
          name: idx.name,
          type: idx.type as 'btree' | 'hash' | 'fulltext' | 'spatial' | 'gin' | 'gist' | undefined,
        }));
      }

      await validateSchema(schemaToSave);

      if (isNew) {
        await createSchema(schemaToSave);
        void message.success(`Schema "${schemaData.name}" created`);
        setIsDirty(false);
        setOriginalSchemaData({ ...schemaData });
        setOriginalProperties(properties.map((p) => ({ ...p })));
        setOriginalIndexes(indexes.map((i) => ({ ...i, columns: [...i.columns] })));
        setOriginalEnumValues(enumValues.map((v) => ({ ...v })));
        navigate(`/schema/${schemaData.name}`);
      } else {
        await updateSchema(name!, schemaToSave);
        void message.success(`Schema "${schemaData.name}" saved`);
        setIsDirty(false);
        setOriginalSchemaData({ ...schemaData });
        setOriginalProperties(properties.map((p) => ({ ...p })));
        setOriginalIndexes(indexes.map((i) => ({ ...i, columns: [...i.columns] })));
        setOriginalEnumValues(enumValues.map((v) => ({ ...v })));
      }
    } catch (error) {
      void message.error((error as Error).message);
    }
  };

  // Build current schema from state
  const buildCurrentSchema = (): GuiSchema => {
    const propsRecord: Record<string, GuiPropertyDefinition> = {};
    for (const prop of properties) {
      const propDef: GuiPropertyDefinition = { type: prop.type };
      if (prop.nullable) propDef.nullable = prop.nullable;
      if (prop.unique) propDef.unique = prop.unique;
      if (prop.default !== undefined && prop.default !== '') propDef.default = prop.default;
      if (prop.displayName) propDef.displayName = prop.displayName;
      if (prop.description) propDef.description = prop.description;
      if (prop.relation) propDef.relation = prop.relation;
      if (prop.target) propDef.target = prop.target;
      if (prop.targets && prop.targets.length > 0) propDef.targets = prop.targets;
      if (prop.morphName) propDef.morphName = prop.morphName;
      if (prop.inversedBy) propDef.inversedBy = prop.inversedBy;
      if (prop.mappedBy) propDef.mappedBy = prop.mappedBy;
      if (prop.onDelete) propDef.onDelete = prop.onDelete;
      if (prop.onUpdate) propDef.onUpdate = prop.onUpdate;
      if (prop.owning !== undefined) propDef.owning = prop.owning;
      if (prop.joinTable) propDef.joinTable = prop.joinTable;
      if (prop.length !== undefined) propDef.length = prop.length;
      if (prop.precision !== undefined) propDef.precision = prop.precision;
      if (prop.scale !== undefined) propDef.scale = prop.scale;
      if (prop.unsigned) propDef.unsigned = prop.unsigned;
      if (prop.primaryKey) propDef.primaryKey = prop.primaryKey;
      if (prop.autoIncrement) propDef.autoIncrement = prop.autoIncrement;
      if (prop.enum) propDef.enum = prop.enum;
      if (prop.pivotFields && Object.keys(prop.pivotFields).length > 0) {
        propDef.pivotFields = prop.pivotFields;
      }
      if (prop.multiple) propDef.multiple = prop.multiple;
      if (prop.maxFiles) propDef.maxFiles = prop.maxFiles;
      if (prop.accept && prop.accept.length > 0) propDef.accept = prop.accept;
      if (prop.maxSize) propDef.maxSize = prop.maxSize;

      propsRecord[prop.name] = propDef;
    }

    const schemaObj: GuiSchema = {
      name: schemaData.name,
      kind: schemaData.kind,
    };

    if (schemaData.displayName) schemaObj.displayName = schemaData.displayName;
    if (schemaData.singular) schemaObj.singular = schemaData.singular;
    if (schemaData.plural) schemaObj.plural = schemaData.plural;
    if (schemaData.titleIndex) schemaObj.titleIndex = schemaData.titleIndex;
    if (schemaData.group) schemaObj.group = schemaData.group;

    if (schemaData.kind === 'enum') {
      schemaObj.values = enumValues;
    } else {
      schemaObj.properties = propsRecord;
    }

    const hasAutoId = schemaData.primaryKey !== 'none';
    schemaObj.options = {};
    if (!hasAutoId) schemaObj.options.id = false;
    if (hasAutoId && schemaData.primaryKey !== 'BigInt') {
      schemaObj.options.idType = schemaData.primaryKey as 'BigInt' | 'Int' | 'Uuid';
    }
    if (schemaData.timestamps === false) schemaObj.options.timestamps = false;
    if (schemaData.softDelete) schemaObj.options.softDelete = true;
    if (schemaData.tableName) schemaObj.options.tableName = schemaData.tableName;
    if (schemaData.translations) schemaObj.options.translations = schemaData.translations;
    if (schemaData.authenticatable) {
      schemaObj.options.authenticatable = true;
      if (schemaData.authenticatableLoginIdField) {
        schemaObj.options.authenticatableLoginIdField = schemaData.authenticatableLoginIdField;
      }
      if (schemaData.authenticatablePasswordField) {
        schemaObj.options.authenticatablePasswordField = schemaData.authenticatablePasswordField;
      }
      if (schemaData.authenticatableGuardName) {
        schemaObj.options.authenticatableGuardName = schemaData.authenticatableGuardName;
      }
    }
    if (indexes.length > 0) {
      schemaObj.options.indexes = indexes.map((idx) => ({
        columns: idx.columns,
        unique: idx.unique,
        name: idx.name,
        type: idx.type as 'btree' | 'hash' | 'fulltext' | 'spatial' | 'gin' | 'gist' | undefined,
      }));
    }

    return schemaObj;
  };

  // Handle editor mode change
  const handleModeChange = (newMode: 'visual' | 'code'): void => {
    if (newMode === 'code') {
      const currentSchema = buildCurrentSchema();
      const yaml = schemaToYaml(currentSchema);
      setYamlContent(yaml);
      setYamlError(null);
      setEditorMode('code');
    } else {
      try {
        const parsedSchema = yamlToSchema(yamlContent, schemaData.name);

        setSchemaData({
          name: schemaData.name,
          kind: parsedSchema.kind,
          displayName: parsedSchema.displayName,
          singular: parsedSchema.singular,
          plural: parsedSchema.plural,
          titleIndex: parsedSchema.titleIndex,
          group: parsedSchema.group,
          primaryKey: parsedSchema.options?.id === false ? 'none' : (parsedSchema.options?.idType ?? 'BigInt') as 'BigInt' | 'Int' | 'Uuid' | 'none',
          timestamps: parsedSchema.options?.timestamps ?? true,
          softDelete: parsedSchema.options?.softDelete ?? false,
          tableName: parsedSchema.options?.tableName,
          translations: parsedSchema.options?.translations,
          authenticatable: parsedSchema.options?.authenticatable,
          authenticatableLoginIdField: parsedSchema.options?.authenticatableLoginIdField,
          authenticatablePasswordField: parsedSchema.options?.authenticatablePasswordField,
          authenticatableGuardName: parsedSchema.options?.authenticatableGuardName,
        });

        if (parsedSchema.properties) {
          const propsArray: PropertyFormData[] = Object.entries(parsedSchema.properties).map(
            ([propName, prop]) => ({
              name: propName,
              type: prop.type,
              nullable: prop.nullable,
              unique: prop.unique,
              default: prop.default !== undefined ? String(prop.default) : undefined,
              displayName: prop.displayName,
              description: prop.description,
              relation: prop.relation,
              target: prop.target,
              targets: prop.targets,
              morphName: prop.morphName,
              inversedBy: prop.inversedBy,
              mappedBy: prop.mappedBy,
              onDelete: prop.onDelete,
              onUpdate: prop.onUpdate,
              owning: prop.owning,
              joinTable: prop.joinTable,
              length: prop.length,
              precision: prop.precision,
              scale: prop.scale,
              unsigned: prop.unsigned,
              enum: prop.enum,
              pivotFields: prop.pivotFields,
              multiple: prop.multiple,
              maxFiles: prop.maxFiles,
              accept: prop.accept,
              maxSize: prop.maxSize,
            })
          );
          setProperties(propsArray);
        } else {
          setProperties([]);
        }

        if (parsedSchema.values) {
          setEnumValues(parsedSchema.values);
        } else {
          setEnumValues([]);
        }

        const regularIndexes: IndexFormData[] = (parsedSchema.options?.indexes ?? []).map((idx) => ({
          columns: [...idx.columns],
          unique: idx.unique,
          name: idx.name,
          type: idx.type,
        }));

        let uniqueAsIndexes: IndexFormData[] = [];
        if (parsedSchema.options?.unique) {
          uniqueAsIndexes = parsedSchema.options.unique.map((cols) => ({
            columns: Array.isArray(cols) ? [...cols] : [cols],
            unique: true,
          }));
        }

        setIndexes([...regularIndexes, ...uniqueAsIndexes]);

        setYamlError(null);
        setEditorMode('visual');
      } catch (e) {
        setYamlError(e instanceof Error ? e.message : 'Invalid YAML syntax');
      }
    }
  };

  // Schema modal handlers
  const openSchemaModal = (): void => {
    schemaForm.setFieldsValue(schemaData);
    setSchemaModalOpen(true);
  };

  const handleSchemaModalOk = async (): Promise<void> => {
    try {
      const values = await schemaForm.validateFields();
      setSchemaData({
        ...schemaData,
        ...values,
      });
      setSchemaModalOpen(false);
      setIsDirty(true);
    } catch {
      // Validation failed
    }
  };

  // Property modal handlers
  const openAddPropertyModal = (): void => {
    setEditingPropertyIndex(null);
    propertyForm.resetFields();
    propertyForm.setFieldsValue({ type: 'String', nullable: false, unique: false });
    setInlineEnumValues([]);
    setPivotFields([]);
    setPropertyModalOpen(true);
  };

  const openEditPropertyModal = (index: number): void => {
    setEditingPropertyIndex(index);
    const prop = properties[index];
    if (!prop) return;

    if (prop.type === 'Enum' && Array.isArray(prop.enum)) {
      const enumVals: GuiEnumValue[] = prop.enum.map((v) => {
        if (typeof v === 'string') return { value: v };
        if (typeof v === 'object' && v !== null && 'value' in v) {
          const obj = v as { value: string; label?: string; extra?: Record<string, unknown> };
          return {
            value: obj.value,
            label: obj.label,
            extra: obj.extra as Record<string, string | number | boolean> | undefined,
          };
        }
        return { value: String(v) };
      });
      setInlineEnumValues(enumVals);
    } else {
      setInlineEnumValues([]);
    }

    const formData = {
      ...prop,
      enum: prop.type === 'EnumRef' && typeof prop.enum === 'string' ? prop.enum : undefined,
      accept: prop.type === 'File' && Array.isArray(prop.accept) ? prop.accept.join(', ') : undefined,
    };
    propertyForm.setFieldsValue(formData);

    if (prop.type === 'Association' && prop.pivotFields) {
      const pf: GuiPivotField[] = Object.entries(prop.pivotFields).map(([fieldName, fieldDef]) => ({
        name: fieldName,
        type: (fieldDef as { type: string }).type,
        nullable: (fieldDef as { nullable?: boolean }).nullable,
        default: (fieldDef as { default?: unknown }).default !== undefined
          ? String((fieldDef as { default?: unknown }).default)
          : undefined,
      }));
      setPivotFields(pf);
    } else {
      setPivotFields([]);
    }

    setPropertyModalOpen(true);
  };

  const handlePropertyModalOk = async (): Promise<void> => {
    try {
      const values = await propertyForm.validateFields();

      if (values.type === 'Enum') {
        if (inlineEnumValues.length === 0) {
          void message.error('Enum must have at least one value');
          return;
        }
        for (let i = 0; i < inlineEnumValues.length; i++) {
          const enumVal = inlineEnumValues[i];
          if (!enumVal?.value?.trim()) {
            void message.error(`Enum value ${i + 1}: Value is required`);
            return;
          }
        }
      }

      const newProp: PropertyFormData = {
        name: values.name,
        type: values.type,
        nullable: values.nullable,
        unique: values.unique,
        default: values.default,
        displayName: values.displayName,
        description: values.description,
        relation: values.relation,
        target: values.target,
        targets: values.targets,
        morphName: values.morphName,
        inversedBy: values.inversedBy,
        mappedBy: values.mappedBy,
        onDelete: values.onDelete,
        onUpdate: values.onUpdate,
        owning: values.owning,
        joinTable: values.joinTable,
        length: values.length,
        precision: values.precision,
        scale: values.scale,
        unsigned: values.unsigned,
        enum: values.type === 'Enum' ? inlineEnumValues : values.enum,
        pivotFields: values.type === 'Association' && ['ManyToMany', 'MorphToMany'].includes(values.relation)
          ? pivotFields.length > 0
            ? pivotFields.reduce((acc, f) => ({
              ...acc,
              [f.name]: {
                type: f.type,
                ...(f.nullable ? { nullable: true } : {}),
                ...(f.default ? { default: f.default } : {}),
              },
            }), {} as Record<string, { type: string; nullable?: boolean; default?: unknown }>)
            : undefined
          : undefined,
        multiple: values.type === 'File' ? values.multiple : undefined,
        maxFiles: values.type === 'File' && values.multiple ? values.maxFiles : undefined,
        accept: values.type === 'File' && typeof values.accept === 'string' && values.accept.trim()
          ? values.accept.split(',').map((s: string) => s.trim()).filter(Boolean)
          : undefined,
        maxSize: values.type === 'File' ? values.maxSize : undefined,
      };

      if (editingPropertyIndex !== null) {
        const updated = [...properties];
        updated[editingPropertyIndex] = newProp;
        setProperties(updated);
      } else {
        setProperties([...properties, newProp]);
      }
      setPropertyModalOpen(false);
      setIsDirty(true);
    } catch {
      // Validation failed
    }
  };

  const removeProperty = (index: number): void => {
    setProperties(properties.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Index modal handlers
  const openAddIndexModal = (): void => {
    setEditingIndexIndex(null);
    indexForm.resetFields();
    indexForm.setFieldsValue({ unique: false });
    setIndexModalOpen(true);
  };

  const openEditIndexModal = (index: number): void => {
    setEditingIndexIndex(index);
    const idx = indexes[index];
    indexForm.setFieldsValue(idx);
    setIndexModalOpen(true);
  };

  // Generate index name
  const generateIndexName = (columns: string[], unique?: boolean, explicitName?: string, indexPosition?: number): string => {
    if (explicitName) return explicitName;
    const tableName = schemaData.tableName || schemaData.name.toLowerCase();
    const colsPart = columns.join('_');
    const suffix = unique ? 'unique' : 'idx';
    const positionSuffix = indexPosition !== undefined ? `_${indexPosition + 1}` : '';
    const fullName = `${tableName}_${colsPart}_${suffix}${positionSuffix}`;
    return fullName.length > 64 ? fullName.slice(0, 64) : fullName;
  };

  const handleIndexModalOk = async (): Promise<void> => {
    try {
      const values = await indexForm.validateFields();
      const newIndex: IndexFormData = {
        name: values.name || undefined,
        columns: values.columns,
        unique: values.unique,
        type: values.type || undefined,
      };

      const newPosition = editingIndexIndex !== null ? editingIndexIndex : indexes.length;
      const generatedName = generateIndexName(newIndex.columns, newIndex.unique, newIndex.name, newPosition);

      const duplicateIndex = indexes.findIndex((idx, i) => {
        if (editingIndexIndex !== null && i === editingIndexIndex) return false;
        const existingName = generateIndexName(idx.columns, idx.unique, idx.name, i);
        return existingName === generatedName;
      });

      if (duplicateIndex !== -1) {
        void message.error(t('index.duplicateName', { name: generatedName }));
        return;
      }

      if (editingIndexIndex !== null) {
        const updated = [...indexes];
        updated[editingIndexIndex] = newIndex;
        setIndexes(updated);
      } else {
        setIndexes([...indexes, newIndex]);
      }
      setIndexModalOpen(false);
      setIsDirty(true);
    } catch {
      // Validation failed
    }
  };

  const removeIndex = (index: number): void => {
    setIndexes(indexes.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Enum modal handlers
  const openAddEnumModal = (mode: 'shared' | 'inline' = 'shared'): void => {
    setEnumEditMode(mode);
    setEditingEnumIndex(null);
    enumForm.resetFields();
    enumForm.setFieldsValue({ value: '', label: '' });
    setEnumExtraProps([]);
    setEnumModalOpen(true);
  };

  const openEditEnumModal = (index: number, mode: 'shared' | 'inline' = 'shared'): void => {
    setEnumEditMode(mode);
    setEditingEnumIndex(index);
    const values = mode === 'shared' ? enumValues : inlineEnumValues;
    const enumVal = values[index];
    if (!enumVal) return;
    enumForm.setFieldsValue({
      value: enumVal.value,
      label: enumVal.label ?? '',
    });
    const extraArray = enumVal.extra
      ? Object.entries(enumVal.extra).map(([key, val]) => ({ key, value: String(val) }))
      : [];
    setEnumExtraProps(extraArray);
    setEnumModalOpen(true);
  };

  const handleEnumModalOk = async (): Promise<void> => {
    try {
      const values = await enumForm.validateFields();
      const currentValues = enumEditMode === 'shared' ? enumValues : inlineEnumValues;

      const existingValues = currentValues.map((v) => v.value);
      const idx = editingEnumIndex ?? currentValues.length;
      const valueError = validateEnumValueUI(values.value, existingValues, idx);
      if (!valueError.valid) {
        void message.error(valueError.error ?? 'Invalid value');
        return;
      }

      const extra: Record<string, string> = {};
      for (const prop of enumExtraProps) {
        if (prop.key.trim()) {
          extra[prop.key.trim()] = prop.value;
        }
      }

      const newEnumVal: GuiEnumValue = {
        value: values.value,
        label: values.label || undefined,
        extra: Object.keys(extra).length > 0 ? extra : undefined,
      };

      if (enumEditMode === 'shared') {
        if (editingEnumIndex !== null) {
          const updated = [...enumValues];
          updated[editingEnumIndex] = newEnumVal;
          setEnumValues(updated);
        } else {
          setEnumValues([...enumValues, newEnumVal]);
        }
        setIsDirty(true);
      } else {
        if (editingEnumIndex !== null) {
          const updated = [...inlineEnumValues];
          updated[editingEnumIndex] = newEnumVal;
          setInlineEnumValues(updated);
        } else {
          setInlineEnumValues([...inlineEnumValues, newEnumVal]);
        }
      }
      setEnumModalOpen(false);
    } catch {
      // Validation failed
    }
  };

  const removeEnumValue = (index: number, mode: 'shared' | 'inline' = 'shared'): void => {
    if (mode === 'shared') {
      setEnumValues(enumValues.filter((_, i) => i !== index));
      setIsDirty(true);
    } else {
      setInlineEnumValues(inlineEnumValues.filter((_, i) => i !== index));
    }
  };

  const addEnumExtraProp = (): void => {
    setEnumExtraProps([...enumExtraProps, { key: '', value: '' }]);
  };

  const updateEnumExtraProp = (index: number, field: 'key' | 'value', newValue: string): void => {
    const updated = [...enumExtraProps];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: newValue };
      setEnumExtraProps(updated);
    }
  };

  const removeEnumExtraProp = (index: number): void => {
    setEnumExtraProps(enumExtraProps.filter((_, i) => i !== index));
  };

  // Pivot field handlers
  const openAddPivotFieldModal = (): void => {
    setEditingPivotFieldIndex(null);
    pivotFieldForm.resetFields();
    pivotFieldForm.setFieldsValue({ name: '', type: 'String', nullable: false, default: '' });
    setPivotFieldModalOpen(true);
  };

  const openEditPivotFieldModal = (index: number): void => {
    setEditingPivotFieldIndex(index);
    const field = pivotFields[index];
    if (!field) return;
    pivotFieldForm.setFieldsValue({
      name: field.name,
      type: field.type,
      nullable: field.nullable ?? false,
      default: field.default ?? '',
    });
    setPivotFieldModalOpen(true);
  };

  const handlePivotFieldModalOk = async (): Promise<void> => {
    try {
      const values = await pivotFieldForm.validateFields();

      const existingNames = pivotFields.map((f) => f.name);
      const idx = editingPivotFieldIndex ?? pivotFields.length;
      if (existingNames.some((n, i) => i !== idx && n === values.name)) {
        void message.error(t('validation.duplicate', { field: values.name }));
        return;
      }

      const newField: GuiPivotField = {
        name: values.name,
        type: values.type,
        nullable: values.nullable || undefined,
        default: values.default || undefined,
      };

      if (editingPivotFieldIndex !== null) {
        const updated = [...pivotFields];
        updated[editingPivotFieldIndex] = newField;
        setPivotFields(updated);
      } else {
        setPivotFields([...pivotFields, newField]);
      }
      setPivotFieldModalOpen(false);
    } catch {
      // Validation failed
    }
  };

  const removePivotField = (index: number): void => {
    setPivotFields(pivotFields.filter((_, i) => i !== index));
  };

  if (loading && !schema && name !== 'new') {
    return (
      <div style={{ textAlign: 'center', padding: token.paddingXL }}>
        <Spin size="large" />
      </div>
    );
  }

  // Create display properties with virtual rows
  const isObjectSchema = schemaData.kind === 'object';
  const hasExplicitId = properties.some(p => p.name === 'id');
  const primaryKeyType = schemaData.primaryKey ?? 'BigInt';
  const hasAutoId = isObjectSchema && primaryKeyType !== 'none' && !hasExplicitId;

  const displayProperties: (PropertyFormData & { _isVirtual?: boolean; _idx?: number })[] = [
    ...(hasAutoId ? [{
      name: 'id',
      type: primaryKeyType === 'Uuid' ? 'Uuid' : 'Id',
      displayName: t('schema.fieldId'),
      nullable: false,
      unique: true,
      _isVirtual: true,
      _idx: -1,
    }] : []),
    ...properties.map((p, i) => ({ ...p, _idx: i })),
    ...(isObjectSchema && schemaData.timestamps !== false ? [
      {
        name: 'created_at',
        type: 'Timestamp' as const,
        displayName: t('schema.fieldCreatedAt'),
        nullable: true,
        _isVirtual: true,
        _idx: -2,
      },
      {
        name: 'updated_at',
        type: 'Timestamp' as const,
        displayName: t('schema.fieldUpdatedAt'),
        nullable: true,
        _isVirtual: true,
        _idx: -3,
      },
    ] : []),
    ...(isObjectSchema && schemaData.softDelete ? [{
      name: 'deleted_at',
      type: 'Timestamp' as const,
      displayName: t('schema.fieldDeletedAt'),
      nullable: true,
      _isVirtual: true,
      _idx: -4,
    }] : []),
  ];

  // Format type display
  const formatType = (record: PropertyFormData): string => {
    const type = record.type;
    if (type === 'Id') return 'BIGINT (PK)';
    if (type === 'Uuid') return 'UUID (PK)';
    if (type === 'String' || type === 'Email' || type === 'Password') {
      return record.length ? `VARCHAR(${record.length})` : 'VARCHAR(255)';
    }
    if (type === 'Text') return 'TEXT';
    if (type === 'LongText') return 'LONGTEXT';
    if (type === 'Int') return record.unsigned ? 'INT UNSIGNED' : 'INT';
    if (type === 'BigInt') return record.unsigned ? 'BIGINT UNSIGNED' : 'BIGINT';
    if (type === 'Float') return record.unsigned ? 'FLOAT UNSIGNED' : 'FLOAT';
    if (type === 'Decimal') {
      const p = record.precision ?? 8;
      const s = record.scale ?? 2;
      return record.unsigned ? `DECIMAL(${p},${s}) UNSIGNED` : `DECIMAL(${p},${s})`;
    }
    if (type === 'Boolean') return 'BOOLEAN';
    if (type === 'Date') return 'DATE';
    if (type === 'Time') return 'TIME';
    if (type === 'Timestamp') return 'TIMESTAMP';
    if (type === 'Json') return 'JSON';
    if (type === 'Enum') return 'ENUM';
    if (type === 'EnumRef') {
      const refName = record.enum;
      return typeof refName === 'string' ? `ENUM(${refName})` : 'ENUM_REF';
    }
    if (type === 'Association') return t('schema.typeAssociation');
    return type.toUpperCase();
  };

  // Get property index info
  const getPropertyIndexInfo = (propName: string, record: PropertyFormData): Array<{ type: 'pk' | 'unique' | 'index'; name?: string; columns: string[]; isInline?: boolean; indexPosition?: number }> => {
    const result: Array<{ type: 'pk' | 'unique' | 'index'; name?: string; columns: string[]; isInline?: boolean; indexPosition?: number }> = [];

    const isPK = propName === 'id' && hasAutoId;
    if (isPK) {
      result.push({ type: 'pk', columns: ['id'] });
    }

    if (record.unique && !isPK) {
      result.push({ type: 'unique', columns: [propName], isInline: true });
    }

    for (let i = 0; i < indexes.length; i++) {
      const idx = indexes[i];
      if (!idx) continue;
      if (idx.columns.includes(propName)) {
        if (isPK && idx.unique && idx.columns.length === 1) {
          continue;
        }
        result.push({
          type: idx.unique ? 'unique' : 'index',
          name: idx.name,
          indexPosition: i,
          columns: idx.columns,
        });
      }
    }

    return result;
  };

  // Property columns for table
  const propertyColumns = [
    {
      title: t('common.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (propName: string, record: PropertyFormData) => {
        const indexInfo = getPropertyIndexInfo(propName, record);
        const hasPK = indexInfo.some((i) => i.type === 'pk');
        const hasUnique = indexInfo.some((i) => i.type === 'unique');
        const iconColor = hasPK ? '#faad14' : hasUnique ? '#fa8c16' : '#8c8c8c';

        const tooltipContent = indexInfo.length > 0 ? (
          <div>
            {indexInfo.map((info, i) => {
              let text: string;
              if (info.type === 'pk') {
                text = 'PRIMARY KEY (AUTO_INCREMENT)';
              } else if (info.isInline) {
                text = 'UNIQUE (field property)';
              } else {
                const label = info.type === 'unique' ? 'UNIQUE' : 'INDEX';
                const indexName = generateIndexName(info.columns, info.type === 'unique', info.name, info.indexPosition);
                text = `${label} "${indexName}": (${info.columns.join(', ')})`;
              }
              return <div key={i} style={{ whiteSpace: 'nowrap' }}>{text}</div>;
            })}
          </div>
        ) : null;

        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ flex: 1 }}>
              <Text strong>{propName}</Text>
              {record.displayName && (
                <div><Text type="secondary">{record.displayName}</Text></div>
              )}
            </div>
            {indexInfo.length > 0 && (
              <Tooltip title={tooltipContent}>
                <KeyOutlined style={{ color: iconColor, fontSize: 14, cursor: 'pointer' }} />
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: t('common.type'),
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (_: string, record: PropertyFormData) => {
        if (record.type === 'Association' && record.relation) {
          return (
            <>
              {t('schema.typeAssociation')}
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{record.relation}</Text>
            </>
          );
        }
        return formatType(record);
      },
    },
    {
      title: t('common.options'),
      key: 'settings',
      width: 180,
      render: (_: unknown, record: PropertyFormData & { _isVirtual?: boolean }) => {
        if (record._isVirtual) {
          if (record.name === 'id') {
            return (
              <Space size={4} wrap>
                <Tag color="gold">PK</Tag>
                {record.type === 'Id' && (
                  <Tooltip title="Auto Increment">
                    <Tag color="green">AI</Tag>
                  </Tooltip>
                )}
              </Space>
            );
          }
          return null;
        }
        const hasOnDelete = record.type === 'Association' && record.onDelete;
        const hasOnUpdate = record.type === 'Association' && record.onUpdate;
        return (
          <Space size={4} wrap>
            {!record.nullable && (
              <Tooltip title="NOT NULL">
                <Tag color="red">NN</Tag>
              </Tooltip>
            )}
            {record.unique && <Tag color="blue">unique</Tag>}
            {record.unsigned && <Tag>unsigned</Tag>}
            {(hasOnDelete || hasOnUpdate) && (
              <Tooltip title={
                <div>
                  {hasOnDelete && <div>onDelete: {record.onDelete}</div>}
                  {hasOnUpdate && <div>onUpdate: {record.onUpdate}</div>}
                </div>
              }>
                <Tag color="volcano" style={{ cursor: 'pointer' }}>
                  {record.onDelete === record.onUpdate
                    ? record.onDelete
                    : `${record.onDelete || '-'}/${record.onUpdate || '-'}`}
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: t('property.references', 'References'),
      key: 'references',
      width: 180,
      render: (_: unknown, record: PropertyFormData) => {
        if (record.type !== 'Association') return <Text type="secondary">-</Text>;
        const inverseField = record.inversedBy || record.mappedBy;
        if (record.target) {
          return (
            <div>
              <div>→ <a onClick={() => navigate(`/schema/${record.target}`)}>{record.target}</a></div>
              {inverseField && <Text type="secondary" style={{ fontSize: 12 }}>.{inverseField}</Text>}
            </div>
          );
        }
        if (record.targets && record.targets.length > 0) {
          return (
            <span>
              → [{record.targets.map((target, i) => (
                <span key={target}>
                  {i > 0 && ', '}
                  <a onClick={() => navigate(`/schema/${target}`)}>{target}</a>
                </span>
              ))}]
            </span>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: t('property.defaultValue'),
      key: 'default',
      width: 120,
      render: (_: unknown, record: PropertyFormData) => (
        record.default !== undefined && record.default !== ''
          ? record.default
          : <Text type="secondary">-</Text>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 80,
      render: (_: unknown, record: PropertyFormData & { _isVirtual?: boolean; _idx?: number }) => {
        if (record._isVirtual || record._idx === undefined || record._idx < 0) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditPropertyModal(record._idx!)}
            />
            <Popconfirm
              title={t('property.deleteConfirm')}
              onConfirm={() => removeProperty(record._idx!)}
              okText={t('common.yes')}
              cancelText={t('common.no')}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // Index columns for table
  const indexColumns = [
    {
      title: t('index.columns'),
      dataIndex: 'columns',
      key: 'columns',
      render: (columns: string[]) => (
        <Space size="small">
          {columns.map((col) => (
            <Tag key={col} icon={<KeyOutlined />}>{col}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('common.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string | undefined, record: IndexFormData & { _idx: number }) => (
        <Text type="secondary">{generateIndexName(record.columns, record.unique, text, record._idx)}</Text>
      ),
    },
    {
      title: t('common.type'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string | undefined) => type ? <Tag color="blue">{type}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: t('property.settings'),
      key: 'settings',
      width: 120,
      render: (_: unknown, record: IndexFormData) => (
        <Space size="small">
          {record.unique && <Tag color="orange">{t('property.unique')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 80,
      render: (_: unknown, record: IndexFormData & { _idx: number }) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditIndexModal(record._idx)}
          />
          <Popconfirm
            title={t('index.deleteConfirm')}
            onConfirm={() => removeIndex(record._idx)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Build options tags for display
  const optionsTags: React.ReactNode[] = [];
  if (schemaData.primaryKey && schemaData.primaryKey !== 'none') {
    optionsTags.push(<Tag key="id" color="blue">ID: {schemaData.primaryKey}</Tag>);
  }
  if (schemaData.timestamps) optionsTags.push(<Tag key="ts" color="green">Timestamps</Tag>);
  if (schemaData.softDelete) optionsTags.push(<Tag key="sd" color="orange">Soft Delete</Tag>);
  if (schemaData.translations) optionsTags.push(<Tag key="tr" color="purple">Translations</Tag>);
  if (schemaData.authenticatable) optionsTags.push(<Tag key="auth" color="red">Authenticatable</Tag>);

  return (
    <div>
      <div style={{ marginBottom: token.margin, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          Back
        </Button>
        <Segmented
          size="small"
          options={[
            { label: t('schema.visualMode'), value: 'visual', icon: <FormOutlined /> },
            { label: t('schema.codeMode'), value: 'code', icon: <CodeOutlined /> },
          ]}
          value={editorMode}
          onChange={(value) => handleModeChange(value as 'visual' | 'code')}
        />
        <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSave}>
          {isNew ? 'Create Schema' : 'Save Changes'}
        </Button>
      </div>

      {editorMode === 'visual' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: token.margin }}>
          {/* Schema Info Card */}
          <SchemaInfoCard
            schemaData={{
              name: schemaData.name,
              displayName: schemaData.displayName,
              kind: schemaData.kind,
              singular: schemaData.singular,
              plural: schemaData.plural,
              group: schemaData.group,
              tableName: schemaData.tableName,
              titleIndex: schemaData.titleIndex,
              authenticatable: schemaData.authenticatable,
              authenticatableLoginIdField: schemaData.authenticatableLoginIdField,
              authenticatablePasswordField: schemaData.authenticatablePasswordField,
              authenticatableGuardName: schemaData.authenticatableGuardName,
            }}
            isNew={isNew}
            autoSingular={autoSingular}
            autoPlural={autoPlural}
            autoTableName={autoTableName}
            optionsTags={optionsTags}
            onEdit={openSchemaModal}
          />

          {/* Enum Values Card (only for enum kind) */}
          {schemaData.kind === 'enum' && (
            <EnumValuesCard
              enumValues={enumValues}
              isEnumValueNew={isEnumValueNew}
              isEnumValueChanged={isEnumValueChanged}
              onAdd={() => openAddEnumModal('shared')}
              onEdit={(index) => openEditEnumModal(index, 'shared')}
              onRemove={(index) => removeEnumValue(index, 'shared')}
            />
          )}

          {/* Properties Card (only for object kind) */}
          {schemaData.kind === 'object' && (
            <PropertiesCard
              displayProperties={displayProperties}
              columns={propertyColumns}
              isPropertyNew={isPropertyNew}
              isPropertyChanged={isPropertyChanged}
              onAdd={openAddPropertyModal}
            />
          )}

          {/* Indexes Card (only for object kind) */}
          {schemaData.kind === 'object' && (
            <IndexesCard
              indexes={indexes}
              columns={indexColumns}
              isIndexNew={isIndexNew}
              isIndexChanged={isIndexChanged}
              onAdd={openAddIndexModal}
              disableAdd={propertyNames.length === 0}
            />
          )}
        </div>
      ) : (
        /* Code/YAML Editor Mode */
        <YamlEditorCard
          schemaName={schemaData.name}
          yamlContent={yamlContent}
          yamlError={yamlError}
          onYamlChange={(val) => {
            setYamlContent(val);
            setIsDirty(true);
          }}
        />
      )}

      {/* Schema Edit Modal */}
      <SchemaModal
        open={schemaModalOpen}
        form={schemaForm}
        isNew={isNew}
        autoSingular={autoSingular}
        autoPlural={autoPlural}
        autoTableName={autoTableName}
        propertyNames={propertyNames}
        groupOptions={groupOptions}
        onOk={handleSchemaModalOk}
        onCancel={() => setSchemaModalOpen(false)}
      />

      {/* Property Modal */}
      <PropertyModal
        open={propertyModalOpen}
        form={propertyForm}
        editingIndex={editingPropertyIndex}
        customTypes={customTypes}
        schemaNames={schemaNames}
        schemas={schemas}
        inlineEnumValues={inlineEnumValues}
        pivotFields={pivotFields}
        onOk={handlePropertyModalOk}
        onCancel={() => setPropertyModalOpen(false)}
        onAddEnumValue={() => openAddEnumModal('inline')}
        onEditEnumValue={(index) => openEditEnumModal(index, 'inline')}
        onRemoveEnumValue={(index) => removeEnumValue(index, 'inline')}
        onAddPivotField={openAddPivotFieldModal}
        onEditPivotField={openEditPivotFieldModal}
        onRemovePivotField={removePivotField}
      />

      {/* Index Modal */}
      <IndexModal
        open={indexModalOpen}
        form={indexForm}
        editingIndex={editingIndexIndex}
        propertyNames={propertyNames}
        indexTypes={indexTypes}
        databaseType={databaseType}
        onOk={handleIndexModalOk}
        onCancel={() => setIndexModalOpen(false)}
      />

      {/* Enum Value Modal */}
      <EnumModal
        open={enumModalOpen}
        form={enumForm}
        editingIndex={editingEnumIndex}
        extraProps={enumExtraProps}
        onOk={handleEnumModalOk}
        onCancel={() => setEnumModalOpen(false)}
        onAddExtraProp={addEnumExtraProp}
        onUpdateExtraProp={updateEnumExtraProp}
        onRemoveExtraProp={removeEnumExtraProp}
      />

      {/* Pivot Field Modal */}
      <PivotFieldModal
        open={pivotFieldModalOpen}
        form={pivotFieldForm}
        editingIndex={editingPivotFieldIndex}
        onOk={handlePivotFieldModalOk}
        onCancel={() => setPivotFieldModalOpen(false)}
      />

      {/* Unsaved Changes Blocker Modal */}
      <UnsavedChangesModal
        open={blocker.state === 'blocked'}
        onProceed={() => blocker.proceed?.()}
        onReset={() => blocker.reset?.()}
      />
    </div>
  );
}
