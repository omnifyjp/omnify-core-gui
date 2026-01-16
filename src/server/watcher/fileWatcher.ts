/**
 * File system watcher for schema changes
 */

import chokidar from 'chokidar';
import { basename } from 'path';
import { schemaService } from '../services/schemaService.js';
import type { WsHandler } from '../ws/handler.js';
import type { ServerEvent } from '../../shared/events.js';

export interface FileWatcher {
  close: () => void;
}

export function createFileWatcher(schemasDir: string, wsHandler: WsHandler): FileWatcher {
  const watcher = chokidar.watch(`${schemasDir}/*.yaml`, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  watcher.on('add', (filePath: string) => {
    console.log(`  Schema added: ${basename(filePath)}`);
    void notifySchemaChange(filePath, 'file');
  });

  watcher.on('change', (filePath: string) => {
    console.log(`  Schema changed: ${basename(filePath)}`);
    void notifySchemaChange(filePath, 'file');
  });

  watcher.on('unlink', (filePath: string) => {
    console.log(`  Schema deleted: ${basename(filePath)}`);
    void notifyReload();
  });

  async function notifySchemaChange(
    filePath: string,
    source: 'file' | 'editor'
  ): Promise<void> {
    try {
      // Clear cache and reload
      schemaService.clearCache(schemasDir);
      const schemas = await schemaService.loadAll(schemasDir);

      // Find the changed schema
      const name = basename(filePath, '.yaml');
      const schema = schemas[name];

      if (schema) {
        const event: ServerEvent = {
          type: 'schema:changed',
          payload: { name, schema, source },
        };
        wsHandler.broadcast(event);
      }
    } catch (error) {
      console.error('Error notifying schema change:', error);
    }
  }

  async function notifyReload(): Promise<void> {
    try {
      schemaService.clearCache(schemasDir);
      const schemas = await schemaService.loadAll(schemasDir);

      const event: ServerEvent = {
        type: 'schemas:reloaded',
        payload: { schemas },
      };
      wsHandler.broadcast(event);
    } catch (error) {
      console.error('Error notifying reload:', error);
    }
  }

  return {
    close: () => watcher.close(),
  };
}
