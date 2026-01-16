/**
 * Config API routes
 */

import { Router, type Request, type Response, type IRouter } from 'express';
import type { ApiResponse, GuiConfig } from '../../shared/types.js';
import type { AppConfig } from '../app.js';
import { DEFAULT_PORT, DEFAULT_HOST } from '../../shared/constants.js';

export const configRouter: IRouter = Router();

// GET /api/config - Get current configuration
configRouter.get('/', (req: Request, res: Response) => {
  const appConfig = req.app.locals.config as AppConfig;

  const config: GuiConfig = {
    schemasDir: appConfig.schemasDir,
    port: Number(process.env.PORT) || DEFAULT_PORT,
    host: process.env.HOST ?? DEFAULT_HOST,
    customTypes: appConfig.customTypes ?? [],
    plugins: [], // Plugins are fetched via /api/plugins
  };

  const response: ApiResponse<GuiConfig> = {
    success: true,
    data: config,
  };
  res.json(response);
});
