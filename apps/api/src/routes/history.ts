import { Router } from 'express';
import { JobsRepository } from '../db/repositories/jobs';

export function createHistoryRouter(jobsRepo: JobsRepository): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const jobs = jobsRepo.listJobs(limit, offset);
    res.json({
      total: jobs.length,
      limit,
      offset,
      jobs,
    });
  });

  return router;
}

