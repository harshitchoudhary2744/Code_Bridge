import express from 'express';
import cors from 'cors';
import { config } from './config';
import { getDatabase } from './db/connection';
import { runMigrations } from './db/migrations';
import { JobsRepository } from './db/repositories/jobs';
import { RepairsRepository } from './db/repositories/repairs';
import { ModelServiceClient } from './services/modelServiceClient';
import { RunnerClient } from './services/runnerClient';
import { OrchestratorService } from './services/orchestrator';
import { RepairService } from './services/repairService';
import { BenchmarkService } from './services/benchmarkService';
import { ExportService } from './services/exportService';

import { createHealthRouter } from './routes/health';
import { createModelsRouter } from './routes/models';
import { createComparisonsRouter } from './routes/comparisons';
import { createRepairRouter } from './routes/repair';
import { createHistoryRouter } from './routes/history';
import { createBenchmarksRouter } from './routes/benchmarks';
import { createReportsRouter } from './routes/reports';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '2mb' }));

  // Initialize DB and Migrations
  const db = getDatabase();
  runMigrations(db);

  // Initialize Repositories and Services
  const jobsRepo = new JobsRepository(db);
  const repairsRepo = new RepairsRepository(db);
  const modelClient = new ModelServiceClient(config.modelServiceUrl);
  const runnerClient = new RunnerClient(config.executionRunnerUrl);
  const orchestrator = new OrchestratorService(jobsRepo, modelClient, runnerClient);
  const repairService = new RepairService(jobsRepo, repairsRepo, modelClient, runnerClient);
  const benchmarkService = new BenchmarkService(db, modelClient, runnerClient);
  const exportService = new ExportService();

  // Register Routes
  const healthRouter = createHealthRouter(modelClient, runnerClient);
  app.use('/', healthRouter);
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/models', createModelsRouter(modelClient));
  app.use('/api/v1/comparisons', createComparisonsRouter(orchestrator, jobsRepo));
  app.use('/api/v1/repair', createRepairRouter(repairService, repairsRepo));
  app.use('/api/v1/history', createHistoryRouter(jobsRepo));
  app.use('/api/v1/benchmarks', createBenchmarksRouter(benchmarkService));
  app.use('/api/v1/reports', createReportsRouter(jobsRepo, exportService));

  return app;
}

