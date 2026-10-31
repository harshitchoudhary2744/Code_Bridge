import { Router } from 'express';
import { RepairRequestSchema } from '@transcode-lab/api-contracts';
import { RepairService } from '../services/repairService';
import { RepairsRepository } from '../db/repositories/repairs';

export function createRepairRouter(
  repairService: RepairService,
  repairsRepo: RepairsRepository
): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const parseResult = RepairRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.format(),
      });
    }

    try {
      const response = await repairService.runRepair(parseResult.data);
      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: 'REPAIR_ERROR', message: err.message });
    }
  });

  router.get('/:runId/attempts', (req, res) => {
    const attempts = repairsRepo.getAttempts(req.params.runId);
    res.json(attempts);
  });

  return router;
}

