/**
 * Schema CRUD API routes
 */

import { Router, type Request, type Response, type IRouter } from 'express';
import { schemaService } from '../services/schemaService.js';
import type { ApiResponse, GuiSchema } from '../../shared/types.js';
import type { AppConfig } from '../app.js';

export const schemasRouter: IRouter = Router();

// GET /api/schemas - List all schemas
schemasRouter.get('/', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const schemas = await schemaService.loadAll(config.schemasDir);
    const response: ApiResponse<Record<string, GuiSchema>> = {
      success: true,
      data: schemas,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'LOAD_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

// GET /api/schemas/:name - Get single schema
schemasRouter.get('/:name', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const { name } = req.params;
    const schema = await schemaService.load(config.schemasDir, name!);

    if (!schema) {
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

    const response: ApiResponse<GuiSchema> = {
      success: true,
      data: schema,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'LOAD_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

// POST /api/schemas - Create new schema
schemasRouter.post('/', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const schema = req.body as GuiSchema;

    if (!schema.name) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Schema name is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    const saved = await schemaService.save(config.schemasDir, schema);
    const response: ApiResponse<GuiSchema> = {
      success: true,
      data: saved,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'SAVE_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

// PUT /api/schemas/:name - Update schema
schemasRouter.put('/:name', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const { name } = req.params;
    const schema = req.body as GuiSchema;

    // Ensure name matches
    schema.name = name!;

    const saved = await schemaService.save(config.schemasDir, schema);
    const response: ApiResponse<GuiSchema> = {
      success: true,
      data: saved,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'SAVE_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

// DELETE /api/schemas/:name - Delete schema
schemasRouter.delete('/:name', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const { name } = req.params;

    await schemaService.delete(config.schemasDir, name!);
    const response: ApiResponse = {
      success: true,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});
