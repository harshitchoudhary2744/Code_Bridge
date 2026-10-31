import {
  ComparisonJobRequest,
  ComparisonJobResponse,
  ModelMetadata,
  ValidationStatus
} from '@transcode-lab/api-contracts';
import { JobsRepository } from '../db/repositories/jobs';
import { ModelServiceClient } from './modelServiceClient';
import { RunnerClient } from './runnerClient';

export class OrchestratorService {
  constructor(
    private jobsRepo: JobsRepository,
    private modelClient: ModelServiceClient,
    private runnerClient: RunnerClient
  ) {}

  async submitComparisonJob(req: ComparisonJobRequest): Promise<ComparisonJobResponse> {
    // 1. Fetch current registry snapshots
    const snapshots: Record<string, ModelMetadata> = {};
    try {
      const models = await this.modelClient.listModels();
      for (const m of models) {
        snapshots[m.id] = m;
      }
    } catch (e) {
      console.warn('[Orchestrator] Warning: could not reach model service for registry snapshots. Using fallback.');
    }

    // 2. Persist initial Job and Run records
    const { job, modelRunIds } = this.jobsRepo.createJob(req, snapshots);

    // 3. Kick off execution asynchronously
    this.executeJob(job.id, req, modelRunIds).catch((err) => {
      console.error(`[Orchestrator] Fatal error in job ${job.id}:`, err);
      this.jobsRepo.updateJobStatus(job.id, 'FAILED');
    });

    return job;
  }

  private async executeJob(
    jobId: string,
    req: ComparisonJobRequest,
    modelRunIds: Record<string, string>
  ): Promise<void> {
    this.jobsRepo.updateJobStatus(jobId, 'RUNNING');

    // Run models sequentially or with bounded concurrency to protect CPU/memory
    for (const modelId of req.modelIds) {
      const runId = modelRunIds[modelId];
      if (!runId) continue;

      const runStartTime = Date.now();

      try {
        // Step A: Update to GENERATING
        this.jobsRepo.updateModelRun(runId, { status: 'GENERATING' });

        // Step B: Inference with model service
        const translationRes = await this.modelClient.translate({
          modelId,
          sourceLanguage: req.sourceLanguage,
          targetLanguage: req.targetLanguage,
          sourceCode: req.sourceCode,
          generation: req.generation,
        });

        if (translationRes.status === 'MODEL_UNAVAILABLE') {
          this.jobsRepo.updateModelRun(runId, {
            status: 'MODEL_UNAVAILABLE',
            candidateCode: null,
            generationTimeMs: translationRes.generationTimeMs,
            totalTimeMs: Date.now() - runStartTime,
            failureCategory: 'MODEL_UNAVAILABLE',
            runtimeDiagnostics: translationRes.error,
          });
          continue;
        }

        if (translationRes.status === 'GENERATION_FAILED' || !translationRes.candidateCode) {
          this.jobsRepo.updateModelRun(runId, {
            status: 'GENERATION_FAILED',
            candidateCode: translationRes.candidateCode || null,
            generationTimeMs: translationRes.generationTimeMs,
            totalTimeMs: Date.now() - runStartTime,
            failureCategory: 'GENERATION_FAILED',
            runtimeDiagnostics: translationRes.error || 'Empty candidate generated',
          });
          continue;
        }

        // Step C: Validation with language runner
        this.jobsRepo.updateModelRun(runId, {
          status: 'VALIDATING' as any,
          candidateCode: translationRes.candidateCode,
          generationTimeMs: translationRes.generationTimeMs,
        });

        const valRes = await this.runnerClient.validate({
          sourceLanguage: req.sourceLanguage,
          sourceVersion: req.sourceVersion,
          targetLanguage: req.targetLanguage,
          targetVersion: req.targetVersion,
          sourceCode: req.sourceCode,
          candidateCode: translationRes.candidateCode,
          entryPoint: req.entryPoint,
          tests: req.tests,
        });

        const totalDuration = Date.now() - runStartTime;

        this.jobsRepo.updateModelRun(runId, {
          status: valRes.overallStatus as ValidationStatus,
          candidateCode: translationRes.candidateCode,
          generationTimeMs: translationRes.generationTimeMs,
          totalTimeMs: totalDuration,
          passedTestsCount: valRes.passedTestsCount,
          totalTestsCount: valRes.totalTestsCount,
          compilerDiagnostics: valRes.compilerDiagnostics,
          runtimeDiagnostics: valRes.runtimeDiagnostics,
          failureCategory: valRes.failureCategory,
          gates: valRes.gates,
          testResults: valRes.testResults,
        });

      } catch (err: any) {
        console.error(`[Orchestrator] Error running model ${modelId} for job ${jobId}:`, err);
        this.jobsRepo.updateModelRun(runId, {
          status: 'EXECUTION_FAILED',
          totalTimeMs: Date.now() - runStartTime,
          failureCategory: 'ORCHESTRATION_ERROR',
          runtimeDiagnostics: err?.message || String(err),
        });
      }
    }

    this.jobsRepo.updateJobStatus(jobId, 'COMPLETED');
  }
}

