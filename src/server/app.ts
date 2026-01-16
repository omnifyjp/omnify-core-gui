/**
 * Express application configuration
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { schemasRouter } from './api/schemas.js';
import { validateRouter } from './api/validate.js';
import { previewRouter } from './api/preview.js';
import { configRouter } from './api/config.js';
import { versionsRouter } from './api/versions.js';
import { pluginsRouter } from './api/plugins.js';
import { initVersionStore } from './services/versionService.js';
import type { ApiResponse } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface AppConfig {
  schemasDir: string;
  cwd: string;
  customTypes?: string[];
}

export function createApp(config: AppConfig): Express {
  const app = express();

  // Store config in app locals for access in routes
  app.locals.config = config;

  // Initialize version store with project root and schemas directory
  initVersionStore(config.cwd, config.schemasDir);

  // Middleware
  app.use(express.json());

  // API routes
  app.use('/api/schemas', schemasRouter);
  app.use('/api/validate', validateRouter);
  app.use('/api/preview', previewRouter);
  app.use('/api/config', configRouter);
  app.use('/api/versions', versionsRouter);
  app.use('/api/plugins', pluginsRouter);

  // Serve static files (client build)
  const clientDist = join(__dirname, '../client');
  app.use(express.static(clientDist));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(join(clientDist, 'index.html'));
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    };
    res.status(500).json(response);
  });

  return app;
}
