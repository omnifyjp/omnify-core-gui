/**
 * Version history service for GUI
 */

import { loadSchemas } from '@famgia/omnify-core';
import { writeFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { stringify } from 'yaml';
import {
  createVersionStore,
  type VersionStore,
  type VersionSummary,
  type VersionFile,
  type VersionDiff,
  type VersionChange,
  type VersionSchemaSnapshot,
  type VersionPropertySnapshot,
} from '@famgia/omnify-core';

let store: VersionStore | null = null;
let schemasDir: string | null = null;

/**
 * Initialize the version store with the project base directory.
 */
export function initVersionStore(baseDir: string, schemasDirPath: string): void {
  store = createVersionStore({ baseDir, maxVersions: 100 });
  schemasDir = schemasDirPath;
}

/**
 * Get the version store instance.
 */
function getStore(): VersionStore {
  if (!store) {
    throw new Error('Version store not initialized. Call initVersionStore first.');
  }
  return store;
}

/**
 * List all versions.
 */
export async function listVersions(): Promise<VersionSummary[]> {
  return getStore().listVersions();
}

/**
 * Get a specific version.
 */
export async function getVersion(version: number): Promise<VersionFile | null> {
  return getStore().readVersion(version);
}

/**
 * Get the latest version.
 */
export async function getLatestVersion(): Promise<VersionFile | null> {
  return getStore().readLatestVersion();
}

/**
 * Get diff between two versions.
 */
export async function diffVersions(fromVersion: number, toVersion: number): Promise<VersionDiff | null> {
  return getStore().diffVersions(fromVersion, toVersion);
}

/**
 * Get the version store for direct access.
 */
export function getVersionStore(): VersionStore {
  return getStore();
}

/**
 * Convert property to version snapshot format.
 */
function propertyToSnapshot(prop: Record<string, unknown>): VersionPropertySnapshot {
  return {
    type: prop.type as string,
    ...(prop.displayName !== undefined && { displayName: prop.displayName as string }),
    ...(prop.description !== undefined && { description: prop.description as string }),
    ...(prop.nullable !== undefined && { nullable: prop.nullable as boolean }),
    ...(prop.unique !== undefined && { unique: prop.unique as boolean }),
    ...(prop.default !== undefined && { default: prop.default }),
    ...(prop.length !== undefined && { length: prop.length as number }),
    ...(prop.unsigned !== undefined && { unsigned: prop.unsigned as boolean }),
    ...(prop.precision !== undefined && { precision: prop.precision as number }),
    ...(prop.scale !== undefined && { scale: prop.scale as number }),
    ...(prop.enum !== undefined && { enum: prop.enum as readonly string[] }),
    ...(prop.relation !== undefined && { relation: prop.relation as string }),
    ...(prop.target !== undefined && { target: prop.target as string }),
    ...(prop.targets !== undefined && { targets: prop.targets as readonly string[] }),
    ...(prop.morphName !== undefined && { morphName: prop.morphName as string }),
    ...(prop.onDelete !== undefined && { onDelete: prop.onDelete as string }),
    ...(prop.onUpdate !== undefined && { onUpdate: prop.onUpdate as string }),
    ...(prop.mappedBy !== undefined && { mappedBy: prop.mappedBy as string }),
    ...(prop.inversedBy !== undefined && { inversedBy: prop.inversedBy as string }),
    ...(prop.joinTable !== undefined && { joinTable: prop.joinTable as string }),
    ...(prop.owning !== undefined && { owning: prop.owning as boolean }),
  };
}

/**
 * Convert loaded schemas to version snapshot format.
 */
function schemasToSnapshot(
  schemas: Readonly<Record<string, { name: string; kind?: string; properties?: unknown; options?: unknown; values?: readonly string[] }>>
): Record<string, VersionSchemaSnapshot> {
  const snapshot: Record<string, VersionSchemaSnapshot> = {};

  for (const [name, schema] of Object.entries(schemas)) {
    const properties: Record<string, VersionPropertySnapshot> = {};
    if (schema.properties) {
      for (const [propName, prop] of Object.entries(schema.properties)) {
        properties[propName] = propertyToSnapshot(prop as Record<string, unknown>);
      }
    }

    const opts = schema.options as Record<string, unknown> | undefined;

    // Convert indexes to snapshot format
    const rawIndexes = opts?.indexes as Array<{ columns: string[]; unique?: boolean; name?: string; type?: string }> | undefined;
    const indexSnapshots = rawIndexes?.map((idx) => ({
      columns: idx.columns,
      ...(idx.unique !== undefined && { unique: idx.unique }),
      ...(idx.name !== undefined && { name: idx.name }),
      ...(idx.type !== undefined && { type: idx.type }),
    }));

    // Convert unique constraints to indexes with unique=true for tracking
    const rawUnique = opts?.unique as string[][] | undefined;
    const uniqueAsIndexes = rawUnique?.map((cols, i) => ({
      columns: cols,
      unique: true,
      name: `unique_${i}`,
    }));

    // Merge indexes and unique constraints
    const allIndexes = [...(indexSnapshots ?? []), ...(uniqueAsIndexes ?? [])];

    // Build options - ONLY store non-default values to ensure consistent comparison
    const snapshotOptions: Record<string, unknown> = {};
    if (opts?.id === false) snapshotOptions.id = false; // default is true
    if (opts?.idType && opts.idType !== 'BigInt') snapshotOptions.idType = opts.idType; // default is BigInt
    if (opts?.timestamps === false) snapshotOptions.timestamps = false; // default is true
    if (opts?.softDelete === true) snapshotOptions.softDelete = true; // default is false
    if (opts?.tableName) snapshotOptions.tableName = opts.tableName;
    if (opts?.translations === true) snapshotOptions.translations = true; // default is false
    if (opts?.authenticatable === true) snapshotOptions.authenticatable = true; // default is false
    if (allIndexes.length > 0) snapshotOptions.indexes = allIndexes;

    snapshot[name] = {
      name: schema.name,
      kind: (schema.kind ?? 'object') as 'object' | 'enum' | 'partial' | 'pivot',
      ...(Object.keys(properties).length > 0 && { properties }),
      ...(schema.values && { values: schema.values }),
      ...(Object.keys(snapshotOptions).length > 0 && { options: snapshotOptions }),
    };
  }

  return snapshot;
}

/**
 * Result of computing pending changes.
 */
export interface PendingChangesResult {
  hasChanges: boolean;
  changes: readonly VersionChange[];
  currentSchemaCount: number;
  previousSchemaCount: number;
  latestVersion: number | null;
}

/**
 * Result of creating a new version.
 */
export interface CreateVersionResult {
  version: number;
  migration: string;
  changes: readonly VersionChange[];
}

/**
 * Create a new version from the current schemas.
 */
export async function createVersion(description?: string): Promise<CreateVersionResult> {
  if (!schemasDir) {
    throw new Error('Schemas directory not initialized');
  }

  const storeInstance = getStore();

  // Load current schemas
  const currentSchemas = await loadSchemas(schemasDir);
  const currentSnapshot = schemasToSnapshot(currentSchemas);

  // Get latest version to compute changes
  const latestVersion = await storeInstance.readLatestVersion();

  // Compute changes
  let changes: VersionChange[];
  if (!latestVersion) {
    // Initial version - all schemas are new
    changes = Object.keys(currentSnapshot).map((name) => ({
      action: 'schema_added' as const,
      schema: name,
    }));
  } else {
    changes = storeInstance.computeSnapshotDiff(latestVersion.snapshot, currentSnapshot);
  }

  if (changes.length === 0) {
    throw new Error('No changes to create version');
  }

  // Generate migration name based on timestamp
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const migration = `${timestamp}_omnify_migration`;

  // Create the version
  const versionFile = await storeInstance.createVersion(currentSnapshot, changes, {
    driver: 'mysql', // TODO: Get from config
    migration,
    description,
  });

  return {
    version: versionFile.version,
    migration: versionFile.migration ?? migration,
    changes: versionFile.changes,
  };
}

/**
 * Get pending changes (current schemas vs latest version).
 */
export async function getPendingChanges(): Promise<PendingChangesResult> {
  if (!schemasDir) {
    throw new Error('Schemas directory not initialized');
  }

  const storeInstance = getStore();

  // Load current schemas
  const currentSchemas = await loadSchemas(schemasDir);
  const currentSnapshot = schemasToSnapshot(currentSchemas);

  // Get latest version
  const latestVersion = await storeInstance.readLatestVersion();

  if (!latestVersion) {
    // No previous version, all schemas are new
    const changes: VersionChange[] = Object.keys(currentSnapshot).map((name) => ({
      action: 'schema_added' as const,
      schema: name,
    }));

    return {
      hasChanges: changes.length > 0,
      changes,
      currentSchemaCount: Object.keys(currentSnapshot).length,
      previousSchemaCount: 0,
      latestVersion: null,
    };
  }

  // Compute diff from latest version to current
  const changes = storeInstance.computeSnapshotDiff(latestVersion.snapshot, currentSnapshot);

  return {
    hasChanges: changes.length > 0,
    changes,
    currentSchemaCount: Object.keys(currentSnapshot).length,
    previousSchemaCount: Object.keys(latestVersion.snapshot).length,
    latestVersion: latestVersion.version,
  };
}

/**
 * Result of discarding changes.
 */
export interface DiscardChangesResult {
  restored: number;
  deleted: number;
}

/**
 * Convert a property snapshot back to YAML-compatible format.
 * Only includes non-undefined values to match original YAML structure.
 */
function propertySnapshotToYaml(prop: VersionPropertySnapshot): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: prop.type,
  };

  // Only add fields that have values (matching original YAML structure)
  if (prop.displayName !== undefined) result.displayName = prop.displayName;
  if (prop.description !== undefined) result.description = prop.description;
  if (prop.nullable !== undefined) result.nullable = prop.nullable;
  if (prop.unique !== undefined) result.unique = prop.unique;
  if (prop.default !== undefined) result.default = prop.default;
  if (prop.length !== undefined) result.length = prop.length;
  if (prop.unsigned !== undefined) result.unsigned = prop.unsigned;
  if (prop.precision !== undefined) result.precision = prop.precision;
  if (prop.scale !== undefined) result.scale = prop.scale;
  if (prop.enum !== undefined) result.enum = [...prop.enum]; // Convert readonly to mutable
  if (prop.relation !== undefined) result.relation = prop.relation;
  if (prop.target !== undefined) result.target = prop.target;
  if (prop.targets !== undefined) result.targets = [...prop.targets]; // Convert readonly to mutable
  if (prop.morphName !== undefined) result.morphName = prop.morphName;
  if (prop.onDelete !== undefined) result.onDelete = prop.onDelete;
  if (prop.onUpdate !== undefined) result.onUpdate = prop.onUpdate;
  if (prop.mappedBy !== undefined) result.mappedBy = prop.mappedBy;
  if (prop.inversedBy !== undefined) result.inversedBy = prop.inversedBy;
  if (prop.joinTable !== undefined) result.joinTable = prop.joinTable;
  if (prop.owning !== undefined) result.owning = prop.owning;

  return result;
}

