/**
 * @famgia/omnify-gui - Server Entry Point
 *
 * Starts the local development server for Omnify GUI.
 */

import { createServer } from 'http';
import { join, resolve } from 'path';
import { existsSync, unlinkSync } from 'fs';
import open from 'open';
import { loadConfig } from '@famgia/omnify-cli';
import { createApp } from './app.js';
import { createWsHandler } from './ws/handler.js';
import { createFileWatcher } from './watcher/fileWatcher.js';
import { DEFAULT_PORT, DEFAULT_HOST } from '../shared/constants.js';

// fileURLToPath and dirname imported for potential future use with static files
// Currently not needed as Vite handles static serving

// Restart marker file path
const RESTART_MARKER = join(process.cwd(), '.omnify-restart');

async function main(): Promise<void> {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const host = process.env.HOST ?? DEFAULT_HOST;
  const cwd = process.cwd();

  // Check if this is a restart (marker file exists)
  const isRestart = existsSync(RESTART_MARKER);
  console.log(`  Restart marker: ${RESTART_MARKER}, exists: ${isRestart}`);
  if (isRestart) {
    console.log('  Detected restart - will not open browser');
    try {
      unlinkSync(RESTART_MARKER);
    } catch {
      // Ignore
    }
  }

  // Resolve schemas directory and custom types from omnify config
  let schemasDir: string;
  let customTypes: string[] = [];

  if (process.env.SCHEMAS_DIR) {
    schemasDir = process.env.SCHEMAS_DIR;
  } else {
    try {
      const { config } = await loadConfig(cwd);
      schemasDir = resolve(cwd, config.schemasDir);
      // Extract custom type names from plugins
      customTypes = (config.plugins ?? [])
        .flatMap((p) => p.types ?? [])
        .filter((t) => t && typeof t === 'object' && 'name' in t)
        .map((t) => t.name);
    } catch (error) {
      // Fall back to default if no config file found
      console.error('  Failed to load config:', error instanceof Error ? error.message : error);
      schemasDir = join(cwd, 'schemas');
    }
  }

  console.log('Starting Omnify GUI...');
  console.log(`  Schemas directory: ${schemasDir}`);

  // Create Express app
  const app = createApp({ schemasDir, cwd, customTypes });

  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket handler
  const wsHandler = createWsHandler(server);

  // Create file watcher
  const watcher = createFileWatcher(schemasDir, wsHandler);

  // Start server
  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    console.log(`  GUI running at: ${url}`);
    console.log('  Press Ctrl+C to stop\n');

    // Auto-open browser in development (skip if restarting)
    if (process.env.NODE_ENV !== 'production' && !isRestart) {
      open(url).catch(() => {
        // Ignore errors if browser fails to open
      });
    }
  });

  // Graceful shutdown
  const shutdown = (): void => {
    console.log('\nShutting down...');
    watcher.close();
    wsHandler.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
