import { Router } from 'express';
import { JobsRepository } from '../db/repositories/jobs';
import { ExportService } from '../services/exportService';

export function createReportsRouter(jobsRepo: JobsRepository, exportService: ExportService): Router {
  const router = Router();

  router.get('/:id', (req, res) => {
    const job = jobsRepo.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Job ${req.params.id} not found` });
    }

    const format = (req.query.format as string || 'json').toLowerCase();

    if (format === 'csv') {
      const csv = exportService.exportCsv(job);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="comparison_${job.id}.csv"`);
      return res.send(csv);
    }

    const json = exportService.exportJson(job);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="comparison_${job.id}.json"`);
    return res.send(json);
  });

  return router;
}