/**
 * Convert a version snapshot back to YAML-compatible schema object.
 */
function snapshotToYaml(snapshot: VersionSchemaSnapshot): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Only add kind if enum (object is default)
  if (snapshot.kind === 'enum') result.kind = 'enum';
  if (snapshot.displayName) result.displayName = snapshot.displayName;
  if (snapshot.singular) result.singular = snapshot.singular;
  if (snapshot.plural) result.plural = snapshot.plural;
  if (snapshot.titleIndex) result.titleIndex = snapshot.titleIndex;
  if (snapshot.group) result.group = snapshot.group;

  // Properties - convert each property to YAML format
  if (snapshot.properties && Object.keys(snapshot.properties).length > 0) {
    const properties: Record<string, Record<string, unknown>> = {};
    for (const [propName, prop] of Object.entries(snapshot.properties)) {
      properties[propName] = propertySnapshotToYaml(prop);
    }
    result.properties = properties;
  }

  // Enum values - convert readonly to mutable array
  if (snapshot.values && snapshot.values.length > 0) {
    result.values = [...snapshot.values];
  }

  // Options - only include non-default values
  if (snapshot.options) {
    const opts: Record<string, unknown> = {};
    if (snapshot.options.id === false) opts.id = false;
    if (snapshot.options.idType && snapshot.options.idType !== 'BigInt') opts.idType = snapshot.options.idType;
    if (snapshot.options.timestamps === false) opts.timestamps = false;
    if (snapshot.options.softDelete) opts.softDelete = true;
    if (snapshot.options.tableName) opts.tableName = snapshot.options.tableName;
    if (snapshot.options.translations) opts.translations = true;
    if (snapshot.options.authenticatable) opts.authenticatable = true;
    if (snapshot.options.indexes && snapshot.options.indexes.length > 0) {
      // Convert readonly index arrays to mutable
      opts.indexes = snapshot.options.indexes.map((idx) => ({
        columns: [...idx.columns],
        ...(idx.unique !== undefined && { unique: idx.unique }),
        ...(idx.name !== undefined && { name: idx.name }),
        ...(idx.type !== undefined && { type: idx.type }),
      }));
    }
    if (Object.keys(opts).length > 0) {
      result.options = opts;
    }
  }

  return result;
}

