import { Router } from 'express';
import { ModelServiceClient } from '../services/modelServiceClient';
import { RunnerClient } from '../services/runnerClient';
import { getDatabase } from '../db/connection';

export function createHealthRouter(modelClient: ModelServiceClient, runnerClient: RunnerClient): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'transcode-api',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/ready', async (_req, res) => {
    const checks: Record<string, any> = {
      database: 'ready',
      modelService: 'unknown',
      executionRunner: 'unknown',
    };

    try {
      getDatabase().prepare('SELECT 1').get();
      checks.database = 'ready';
    } catch (e: any) {
      checks.database = `error: ${e.message}`;
    }

    try {
      const mh = await modelClient.health();
      checks.modelService = mh.status === 'ok' ? 'ready' : mh.status;
    } catch (e: any) {
      checks.modelService = `offline (${e.message})`;
    }

    try {
      const rh = await runnerClient.health();
      checks.executionRunner = rh.status === 'ok' ? 'ready' : rh.status;
    } catch (e: any) {
      checks.executionRunner = `offline (${e.message})`;
    }

    const isAllReady = checks.database === 'ready' && checks.modelService === 'ready' && checks.executionRunner === 'ready';
    res.status(isAllReady ? 200 : 200).json({
      status: isAllReady ? 'ready' : 'degraded',
      checks,
    });
  });

  return router;
}

