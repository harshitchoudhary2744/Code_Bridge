import {
  RepairRequest,
  RepairResponse,
  RepairAttempt,
  ValidationStatus
} from '@transcode-lab/api-contracts';
import { JobsRepository } from '../db/repositories/jobs';
import { RepairsRepository } from '../db/repositories/repairs';
import { ModelServiceClient } from './modelServiceClient';
import { RunnerClient } from './runnerClient';

export class RepairService {
  constructor(
    private jobsRepo: JobsRepository,
    private repairsRepo: RepairsRepository,
    private modelClient: ModelServiceClient,
    private runnerClient: RunnerClient
  ) {}

  async runRepair(req: RepairRequest): Promise<RepairResponse> {
    const job = this.jobsRepo.getJobById(req.jobId);
    if (!job) {
      throw new Error(`Job '${req.jobId}' not found`);
    }

    const run = job.modelRuns.find((r) => r.id === req.modelRunId);
    if (!run) {
      throw new Error(`Model run '${req.modelRunId}' not found in job '${req.jobId}'`);
    }

    const originalCandidate = run.candidateCode || '';
    const originalStatus = run.status;
    const repairModel = req.repairModelId || run.modelId;
    const maxAttempts = req.maxAttempts || 3;

    let currentCandidate = originalCandidate;
    let currentStatus = originalStatus;
    let currentCompilerDiag = run.compilerDiagnostics;
    let currentRuntimeDiag = run.runtimeDiagnostics;
    let currentTestResults = run.testResults;

    const attempts: RepairAttempt[] = [];
    let repairSucceeded = false;

    for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++) {
      const attemptStart = Date.now();

      // Find first failing test case
      const failingTest = currentTestResults.find((t) => !t.passed);

      // Call model service repair
      const repairRes = await this.modelClient.repair({
        modelId: repairModel,
        sourceLanguage: job.sourceLanguage,
        targetLanguage: job.targetLanguage,
        sourceCode: job.sourceCode,
        previousCandidate: currentCandidate,
        compilerDiagnostics: currentCompilerDiag || undefined,
        failingTestInput: failingTest?.input,
        expectedOutput: failingTest?.expectedOutput,
        actualOutput: failingTest?.actualOutput,
        failureCategory: run.failureCategory || undefined,
        generation: job.generationConfig,
      });

      if (repairRes.status === 'REPAIR_FAILED' || !repairRes.candidateCode) {
        const recorded = this.repairsRepo.recordAttempt(run.id, {
          attemptNumber: attemptNum,
          repairModelId: repairModel,
          feedbackPayload: repairRes.feedbackPayloadUsed || 'Repair request failed',
          generatedCode: currentCandidate,
          status: 'EXECUTION_FAILED',
          passed: false,
          durationMs: Date.now() - attemptStart,
          gates: [],
          testResults: [],
        });
        attempts.push(recorded);
        break;
      }

      const newCandidate = repairRes.candidateCode;

      // Validate new candidate
      const valRes = await this.runnerClient.validate({
        sourceLanguage: job.sourceLanguage,
        sourceVersion: job.sourceVersion,
        targetLanguage: job.targetLanguage,
        targetVersion: job.targetVersion,
        sourceCode: job.sourceCode,
        candidateCode: newCandidate,
        entryPoint: job.entryPoint,
        tests: job.tests,
      });

      const attemptPassed = valRes.overallStatus === 'PASSED_AVAILABLE_TESTS';
      const durationMs = Date.now() - attemptStart;

      const recordedAttempt = this.repairsRepo.recordAttempt(run.id, {
        attemptNumber: attemptNum,
        repairModelId: repairModel,
        feedbackPayload: repairRes.feedbackPayloadUsed,
        generatedCode: newCandidate,
        status: valRes.overallStatus as ValidationStatus,
        passed: attemptPassed,
        durationMs,
        gates: valRes.gates,
        testResults: valRes.testResults,
      });

      attempts.push(recordedAttempt);

      currentCandidate = newCandidate;
      currentStatus = valRes.overallStatus as ValidationStatus;
      currentCompilerDiag = valRes.compilerDiagnostics;
      currentRuntimeDiag = valRes.runtimeDiagnostics;
      currentTestResults = valRes.testResults;

      if (attemptPassed) {
        repairSucceeded = true;
        break;
      }
    }

    return {
      jobId: job.id,
      modelRunId: run.id,
      originalCandidate,
      originalStatus,
      attempts,
      finalStatus: currentStatus,
      finalCode: currentCandidate,
      repairSucceeded,
      totalRetries: attempts.length,
    };
  }
}

