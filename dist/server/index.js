#!/usr/bin/env node

// src/server/index.ts
import { createServer } from "http";
import { join as join5, resolve as resolve2 } from "path";
import { existsSync, unlinkSync } from "fs";
import open from "open";
import { loadConfig } from "@famgia/omnify-cli";

// src/server/app.ts
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join as join4 } from "path";

// src/server/api/schemas.ts
import { Router } from "express";

// src/server/services/schemaService.ts
import { loadSchemas } from "@famgia/omnify-core";
import { resolveLocalizedString } from "@famgia/omnify-types";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { stringify } from "yaml";
function normalizeIndexes(indexes) {
  if (!indexes || !Array.isArray(indexes)) return void 0;
  return indexes.map((idx) => {
    if (typeof idx === "object" && idx !== null && "columns" in idx) {
      return idx;
    }
    if (Array.isArray(idx)) {
      return { columns: idx.map(String) };
    }
    return { columns: [String(idx)] };
  });
}
function normalizeEnumValues(values) {
  if (!values || !Array.isArray(values)) return void 0;
  return values.map((v) => {
    if (typeof v === "object" && v !== null && "value" in v) {
      const obj = v;
      return {
        value: String(obj.value),
        label: obj.label ? String(obj.label) : void 0,
        extra: obj.extra
      };
    }
    return { value: String(v) };
  });
}
var SchemaService = class {
  cache = /* @__PURE__ */ new Map();
  async loadAll(schemasDir2) {
    try {
      const schemas = await loadSchemas(schemasDir2);
      const guiSchemas = {};
      for (const [name, schema] of Object.entries(schemas)) {
        const normalizedOptions = schema.options ? {
          ...schema.options,
          indexes: normalizeIndexes(schema.options.indexes)
        } : void 0;
        guiSchemas[name] = {
          name: schema.name,
          kind: schema.kind ?? "object",
          displayName: resolveLocalizedString(schema.displayName),
          filePath: schema.filePath,
          relativePath: schema.relativePath,
          properties: schema.properties,
          options: normalizedOptions,
          values: normalizeEnumValues(schema.values),
          isDirty: false,
          validationErrors: []
        };
      }
      this.cache.set(schemasDir2, guiSchemas);
      return guiSchemas;
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }
  async load(schemasDir2, name) {
    const schemas = await this.loadAll(schemasDir2);
    return schemas[name] ?? null;
  }
  async save(schemasDir2, schema) {
    const {
      isDirty: _isDirty,
      validationErrors: _validationErrors,
      filePath,
      relativePath,
      name,
      // Derived from filename, don't save
      kind,
      // Only save if enum (object is default)
      ...yamlData
    } = schema;
    const dataToSave = kind === "enum" ? { kind, ...yamlData } : yamlData;
    let targetPath;
    let targetRelativePath;
    if (filePath && relativePath) {
      targetPath = filePath;
      targetRelativePath = relativePath;
    } else {
      const fileName = `${name}.yaml`;
      targetPath = join(schemasDir2, fileName);
      targetRelativePath = fileName;
    }
    const yamlContent = stringify(dataToSave, {
      lineWidth: 120,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN"
    });
    await writeFile(targetPath, yamlContent, "utf-8");
    return {
      ...schema,
      filePath: targetPath,
      relativePath: targetRelativePath,
      isDirty: false,
      validationErrors: []
    };
  }
  async delete(schemasDir2, name) {
    const schemas = await this.loadAll(schemasDir2);
    const schema = schemas[name];
    if (!schema?.filePath) {
      throw new Error(`Schema "${name}" not found`);
    }
    await unlink(schema.filePath);
    this.cache.delete(schemasDir2);
  }
  clearCache(schemasDir2) {
    if (schemasDir2) {
      this.cache.delete(schemasDir2);
    } else {
      this.cache.clear();
    }
  }
};
var schemaService = new SchemaService();

// src/server/api/schemas.ts
var schemasRouter = Router();
schemasRouter.get("/", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const schemas = await schemaService.loadAll(config.schemasDir);
    const response = {
      success: true,
      data: schemas
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "LOAD_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
schemasRouter.get("/:name", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const { name } = req.params;
    const schema = await schemaService.load(config.schemasDir, name);
    if (!schema) {
      const response2 = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Schema "${name}" not found`
        }
      };
      res.status(404).json(response2);
      return;
    }
    const response = {
      success: true,
      data: schema
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "LOAD_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
schemasRouter.post("/", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const schema = req.body;
    if (!schema.name) {
      const response2 = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Schema name is required"
        }
      };
      res.status(400).json(response2);
      return;
    }
    const saved = await schemaService.save(config.schemasDir, schema);
    const response = {
      success: true,
      data: saved
    };
    res.status(201).json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "SAVE_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
schemasRouter.put("/:name", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const { name } = req.params;
    const schema = req.body;
    schema.name = name;
    const saved = await schemaService.save(config.schemasDir, schema);
    const response = {
      success: true,
      data: saved
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "SAVE_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
schemasRouter.delete("/:name", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const { name } = req.params;
    await schemaService.delete(config.schemasDir, name);
    const response = {
      success: true
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "DELETE_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});

// src/server/api/validate.ts
import { Router as Router2 } from "express";

// src/server/services/validationService.ts
import { loadSchemas as loadSchemas2, validateSchemas } from "@famgia/omnify-core";
import { resolveLocalizedString as resolveLocalizedString2 } from "@famgia/omnify-types";
function toLoadedSchema(schema) {
  const result = {
    name: schema.name,
    kind: schema.kind,
    filePath: schema.filePath,
    relativePath: schema.relativePath ?? schema.name + ".yaml"
  };
  if (schema.displayName !== void 0) {
    result.displayName = schema.displayName;
  }
  if (schema.properties !== void 0) {
    result.properties = schema.properties;
  }
  if (schema.options !== void 0) {
    result.options = schema.options;
  }
  if (schema.values !== void 0) {
    result.values = schema.values.map((v) => v.value);
  }
  return result;
}
var ValidationService = class {
  async validateSchema(schema, schemasDir2) {
    try {
      const allSchemas = await loadSchemas2(schemasDir2);
      const loadedSchema = toLoadedSchema(schema);
      const schemasToValidate = { ...allSchemas };
      schemasToValidate[schema.name] = loadedSchema;
      const result = validateSchemas(schemasToValidate);
      const schemaResult = result.schemas.find((s) => s.schemaName === schema.name);
      const schemaErrors = [];
      if (schemaResult) {
        for (const e of schemaResult.errors) {
          schemaErrors.push({
            path: this.getErrorPath(e, schema.name),
            message: e.message,
            severity: "error"
          });
        }
      }
      return {
        valid: schemaErrors.length === 0,
        errors: schemaErrors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: schema.name,
            message: error.message,
            severity: "error"
          }
        ]
      };
    }
  }
  async validateAll(schemas) {
    try {
      const loadedSchemas = {};
      for (const [name, schema] of Object.entries(schemas)) {
        loadedSchemas[name] = toLoadedSchema(schema);
      }
      const result = validateSchemas(loadedSchemas);
      const errors = [];
      for (const schemaResult of result.schemas) {
        for (const e of schemaResult.errors) {
          errors.push({
            path: this.getErrorPath(e, schemaResult.schemaName),
            message: e.message,
            severity: "error"
          });
        }
      }
      return {
        valid: result.valid,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: "root",
            message: error.message,
            severity: "error"
          }
        ]
      };
    }
  }
  async validateFromDisk(schemasDir2) {
    try {
      const schemas = await loadSchemas2(schemasDir2);
      const guiSchemas = {};
      for (const [name, schema] of Object.entries(schemas)) {
        guiSchemas[name] = {
          name: schema.name,
          kind: schema.kind ?? "object",
          displayName: resolveLocalizedString2(schema.displayName),
          filePath: schema.filePath,
          relativePath: schema.relativePath,
          properties: schema.properties,
          options: schema.options,
          // Convert readonly string[] to GuiEnumValue[]
          values: schema.values?.map((v) => ({ value: v }))
        };
      }
      return this.validateAll(guiSchemas);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: "root",
            message: error.message,
            severity: "error"
          }
        ]
      };
    }
  }
  getErrorPath(error, schemaName) {
    const details = error.details;
    if (details && "propertyName" in details && details.propertyName) {
      return `${schemaName}.${String(details.propertyName)}`;
    }
    return schemaName;
  }
};
var validationService = new ValidationService();

// src/server/api/validate.ts
var validateRouter = Router2();
validateRouter.post("/", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const body = req.body;
    let result;
    if (body.schema) {
      result = await validationService.validateSchema(body.schema, config.schemasDir);
    } else if (body.schemas) {
      result = await validationService.validateAll(body.schemas);
    } else {
      result = await validationService.validateFromDisk(config.schemasDir);
    }
    const response = {
      success: true,
      data: result
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});

// src/server/api/preview.ts
import { Router as Router3 } from "express";

// src/server/services/previewService.ts
import { loadSchemas as loadSchemas3 } from "@famgia/omnify-core";
import { generateMigrations as generateLaravelMigrations } from "@famgia/omnify-laravel";
import { generateMigrations as generateSqlMigrations } from "@famgia/omnify-sql";
var PreviewService = class {
  async generateAll(schemasDir2, type) {
    const schemas = await loadSchemas3(schemasDir2);
    const previews = [];
    switch (type) {
      case "laravel": {
        const migrations = await generateLaravelMigrations(schemas);
        for (const migration of migrations) {
          previews.push({
            type: "laravel",
            content: migration.content,
            fileName: migration.fileName
          });
        }
        break;
      }
      case "sql": {
        const migrations = generateSqlMigrations(schemas, { dialect: "mysql" });
        for (const migration of migrations) {
          previews.push({
            type: "sql",
            content: migration.content,
            fileName: migration.fileName
          });
        }
        break;
      }
      case "typescript": {
        for (const [name, schema] of Object.entries(schemas)) {
          if (schema.kind === "enum") {
            previews.push({
              type: "typescript",
              content: this.generateEnumType(name, schema),
              fileName: `${name}.ts`
            });
          } else {
            previews.push({
              type: "typescript",
              content: this.generateInterfaceType(name, schema),
              fileName: `${name}.ts`
            });
          }
        }
        break;
      }
    }
    return previews;
  }
  async generateForSchema(schemasDir2, schemaName, type) {
    const schemas = await loadSchemas3(schemasDir2);
    const schema = schemas[schemaName];
    if (!schema) {
      return null;
    }
    switch (type) {
      case "laravel": {
        const migrations = await generateLaravelMigrations({ [schemaName]: schema });
        const migration = migrations[0];
        return migration ? {
          type: "laravel",
          content: migration.content,
          fileName: migration.fileName
        } : null;
      }
      case "sql": {
        const migrations = generateSqlMigrations({ [schemaName]: schema }, { dialect: "mysql" });
        const migration = migrations[0];
        return migration ? {
          type: "sql",
          content: migration.content,
          fileName: migration.fileName
        } : null;
      }
      case "typescript": {
        if (schema.kind === "enum") {
          return {
            type: "typescript",
            content: this.generateEnumType(schemaName, schema),
            fileName: `${schemaName}.ts`
          };
        }
        return {
          type: "typescript",
          content: this.generateInterfaceType(schemaName, schema),
          fileName: `${schemaName}.ts`
        };
      }
    }
  }
  generateEnumType(name, schema) {
    const values = schema.values ?? [];
    return `export type ${name} = ${values.map((v) => `'${v}'`).join(" | ") || "never"};
`;
  }
  generateInterfaceType(name, schema) {
    const lines = [`export interface ${name} {`];
    if (schema.properties) {
      for (const [propName, prop] of Object.entries(schema.properties)) {
        const tsType = this.mapToTsType(prop.type);
        const optional = prop.nullable ? "?" : "";
        lines.push(`  ${propName}${optional}: ${tsType};`);
      }
    }
    lines.push("}");
    return lines.join("\n") + "\n";
  }
  mapToTsType(omnifyType) {
    const typeMap = {
      String: "string",
      Int: "number",
      BigInt: "number",
      Float: "number",
      Decimal: "number",
      Boolean: "boolean",
      Text: "string",
      LongText: "string",
      Date: "string",
      Time: "string",
      Timestamp: "string",
      Json: "Record<string, unknown>",
      Email: "string",
      Password: "string",
      File: "string",
      MultiFile: "string[]",
      Point: "{ lat: number; lng: number }",
      Coordinates: "{ latitude: number; longitude: number }"
    };
    return typeMap[omnifyType] ?? "unknown";
  }
};
var previewService = new PreviewService();

// src/server/api/preview.ts
var previewRouter = Router3();
previewRouter.get("/:type", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const { type } = req.params;
    if (!["laravel", "typescript", "sql"].includes(type)) {
      const response2 = {
        success: false,
        error: {
          code: "INVALID_TYPE",
          message: `Invalid preview type: ${type}. Valid types: laravel, typescript, sql`
        }
      };
      res.status(400).json(response2);
      return;
    }
    const previews = await previewService.generateAll(config.schemasDir, type);
    const response = {
      success: true,
      data: previews
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "PREVIEW_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
previewRouter.get("/:type/:name", async (req, res) => {
  try {
    const config = req.app.locals.config;
    const { type, name } = req.params;
    if (!["laravel", "typescript", "sql"].includes(type)) {
      const response2 = {
        success: false,
        error: {
          code: "INVALID_TYPE",
          message: `Invalid preview type: ${type}. Valid types: laravel, typescript, sql`
        }
      };
      res.status(400).json(response2);
      return;
    }
    const preview = await previewService.generateForSchema(
      config.schemasDir,
      name,
      type
    );
    if (!preview) {
      const response2 = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Schema "${name}" not found`
        }
      };
      res.status(404).json(response2);
      return;
    }
    const response = {
      success: true,
      data: preview
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "PREVIEW_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});

// src/server/api/config.ts
import { Router as Router4 } from "express";

// src/shared/constants.ts
var DEFAULT_PORT = 3456;
var DEFAULT_HOST = "localhost";
var PK_TYPES = ["Id", "Uuid"];
var PROPERTY_TYPES = [
  "String",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "Boolean",
  "Text",
  "LongText",
  "Date",
  "Time",
  "Timestamp",
  "Json",
  "Email",
  "Password",
  "File",
  "Point",
  "Coordinates",
  "Enum",
  "EnumRef"
];
var ALL_PROPERTY_TYPES = [...PK_TYPES, ...PROPERTY_TYPES];

// src/server/api/config.ts
var configRouter = Router4();
configRouter.get("/", (req, res) => {
  const appConfig = req.app.locals.config;
  const config = {
    schemasDir: appConfig.schemasDir,
    port: Number(process.env.PORT) || DEFAULT_PORT,
    host: process.env.HOST ?? DEFAULT_HOST,
    customTypes: appConfig.customTypes ?? [],
    plugins: []
    // Plugins are fetched via /api/plugins
  };
  const response = {
    success: true,
    data: config
  };
  res.json(response);
});

// src/server/api/versions.ts
import { Router as Router5 } from "express";

// src/server/services/versionService.ts
import { loadSchemas as loadSchemas4 } from "@famgia/omnify-core";
import { writeFile as writeFile2, unlink as unlink2, readdir } from "fs/promises";
import { join as join2 } from "path";
import { stringify as stringify2 } from "yaml";
import {
  createVersionStore
} from "@famgia/omnify-core";
var store = null;
var schemasDir = null;
function initVersionStore(baseDir, schemasDirPath) {
  store = createVersionStore({ baseDir, maxVersions: 100 });
  schemasDir = schemasDirPath;
}
function getStore() {
  if (!store) {
    throw new Error("Version store not initialized. Call initVersionStore first.");
  }
  return store;
}
async function listVersions() {
  return getStore().listVersions();
}
async function getVersion(version) {
  return getStore().readVersion(version);
}
async function getLatestVersion() {
  return getStore().readLatestVersion();
}
async function diffVersions(fromVersion, toVersion) {
  return getStore().diffVersions(fromVersion, toVersion);
}
function propertyToSnapshot(prop) {
  return {
    type: prop.type,
    ...prop.displayName !== void 0 && { displayName: prop.displayName },
    ...prop.description !== void 0 && { description: prop.description },
    ...prop.nullable !== void 0 && { nullable: prop.nullable },
    ...prop.unique !== void 0 && { unique: prop.unique },
    ...prop.default !== void 0 && { default: prop.default },
    ...prop.length !== void 0 && { length: prop.length },
    ...prop.unsigned !== void 0 && { unsigned: prop.unsigned },
    ...prop.precision !== void 0 && { precision: prop.precision },
    ...prop.scale !== void 0 && { scale: prop.scale },
    ...prop.enum !== void 0 && { enum: prop.enum },
    ...prop.relation !== void 0 && { relation: prop.relation },
    ...prop.target !== void 0 && { target: prop.target },
    ...prop.targets !== void 0 && { targets: prop.targets },
    ...prop.morphName !== void 0 && { morphName: prop.morphName },
    ...prop.onDelete !== void 0 && { onDelete: prop.onDelete },
    ...prop.onUpdate !== void 0 && { onUpdate: prop.onUpdate },
    ...prop.mappedBy !== void 0 && { mappedBy: prop.mappedBy },
    ...prop.inversedBy !== void 0 && { inversedBy: prop.inversedBy },
    ...prop.joinTable !== void 0 && { joinTable: prop.joinTable },
    ...prop.owning !== void 0 && { owning: prop.owning }
  };
}
function schemasToSnapshot(schemas) {
  const snapshot = {};
  for (const [name, schema] of Object.entries(schemas)) {
    const properties = {};
    if (schema.properties) {
      for (const [propName, prop] of Object.entries(schema.properties)) {
        properties[propName] = propertyToSnapshot(prop);
      }
    }
    const opts = schema.options;
    const rawIndexes = opts?.indexes;
    const indexSnapshots = rawIndexes?.map((idx) => ({
      columns: idx.columns,
      ...idx.unique !== void 0 && { unique: idx.unique },
      ...idx.name !== void 0 && { name: idx.name },
      ...idx.type !== void 0 && { type: idx.type }
    }));
    const rawUnique = opts?.unique;
    const uniqueAsIndexes = rawUnique?.map((cols, i) => ({
      columns: cols,
      unique: true,
      name: `unique_${i}`
    }));
    const allIndexes = [...indexSnapshots ?? [], ...uniqueAsIndexes ?? []];
    const snapshotOptions = {};
    if (opts?.id === false) snapshotOptions.id = false;
    if (opts?.idType && opts.idType !== "BigInt") snapshotOptions.idType = opts.idType;
    if (opts?.timestamps === false) snapshotOptions.timestamps = false;
    if (opts?.softDelete === true) snapshotOptions.softDelete = true;
    if (opts?.tableName) snapshotOptions.tableName = opts.tableName;
    if (opts?.translations === true) snapshotOptions.translations = true;
    if (opts?.authenticatable === true) snapshotOptions.authenticatable = true;
    if (allIndexes.length > 0) snapshotOptions.indexes = allIndexes;
    snapshot[name] = {
      name: schema.name,
      kind: schema.kind ?? "object",
      ...Object.keys(properties).length > 0 && { properties },
      ...schema.values && { values: schema.values },
      ...Object.keys(snapshotOptions).length > 0 && { options: snapshotOptions }
    };
  }
  return snapshot;
}
async function createVersion(description) {
  if (!schemasDir) {
    throw new Error("Schemas directory not initialized");
  }
  const storeInstance = getStore();
  const currentSchemas = await loadSchemas4(schemasDir);
  const currentSnapshot = schemasToSnapshot(currentSchemas);
  const latestVersion = await storeInstance.readLatestVersion();
  let changes;
  if (!latestVersion) {
    changes = Object.keys(currentSnapshot).map((name) => ({
      action: "schema_added",
      schema: name
    }));
  } else {
    changes = storeInstance.computeSnapshotDiff(latestVersion.snapshot, currentSnapshot);
  }
  if (changes.length === 0) {
    throw new Error("No changes to create version");
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const migration = `${timestamp}_omnify_migration`;
  const versionFile = await storeInstance.createVersion(currentSnapshot, changes, {
    driver: "mysql",
    // TODO: Get from config
    migration,
    description
  });
  return {
    version: versionFile.version,
    migration: versionFile.migration ?? migration,
    changes: versionFile.changes
  };
}
async function getPendingChanges() {
  if (!schemasDir) {
    throw new Error("Schemas directory not initialized");
  }
  const storeInstance = getStore();
  const currentSchemas = await loadSchemas4(schemasDir);
  const currentSnapshot = schemasToSnapshot(currentSchemas);
  const latestVersion = await storeInstance.readLatestVersion();
  if (!latestVersion) {
    const changes2 = Object.keys(currentSnapshot).map((name) => ({
      action: "schema_added",
      schema: name
    }));
    return {
      hasChanges: changes2.length > 0,
      changes: changes2,
      currentSchemaCount: Object.keys(currentSnapshot).length,
      previousSchemaCount: 0,
      latestVersion: null
    };
  }
  const changes = storeInstance.computeSnapshotDiff(latestVersion.snapshot, currentSnapshot);
  return {
    hasChanges: changes.length > 0,
    changes,
    currentSchemaCount: Object.keys(currentSnapshot).length,
    previousSchemaCount: Object.keys(latestVersion.snapshot).length,
    latestVersion: latestVersion.version
  };
}
function propertySnapshotToYaml(prop) {
  const result = {
    type: prop.type
  };
  if (prop.displayName !== void 0) result.displayName = prop.displayName;
  if (prop.description !== void 0) result.description = prop.description;
  if (prop.nullable !== void 0) result.nullable = prop.nullable;
  if (prop.unique !== void 0) result.unique = prop.unique;
  if (prop.default !== void 0) result.default = prop.default;
  if (prop.length !== void 0) result.length = prop.length;
  if (prop.unsigned !== void 0) result.unsigned = prop.unsigned;
  if (prop.precision !== void 0) result.precision = prop.precision;
  if (prop.scale !== void 0) result.scale = prop.scale;
  if (prop.enum !== void 0) result.enum = [...prop.enum];
  if (prop.relation !== void 0) result.relation = prop.relation;
  if (prop.target !== void 0) result.target = prop.target;
  if (prop.targets !== void 0) result.targets = [...prop.targets];
  if (prop.morphName !== void 0) result.morphName = prop.morphName;
  if (prop.onDelete !== void 0) result.onDelete = prop.onDelete;
  if (prop.onUpdate !== void 0) result.onUpdate = prop.onUpdate;
  if (prop.mappedBy !== void 0) result.mappedBy = prop.mappedBy;
  if (prop.inversedBy !== void 0) result.inversedBy = prop.inversedBy;
  if (prop.joinTable !== void 0) result.joinTable = prop.joinTable;
  if (prop.owning !== void 0) result.owning = prop.owning;
  return result;
}
function snapshotToYaml(snapshot) {
  const result = {};
  if (snapshot.kind === "enum") result.kind = "enum";
  if (snapshot.displayName) result.displayName = snapshot.displayName;
  if (snapshot.singular) result.singular = snapshot.singular;
  if (snapshot.plural) result.plural = snapshot.plural;
  if (snapshot.titleIndex) result.titleIndex = snapshot.titleIndex;
  if (snapshot.group) result.group = snapshot.group;
  if (snapshot.properties && Object.keys(snapshot.properties).length > 0) {
    const properties = {};
    for (const [propName, prop] of Object.entries(snapshot.properties)) {
      properties[propName] = propertySnapshotToYaml(prop);
    }
    result.properties = properties;
  }
  if (snapshot.values && snapshot.values.length > 0) {
    result.values = [...snapshot.values];
  }
  if (snapshot.options) {
    const opts = {};
    if (snapshot.options.id === false) opts.id = false;
    if (snapshot.options.idType && snapshot.options.idType !== "BigInt") opts.idType = snapshot.options.idType;
    if (snapshot.options.timestamps === false) opts.timestamps = false;
    if (snapshot.options.softDelete) opts.softDelete = true;
    if (snapshot.options.tableName) opts.tableName = snapshot.options.tableName;
    if (snapshot.options.translations) opts.translations = true;
    if (snapshot.options.authenticatable) opts.authenticatable = true;
    if (snapshot.options.indexes && snapshot.options.indexes.length > 0) {
      opts.indexes = snapshot.options.indexes.map((idx) => ({
        columns: [...idx.columns],
        ...idx.unique !== void 0 && { unique: idx.unique },
        ...idx.name !== void 0 && { name: idx.name },
        ...idx.type !== void 0 && { type: idx.type }
      }));
    }
    if (Object.keys(opts).length > 0) {
      result.options = opts;
    }
  }
  return result;
}
async function discardChanges() {
  if (!schemasDir) {
    throw new Error("Schemas directory not initialized");
  }
  const storeInstance = getStore();
  const latestVersion = await storeInstance.readLatestVersion();
  if (!latestVersion) {
    throw new Error("No version to restore from. Cannot discard changes.");
  }
  const snapshot = latestVersion.snapshot;
  const snapshotSchemaNames = new Set(Object.keys(snapshot));
  const currentFiles = await readdir(schemasDir);
  const yamlFiles = currentFiles.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  const currentSchemaNames = new Set(yamlFiles.map((f) => f.replace(/\.ya?ml$/, "")));
  let restored = 0;
  let deleted = 0;
  for (const [name, schemaSnapshot] of Object.entries(snapshot)) {
    const yamlData = snapshotToYaml(schemaSnapshot);
    const yamlContent = stringify2(yamlData, {
      lineWidth: 120,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN"
    });
    const filePath = join2(schemasDir, `${name}.yaml`);
    await writeFile2(filePath, yamlContent, "utf-8");
    restored++;
  }
  for (const file of yamlFiles) {
    const name = file.replace(/\.ya?ml$/, "");
    if (!snapshotSchemaNames.has(name)) {
      const filePath = join2(schemasDir, file);
      await unlink2(filePath);
      deleted++;
    }
  }
  return { restored, deleted };
}

// src/server/api/versions.ts
var versionsRouter = Router5();
versionsRouter.get("/", async (_req, res) => {
  try {
    const versions = await listVersions();
    const response = {
      success: true,
      data: versions
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "VERSION_LIST_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
versionsRouter.post("/", async (req, res) => {
  try {
    const { description } = req.body;
    const result = await createVersion(description);
    const response = {
      success: true,
      data: result
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "VERSION_CREATE_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
versionsRouter.get("/pending", async (_req, res) => {
  try {
    const pending = await getPendingChanges();
    const response = {
      success: true,
      data: pending
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "PENDING_CHANGES_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
versionsRouter.post("/discard", async (_req, res) => {
  try {
    const result = await discardChanges();
    const response = {
      success: true,
      data: result
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "DISCARD_CHANGES_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
versionsRouter.get("/latest", async (_req, res) => {
  try {
    const version = await getLatestVersion();
    const response = {
      success: true,
      data: version
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "VERSION_READ_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
versionsRouter.get("/:version", async (req, res) => {
  try {
    const versionNum = parseInt(req.params.version ?? "", 10);
    if (isNaN(versionNum)) {
      const response2 = {
        success: false,
        error: {
          code: "INVALID_VERSION",
          message: "Version must be a number"
        }
      };
      res.status(400).json(response2);
      return;
    }
    const version = await getVersion(versionNum);
    if (!version) {
      const response2 = {
        success: false,
        error: {
          code: "VERSION_NOT_FOUND",
          message: `Version ${versionNum} not found`
        }
      };
      res.status(404).json(response2);
      return;
    }
    const response = {
      success: true,
      data: version
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "VERSION_READ_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});
versionsRouter.get("/diff/:from/:to", async (req, res) => {
  try {
    const fromVersion = parseInt(req.params.from ?? "", 10);
    const toVersion = parseInt(req.params.to ?? "", 10);
    if (isNaN(fromVersion) || isNaN(toVersion)) {
      const response2 = {
        success: false,
        error: {
          code: "INVALID_VERSION",
          message: "Version numbers must be integers"
        }
      };
      res.status(400).json(response2);
      return;
    }
    const diff = await diffVersions(fromVersion, toVersion);
    if (!diff) {
      const response2 = {
        success: false,
        error: {
          code: "DIFF_ERROR",
          message: "Could not compute diff. One or both versions may not exist."
        }
      };
      res.status(404).json(response2);
      return;
    }
    const response = {
      success: true,
      data: diff
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "DIFF_ERROR",
        message: error.message
      }
    };
    res.status(500).json(response);
  }
});

// src/server/api/plugins.ts
import { Router as Router6 } from "express";
import { readdir as readdir2, readFile, writeFile as writeFile3 } from "fs/promises";
import { writeFileSync } from "fs";
import { join as join3 } from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { spawn } from "child_process";
var projectCwd = process.cwd();
function restartServer(cwd) {
  console.log("\n\u{1F504} Restarting server...\n");
  try {
    writeFileSync(join3(cwd, ".omnify-restart"), "");
  } catch {
  }
  const args = process.argv.slice(1);
  const nodeExecutable = process.execPath;
  const fullCommand = [nodeExecutable, ...args].map((a) => `"${a}"`).join(" ");
  const child = spawn("sh", ["-c", `sleep 1 && ${fullCommand}`], {
    cwd,
    detached: true,
    stdio: "ignore",
    env: { ...process.env }
  });
  child.unref();
  process.exit(0);
}
var pluginsRouter = Router6();
var KNOWN_PLUGINS = {
  "@famgia/omnify-japan": {
    description: "Japan-specific types (JapaneseAddress, JapanesePhone, JapaneseName, etc.)",
    types: ["JapanesePhone", "JapanesePostalCode", "JapaneseAddress", "JapaneseName", "JapaneseBankAccount"],
    exportName: "japanTypesPlugin",
    isFactory: false
    // Already instantiated
  },
  "@famgia/omnify-laravel": {
    description: "Laravel migration generator",
    types: [],
    exportName: "laravelPlugin",
    importPath: "@famgia/omnify-laravel",
    isFactory: true
    // Needs to be called with ()
  },
  "@famgia/omnify-typescript": {
    description: "TypeScript type definitions generator",
    types: [],
    exportName: "typescriptPlugin",
    importPath: "@famgia/omnify-typescript/plugin",
    isFactory: true
    // Needs to be called with ()
  }
};
var NON_PLUGIN_PACKAGES = ["@famgia/omnify-sql", "@famgia/omnify-atlas"];
async function getPluginConfigSchema(packageName, cwd) {
  try {
    const knownPlugin = KNOWN_PLUGINS[packageName];
    if (!knownPlugin) return void 0;
    const projectRequire = createRequire(pathToFileURL(join3(cwd, "package.json")).href);
    const packagePath = projectRequire.resolve(packageName);
    const pluginModule = await import(pathToFileURL(packagePath).href);
    const pluginFactory = pluginModule[knownPlugin.exportName] || pluginModule.default;
    if (typeof pluginFactory !== "function") return void 0;
    const pluginInstance = pluginFactory();
    return pluginInstance.configSchema;
  } catch (error) {
    console.error(`Failed to load configSchema for ${packageName}:`, error);
    return void 0;
  }
}
async function getPluginConfig(cwd, packageName) {
  const configPath = join3(cwd, "omnify.config.ts");
  const knownPlugin = KNOWN_PLUGINS[packageName];
  if (!knownPlugin) return {};
  try {
    const content = await readFile(configPath, "utf-8");
    const pluginVarName = knownPlugin.exportName;
    const pluginCallRegex = new RegExp(`${pluginVarName}\\s*\\(\\s*\\{([^}]*)\\}\\s*\\)`, "s");
    const match = content.match(pluginCallRegex);
    if (!match) return {};
    const optionsStr = match[1] ?? "";
    const config = {};
    const pairRegex = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|(\d+(?:\.\d+)?)|(\btrue\b|\bfalse\b))/g;
    let pairMatch;
    while ((pairMatch = pairRegex.exec(optionsStr)) !== null) {
      const key = pairMatch[1];
      const stringVal = pairMatch[2] ?? pairMatch[3];
      const numVal = pairMatch[4];
      const boolVal = pairMatch[5];
      if (stringVal !== void 0) {
        config[key] = stringVal;
      } else if (numVal !== void 0) {
        config[key] = parseFloat(numVal);
      } else if (boolVal !== void 0) {
        config[key] = boolVal === "true";
      }
    }
    return config;
  } catch {
    return {};
  }
}
async function savePluginConfig(cwd, packageName, config) {
  const configPath = join3(cwd, "omnify.config.ts");
  const knownPlugin = KNOWN_PLUGINS[packageName];
  if (!knownPlugin) return false;
  try {
    let content = await readFile(configPath, "utf-8");
    const pluginVarName = knownPlugin.exportName;
    const optionsEntries = Object.entries(config).filter(([_, v]) => v !== void 0 && v !== "").map(([k, v]) => {
      if (typeof v === "string") return `${k}: '${v}'`;
      if (typeof v === "boolean") return `${k}: ${v}`;
      if (typeof v === "number") return `${k}: ${v}`;
      return null;
    }).filter(Boolean);
    const optionsStr = optionsEntries.length > 0 ? `{ ${optionsEntries.join(", ")} }` : "";
    const pluginsArrayRegex = /(plugins:\s*\[)([^\]]*?)(\])/s;
    const pluginsMatch = content.match(pluginsArrayRegex);
    if (pluginsMatch) {
      const [fullMatch, prefix, pluginsContent, suffix] = pluginsMatch;
      if (!pluginsContent) {
        return false;
      }
      const pluginCallWithOptionsRegex = new RegExp(`${pluginVarName}\\s*\\([^)]*\\)`, "g");
      const pluginCallNoOptionsRegex = new RegExp(`\\b${pluginVarName}\\b(?!\\s*\\()`, "g");
      let newPluginsContent = pluginsContent;
      const replacement = optionsStr ? `${pluginVarName}(${optionsStr})` : `${pluginVarName}()`;
      if (pluginsContent.match(pluginCallWithOptionsRegex)) {
        newPluginsContent = pluginsContent.replace(pluginCallWithOptionsRegex, replacement);
      } else if (pluginsContent.match(pluginCallNoOptionsRegex)) {
        newPluginsContent = pluginsContent.replace(pluginCallNoOptionsRegex, replacement);
      }
      content = content.replace(fullMatch, `${prefix}${newPluginsContent}${suffix}`);
    }
    await writeFile3(configPath, content, "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to save plugin config:", error);
    return false;
  }
}
async function scanInstalledPlugins(cwd) {
  const plugins = [];
  const nodeModulesPath = join3(cwd, "node_modules", "@famgia");
  try {
    const dirs = await readdir2(nodeModulesPath);
    for (const dir of dirs) {
      if (!dir.startsWith("omnify-") || dir === "omnify-cli" || dir === "omnify-gui" || dir === "omnify-types" || dir === "omnify-core") {
        continue;
      }
      const packageName = `@famgia/${dir}`;
      if (NON_PLUGIN_PACKAGES.includes(packageName)) {
        continue;
      }
      if (!KNOWN_PLUGINS[packageName]) {
        continue;
      }
      const packageJsonPath = join3(nodeModulesPath, dir, "package.json");
      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
        const knownPlugin = KNOWN_PLUGINS[packageName];
        const types = knownPlugin?.types || [];
        plugins.push({
          name: dir.replace("omnify-", ""),
          packageName,
          version: packageJson.version || "0.0.0",
          description: knownPlugin?.description || packageJson.description || "",
          enabled: false,
          // Will be updated by checking config
          types
        });
      } catch {
      }
    }
  } catch {
  }
  return plugins;
}
async function getEnabledPlugins(cwd) {
  const configPath = join3(cwd, "omnify.config.ts");
  try {
    const content = await readFile(configPath, "utf-8");
    const enabled = [];
    const importRegex = /import\s+\{?\s*(\w+)\s*\}?\s+from\s+['"](@famgia\/omnify-\w+)(?:\/\w+)?['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[2]) enabled.push(match[2]);
    }
    return enabled;
  } catch {
    return [];
  }
}
async function updatePluginConfig(cwd, packageName, enable) {
  const configPath = join3(cwd, "omnify.config.ts");
  try {
    let content = await readFile(configPath, "utf-8");
    const knownPlugin = KNOWN_PLUGINS[packageName];
    const pluginVarName = knownPlugin?.exportName ?? packageName.replace("@famgia/omnify-", "").replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Plugin";
    if (enable) {
      const importFrom = knownPlugin?.importPath ?? packageName;
      const importStatement = `import { ${pluginVarName} } from '${importFrom}';
`;
      const packageBase = packageName.replace("@famgia/", "");
      if (!content.includes(packageBase)) {
        const firstImportEnd = content.indexOf("\n", content.indexOf("import"));
        content = content.slice(0, firstImportEnd + 1) + importStatement + content.slice(firstImportEnd + 1);
      }
      const pluginCall = knownPlugin?.isFactory ? `${pluginVarName}()` : pluginVarName;
      if (content.includes("plugins:")) {
        content = content.replace(
          /plugins:\s*\[([^\]]*)\]/,
          (match, plugins) => {
            if (plugins.includes(pluginVarName)) return match;
            const newPlugins = plugins.trim() ? `${plugins.trim()}, ${pluginCall}` : pluginCall;
            return `plugins: [${newPlugins}]`;
          }
        );
      } else {
        content = content.replace(
          /(database:\s*\{[^}]+\},?)/,
          `$1
  plugins: [${pluginCall}],`
        );
      }
    } else {
      content = content.replace(
        new RegExp(`,\\s*${pluginVarName}(?:\\([^)]*\\))?`, "g"),
        ""
      );
      content = content.replace(
        new RegExp(`${pluginVarName}(?:\\([^)]*\\))?\\s*,`, "g"),
        ""
      );
      content = content.replace(
        new RegExp(`${pluginVarName}(?:\\([^)]*\\))?(?=\\s*\\])`, "g"),
        ""
      );
      content = content.replace(/plugins:\s*\[\s*\],?\n?/, "");
      const importFrom = knownPlugin?.importPath ?? packageName;
      const escapedImportFrom = importFrom.replace(/\//g, "\\/");
      content = content.replace(
        new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${escapedImportFrom}['"];?\\n?`),
        ""
      );
    }
    await writeFile3(configPath, content, "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to update config:", error);
    return false;
  }
}
pluginsRouter.get("/", async (req, res) => {
  const appConfig = req.app.locals.config;
  try {
    const plugins = await scanInstalledPlugins(appConfig.cwd);
    const enabledPackages = await getEnabledPlugins(appConfig.cwd);
    for (const plugin of plugins) {
      plugin.enabled = enabledPackages.includes(plugin.packageName);
      const configSchema = await getPluginConfigSchema(plugin.packageName, appConfig.cwd);
      if (configSchema) {
        plugin.configSchema = configSchema;
      }
      if (plugin.enabled) {
        const config = await getPluginConfig(appConfig.cwd, plugin.packageName);
        plugin.config = config;
      }
    }
    const response = {
      success: true,
      data: plugins
    };
    res.json(response);
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "PLUGINS_SCAN_ERROR",
        message: error instanceof Error ? error.message : "Failed to scan plugins"
      }
    };
    res.status(500).json(response);
  }
});
pluginsRouter.post("/:name/toggle", async (req, res) => {
  const appConfig = req.app.locals.config;
  const { name } = req.params;
  const { enabled } = req.body;
  const packageName = `@famgia/omnify-${name}`;
  try {
    const success = await updatePluginConfig(appConfig.cwd, packageName, enabled);
    if (success) {
      const response = {
        success: true,
        data: { enabled, restarting: true }
      };
      res.on("finish", () => {
        setTimeout(() => {
          restartServer(appConfig.cwd);
        }, 1e3);
      });
      res.json(response);
    } else {
      const response = {
        success: false,
        error: {
          code: "CONFIG_UPDATE_ERROR",
          message: "Failed to update omnify.config.ts"
        }
      };
      res.status(500).json(response);
    }
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "TOGGLE_ERROR",
        message: error instanceof Error ? error.message : "Failed to toggle plugin"
      }
    };
    res.status(500).json(response);
  }
});
pluginsRouter.post("/:name/config", async (req, res) => {
  const appConfig = req.app.locals.config;
  const { name } = req.params;
  const { config } = req.body;
  const packageName = `@famgia/omnify-${name}`;
  try {
    const success = await savePluginConfig(appConfig.cwd, packageName, config);
    if (success) {
      const response = {
        success: true,
        data: { saved: true, restarting: true }
      };
      res.on("finish", () => {
        setTimeout(() => {
          restartServer(appConfig.cwd);
        }, 1e3);
      });
      res.json(response);
    } else {
      const response = {
        success: false,
        error: {
          code: "CONFIG_SAVE_ERROR",
          message: "Failed to save plugin configuration"
        }
      };
      res.status(500).json(response);
    }
  } catch (error) {
    const response = {
      success: false,
      error: {
        code: "CONFIG_SAVE_ERROR",
        message: error instanceof Error ? error.message : "Failed to save plugin configuration"
      }
    };
    res.status(500).json(response);
  }
});

// src/server/app.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
function createApp(config) {
  const app = express();
  app.locals.config = config;
  initVersionStore(config.cwd, config.schemasDir);
  app.use(express.json());
  app.use("/api/schemas", schemasRouter);
  app.use("/api/validate", validateRouter);
  app.use("/api/preview", previewRouter);
  app.use("/api/config", configRouter);
  app.use("/api/versions", versionsRouter);
  app.use("/api/plugins", pluginsRouter);
  const clientDist = join4(__dirname, "../client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(join4(clientDist, "index.html"));
  });
  app.use((err, _req, res, _next) => {
    console.error("Server error:", err);
    const response = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err.message
      }
    };
    res.status(500).json(response);
  });
  return app;
}

// src/server/ws/handler.ts
import { WebSocketServer, WebSocket } from "ws";
function createWsHandler(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = /* @__PURE__ */ new Set();
  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("  WebSocket client connected");
    const readyEvent = {
      type: "connection:ready",
      payload: {
        schemasDir: process.env.SCHEMAS_DIR ?? "schemas",
        schemaCount: 0
      }
    };
    ws.send(JSON.stringify(readyEvent));
    ws.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString());
        handleClientEvent(event, ws);
      } catch {
        console.error("Invalid WebSocket message");
      }
    });
    ws.on("close", () => {
      clients.delete(ws);
      console.log("  WebSocket client disconnected");
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });
  function handleClientEvent(_event, _ws) {
  }
  function broadcast(event) {
    const message = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  function close() {
    for (const client of clients) {
      client.close();
    }
    wss.close();
  }
  return { broadcast, close };
}

// src/server/watcher/fileWatcher.ts
import chokidar from "chokidar";
import { basename } from "path";
function createFileWatcher(schemasDir2, wsHandler) {
  const watcher = chokidar.watch(`${schemasDir2}/*.yaml`, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100
    }
  });
  watcher.on("add", (filePath) => {
    console.log(`  Schema added: ${basename(filePath)}`);
    void notifySchemaChange(filePath, "file");
  });
  watcher.on("change", (filePath) => {
    console.log(`  Schema changed: ${basename(filePath)}`);
    void notifySchemaChange(filePath, "file");
  });
  watcher.on("unlink", (filePath) => {
    console.log(`  Schema deleted: ${basename(filePath)}`);
    void notifyReload();
  });
  async function notifySchemaChange(filePath, source) {
    try {
      schemaService.clearCache(schemasDir2);
      const schemas = await schemaService.loadAll(schemasDir2);
      const name = basename(filePath, ".yaml");
      const schema = schemas[name];
      if (schema) {
        const event = {
          type: "schema:changed",
          payload: { name, schema, source }
        };
        wsHandler.broadcast(event);
      }
    } catch (error) {
      console.error("Error notifying schema change:", error);
    }
  }
  async function notifyReload() {
    try {
      schemaService.clearCache(schemasDir2);
      const schemas = await schemaService.loadAll(schemasDir2);
      const event = {
        type: "schemas:reloaded",
        payload: { schemas }
      };
      wsHandler.broadcast(event);
    } catch (error) {
      console.error("Error notifying reload:", error);
    }
  }
  return {
    close: () => watcher.close()
  };
}

// src/server/index.ts
var RESTART_MARKER = join5(process.cwd(), ".omnify-restart");
async function main() {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const host = process.env.HOST ?? DEFAULT_HOST;
  const cwd = process.cwd();
  const isRestart = existsSync(RESTART_MARKER);
  console.log(`  Restart marker: ${RESTART_MARKER}, exists: ${isRestart}`);
  if (isRestart) {
    console.log("  Detected restart - will not open browser");
    try {
      unlinkSync(RESTART_MARKER);
    } catch {
    }
  }
  let schemasDir2;
  let customTypes = [];
  if (process.env.SCHEMAS_DIR) {
    schemasDir2 = process.env.SCHEMAS_DIR;
  } else {
    try {
      const { config } = await loadConfig(cwd);
      schemasDir2 = resolve2(cwd, config.schemasDir);
      customTypes = (config.plugins ?? []).flatMap((p) => p.types ?? []).filter((t) => t && typeof t === "object" && "name" in t).map((t) => t.name);
    } catch (error) {
      console.error("  Failed to load config:", error instanceof Error ? error.message : error);
      schemasDir2 = join5(cwd, "schemas");
    }
  }
  console.log("Starting Omnify GUI...");
  console.log(`  Schemas directory: ${schemasDir2}`);
  const app = createApp({ schemasDir: schemasDir2, cwd, customTypes });
  const server = createServer(app);
  const wsHandler = createWsHandler(server);
  const watcher = createFileWatcher(schemasDir2, wsHandler);
  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    console.log(`  GUI running at: ${url}`);
    console.log("  Press Ctrl+C to stop\n");
    if (process.env.NODE_ENV !== "production" && !isRestart) {
      open(url).catch(() => {
      });
    }
  });
  const shutdown = () => {
    console.log("\nShutting down...");
    watcher.close();
    wsHandler.close();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map