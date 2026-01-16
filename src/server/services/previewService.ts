/**
 * Code preview generation service
 */

import { loadSchemas } from '@famgia/omnify-core';
import { generateMigrations as generateLaravelMigrations } from '@famgia/omnify-laravel';
import { generateMigrations as generateSqlMigrations } from '@famgia/omnify-sql';
import type { PreviewResult, PreviewType } from '../../shared/types.js';

interface EnumSchema {
  kind: 'enum';
  values?: readonly string[];
}

interface ObjectSchema {
  kind: 'object';
  properties?: Record<string, { type: string; nullable?: boolean }>;
}

class PreviewService {
  async generateAll(schemasDir: string, type: PreviewType): Promise<PreviewResult[]> {
    const schemas = await loadSchemas(schemasDir);
    const previews: PreviewResult[] = [];

    switch (type) {
      case 'laravel': {
        const migrations = await generateLaravelMigrations(schemas);
        for (const migration of migrations) {
          previews.push({
            type: 'laravel',
            content: migration.content,
            fileName: migration.fileName,
          });
        }
        break;
      }

      case 'sql': {
        const migrations = generateSqlMigrations(schemas, { dialect: 'mysql' });
        for (const migration of migrations) {
          previews.push({
            type: 'sql',
            content: migration.content,
            fileName: migration.fileName,
          });
        }
        break;
      }

      case 'typescript': {
        // Generate TypeScript interfaces from schemas
        for (const [name, schema] of Object.entries(schemas)) {
          if (schema.kind === 'enum') {
            previews.push({
              type: 'typescript',
              content: this.generateEnumType(name, schema as EnumSchema),
              fileName: `${name}.ts`,
            });
          } else {
            previews.push({
              type: 'typescript',
              content: this.generateInterfaceType(name, schema as ObjectSchema),
              fileName: `${name}.ts`,
            });
          }
        }
        break;
      }
    }

    return previews;
  }

  async generateForSchema(
    schemasDir: string,
    schemaName: string,
    type: PreviewType
  ): Promise<PreviewResult | null> {
    const schemas = await loadSchemas(schemasDir);
    const schema = schemas[schemaName];

    if (!schema) {
      return null;
    }

    switch (type) {
      case 'laravel': {
        const migrations = await generateLaravelMigrations({ [schemaName]: schema });
        const migration = migrations[0];
        return migration
          ? {
              type: 'laravel',
              content: migration.content,
              fileName: migration.fileName,
            }
          : null;
      }

      case 'sql': {
        const migrations = generateSqlMigrations({ [schemaName]: schema }, { dialect: 'mysql' });
        const migration = migrations[0];
        return migration
          ? {
              type: 'sql',
              content: migration.content,
              fileName: migration.fileName,
            }
          : null;
      }

      case 'typescript': {
        if (schema.kind === 'enum') {
          return {
            type: 'typescript',
            content: this.generateEnumType(schemaName, schema as EnumSchema),
            fileName: `${schemaName}.ts`,
          };
        }
        return {
          type: 'typescript',
          content: this.generateInterfaceType(schemaName, schema as ObjectSchema),
          fileName: `${schemaName}.ts`,
        };
      }
    }
  }

  private generateEnumType(name: string, schema: EnumSchema): string {
    const values = schema.values ?? [];
    return `export type ${name} = ${values.map((v) => `'${v}'`).join(' | ') || 'never'};\n`;
  }

  private generateInterfaceType(name: string, schema: ObjectSchema): string {
    const lines: string[] = [`export interface ${name} {`];

    if (schema.properties) {
      for (const [propName, prop] of Object.entries(schema.properties)) {
        const tsType = this.mapToTsType(prop.type);
        const optional = prop.nullable ? '?' : '';
        lines.push(`  ${propName}${optional}: ${tsType};`);
      }
    }

    lines.push('}');
    return lines.join('\n') + '\n';
  }

  private mapToTsType(omnifyType: string): string {
    const typeMap: Record<string, string> = {
      String: 'string',
      Int: 'number',
      BigInt: 'number',
      Float: 'number',
      Decimal: 'number',
      Boolean: 'boolean',
      Text: 'string',
      LongText: 'string',
      Date: 'string',
      Time: 'string',
      Timestamp: 'string',
      Json: 'Record<string, unknown>',
      Email: 'string',
      Password: 'string',
      File: 'string',
      MultiFile: 'string[]',
      Point: '{ lat: number; lng: number }',
      Coordinates: '{ latitude: number; longitude: number }',
    };

    return typeMap[omnifyType] ?? 'unknown';
  }
}

export const previewService = new PreviewService();