/**
 * Discard all pending changes by restoring schemas from the latest version.
 */
export async function discardChanges(): Promise<DiscardChangesResult> {
  if (!schemasDir) {
    throw new Error('Schemas directory not initialized');
  }

  const storeInstance = getStore();
  const latestVersion = await storeInstance.readLatestVersion();

  if (!latestVersion) {
    throw new Error('No version to restore from. Cannot discard changes.');
  }

  const snapshot = latestVersion.snapshot;
  const snapshotSchemaNames = new Set(Object.keys(snapshot));

  // Get current schema files
  const currentFiles = await readdir(schemasDir);
  const yamlFiles = currentFiles.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  const currentSchemaNames = new Set(yamlFiles.map((f) => f.replace(/\.ya?ml$/, '')));

  let restored = 0;
  let deleted = 0;

  // Restore schemas from snapshot
  for (const [name, schemaSnapshot] of Object.entries(snapshot)) {
    const yamlData = snapshotToYaml(schemaSnapshot);
    const yamlContent = stringify(yamlData, {
      lineWidth: 120,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'PLAIN',
    });

    const filePath = join(schemasDir, `${name}.yaml`);
    await writeFile(filePath, yamlContent, 'utf-8');
    restored++;
  }

  // Delete schemas that aren't in the snapshot
  for (const file of yamlFiles) {
    const name = file.replace(/\.ya?ml$/, '');
    if (!snapshotSchemaNames.has(name)) {
      const filePath = join(schemasDir, file);
      await unlink(filePath);
      deleted++;
    }
  }

  return { restored, deleted };
}
