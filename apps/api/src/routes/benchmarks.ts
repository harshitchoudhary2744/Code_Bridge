import { Router } from 'express';
import { BenchmarkRunRequestSchema } from '@transcode-lab/api-contracts';
import { BenchmarkService } from '../services/benchmarkService';

export function createBenchmarksRouter(benchmarkService: BenchmarkService): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const list = benchmarkService.getBenchmarks();
    res.json(list);
  });

  router.post('/runs', async (req, res) => {
    const parseResult = BenchmarkRunRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.format(),
      });
    }

    try {
      const run = await benchmarkService.runBenchmark(parseResult.data);
      res.status(200).json(run);
    } catch (err: any) {
      res.status(500).json({ error: 'BENCHMARK_ERROR', message: err.message });
    }
  });

  router.get('/runs/:id', (req, res) => {
    const run = benchmarkService.getBenchmarkRunById(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Benchmark run ${req.params.id} not found` });
    }
    res.json(run);
  });

  return router;
}

