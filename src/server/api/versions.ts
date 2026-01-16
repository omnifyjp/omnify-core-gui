/**
 * Version history API routes
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import type { ApiResponse } from '../../shared/types.js';
import {
  listVersions,
  getVersion,
  getLatestVersion,
  diffVersions,
  getPendingChanges,
  createVersion,
  discardChanges,
  type PendingChangesResult,
  type CreateVersionResult,
  type DiscardChangesResult,
} from '../services/versionService.js';
import type { VersionSummary, VersionFile, VersionDiff } from '@famgia/omnify-core';

export const versionsRouter: RouterType = Router();

/**
 * GET /api/versions - List all versions
 */
versionsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const versions = await listVersions();
    const response: ApiResponse<VersionSummary[]> = {
      success: true,
      data: versions,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VERSION_LIST_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/versions - Create a new version
 */
versionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { description } = req.body as { description?: string };
    const result = await createVersion(description);
    const response: ApiResponse<CreateVersionResult> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VERSION_CREATE_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/versions/pending - Get pending changes (current vs latest)
 */
versionsRouter.get('/pending', async (_req: Request, res: Response) => {
  try {
    const pending = await getPendingChanges();
    const response: ApiResponse<PendingChangesResult> = {
      success: true,
      data: pending,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PENDING_CHANGES_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/versions/discard - Discard pending changes and restore from latest version
 */
versionsRouter.post('/discard', async (_req: Request, res: Response) => {
  try {
    const result = await discardChanges();
    const response: ApiResponse<DiscardChangesResult> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DISCARD_CHANGES_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/versions/latest - Get latest version
 */
versionsRouter.get('/latest', async (_req: Request, res: Response) => {
  try {
    const version = await getLatestVersion();
    const response: ApiResponse<VersionFile | null> = {
      success: true,
      data: version,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VERSION_READ_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/versions/:version - Get specific version
 */
versionsRouter.get('/:version', async (req: Request, res: Response) => {
  try {
    const versionNum = parseInt(req.params.version ?? '', 10);
    if (isNaN(versionNum)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_VERSION',
          message: 'Version must be a number',
        },
      };
      res.status(400).json(response);
      return;
    }

    const version = await getVersion(versionNum);
    if (!version) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version ${versionNum} not found`,
        },
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<VersionFile> = {
      success: true,
      data: version,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VERSION_READ_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/versions/diff/:from/:to - Get diff between versions
 */
versionsRouter.get('/diff/:from/:to', async (req: Request, res: Response) => {
  try {
    const fromVersion = parseInt(req.params.from ?? '', 10);
    const toVersion = parseInt(req.params.to ?? '', 10);

    if (isNaN(fromVersion) || isNaN(toVersion)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_VERSION',
          message: 'Version numbers must be integers',
        },
      };
      res.status(400).json(response);
      return;
    }

    const diff = await diffVersions(fromVersion, toVersion);
    if (!diff) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'DIFF_ERROR',
          message: 'Could not compute diff. One or both versions may not exist.',
        },
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<VersionDiff> = {
      success: true,
      data: diff,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DIFF_ERROR',
        message: (error as Error).message,
      },
    };
    res.status(500).json(response);
  }
});
