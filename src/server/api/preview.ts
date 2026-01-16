/**
 * Code preview API routes
 */

import { Router, type Request, type Response, type IRouter } from 'express';
import { previewService } from '../services/previewService.js';
import type { ApiResponse, PreviewResult, PreviewType } from '../../shared/types.js';
import type { AppConfig } from '../app.js';

export const previewRouter: IRouter = Router();

// GET /api/preview/:type - Get code preview for all schemas
previewRouter.get('/:type', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const { type } = req.params;

    if (!['laravel', 'typescript', 'sql'].includes(type!)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid preview type: ${type}. Valid types: laravel, typescript, sql`,
        },
      };
      res.status(400).json(response);
      return;
    }

    const previews = await previewService.generateAll(config.schemasDir, type as PreviewType);
    const response: ApiResponse<PreviewResult[]> = {
      success: true,
      data: previews,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PREVIEW_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

// GET /api/preview/:type/:name - Get code preview for single schema
previewRouter.get('/:type/:name', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const { type, name } = req.params;

    if (!['laravel', 'typescript', 'sql'].includes(type!)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid preview type: ${type}. Valid types: laravel, typescript, sql`,
        },
      };
      res.status(400).json(response);
      return;
    }

    const preview = await previewService.generateForSchema(
      config.schemasDir,
      name!,
      type as PreviewType
    );

    if (!preview) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Schema "${name}" not found`,
        },
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<PreviewResult> = {
      success: true,
      data: preview,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PREVIEW_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});
