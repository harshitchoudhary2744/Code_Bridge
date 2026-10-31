import { Router } from 'express';
import { ComparisonJobRequestSchema } from '@transcode-lab/api-contracts';
import { OrchestratorService } from '../services/orchestrator';
import { JobsRepository } from '../db/repositories/jobs';

export function createComparisonsRouter(
  orchestrator: OrchestratorService,
  jobsRepo: JobsRepository
): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const parseResult = ComparisonJobRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.format(),
      });
    }

    try {
      const job = await orchestrator.submitComparisonJob(parseResult.data);
      res.status(202).json(job);
    } catch (err: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit as string || '20', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const jobs = jobsRepo.listJobs(limit, offset);
    res.json(jobs);
  });

  router.get('/:id', (req, res) => {
    const job = jobsRepo.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Job ${req.params.id} not found` });
    }
    res.json(job);
  });

  router.get('/:id/models/:modelId', (req, res) => {
    const job = jobsRepo.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Job ${req.params.id} not found` });
    }

    const run = job.modelRuns.find((r) => r.modelId === req.params.modelId);
    if (!run) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Model '${req.params.modelId}' not part of job ${req.params.id}`,
      });
    }
    res.json(run);
  });

  return router;
}

