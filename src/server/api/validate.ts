/**
 * Schema validation API routes
 */

import { Router, type Request, type Response, type IRouter } from 'express';
import { validationService } from '../services/validationService.js';
import type { ApiResponse, GuiSchema, ValidationError } from '../../shared/types.js';
import type { AppConfig } from '../app.js';

export const validateRouter: IRouter = Router();

interface ValidateRequest {
  schema?: GuiSchema;
  schemas?: Record<string, GuiSchema>;
}

interface ValidateResult {
  valid: boolean;
  errors: ValidationError[];
}

// POST /api/validate - Validate schema(s)
validateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const body = req.body as ValidateRequest;

    let result: ValidateResult;

    if (body.schema) {
      // Validate single schema
      result = await validationService.validateSchema(body.schema, config.schemasDir);
    } else if (body.schemas) {
      // Validate all schemas
      result = await validationService.validateAll(body.schemas);
    } else {
      // Load and validate all from disk
      result = await validationService.validateFromDisk(config.schemasDir);
    }

    const response: ApiResponse<ValidateResult> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});
