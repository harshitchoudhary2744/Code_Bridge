import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  ComparisonJobRequest,
  ComparisonJobResponse,
  ModelRunDetail,
  ValidationGateResult,
  TestResult,
  ModelMetadata,
  ValidationStatus
} from '@transcode-lab/api-contracts';

export class JobsRepository {
  constructor(private db: Database.Database) {}

  createJob(
    req: ComparisonJobRequest,
    modelSnapshots: Record<string, ModelMetadata>
  ): { job: ComparisonJobResponse; modelRunIds: Record<string, string> } {
    const jobId = uuidv4();
    const createdAt = new Date().toISOString();
    const modelRunIds: Record<string, string> = {};

    this.db.transaction(() => {
      // 1. Insert Job
      this.db.prepare(`
        INSERT INTO comparison_jobs (
          id, created_at, status, source_language, source_version,
          target_language, target_version, source_code, entry_point_json,
          tests_json, mode, generation_config_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        jobId,
        createdAt,
        'QUEUED',
        req.sourceLanguage,
        req.sourceVersion,
        req.targetLanguage,
        req.targetVersion,
        req.sourceCode,
        JSON.stringify(req.entryPoint),
        JSON.stringify(req.tests),
        req.mode,
        JSON.stringify(req.generation)
      );

      // 2. Insert Model Runs & Snapshots
      for (const modelId of req.modelIds) {
        const runId = uuidv4();
        modelRunIds[modelId] = runId;
        const snapshot = modelSnapshots[modelId] || {
          id: modelId,
          displayName: modelId,
          publisher: 'Unknown',
          family: 'Unknown',
          architecture: 'encoder-decoder',
          checkpoint: modelId,
          revision: 'unknown',
          tokenizer: modelId,
          license: 'UNKNOWN',
          supportedTasks: ['code-to-code'],
          supportedLanguages: [req.sourceLanguage, req.targetLanguage],
          status: 'AVAILABLE',
          fineTuningStatus: 'PRETRAINED_ONLY',
          limitations: []
        };

        this.db.prepare(`
          INSERT INTO model_registry_snapshots (id, job_id, model_id, metadata_json)
          VALUES (?, ?, ?, ?)
        `).run(uuidv4(), jobId, modelId, JSON.stringify(snapshot));

        this.db.prepare(`
          INSERT INTO comparison_model_runs (
            id, job_id, model_id, status, created_at, total_tests_count
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(runId, jobId, modelId, 'QUEUED', createdAt, req.tests.length);
      }
    })();

    const createdJob = this.getJobById(jobId);
    if (!createdJob) {
      throw new Error(`Failed to retrieve newly created job ${jobId}`);
    }
    return { job: createdJob, modelRunIds };
  }

  getJobById(jobId: string): ComparisonJobResponse | null {
    const jobRow = this.db.prepare('SELECT * FROM comparison_jobs WHERE id = ?').get(jobId) as any;
    if (!jobRow) return null;

    const runs = this.db.prepare('SELECT * FROM comparison_model_runs WHERE job_id = ?').all(jobId) as any[];
    const snapshots = this.db.prepare('SELECT * FROM model_registry_snapshots WHERE job_id = ?').all(jobId) as any[];

    const snapshotMap: Record<string, ModelMetadata> = {};
    for (const s of snapshots) {
      snapshotMap[s.model_id] = JSON.parse(s.metadata_json);
    }

    const modelRuns: ModelRunDetail[] = runs.map((r) => {
      const gatesRows = this.db.prepare('SELECT * FROM validation_gates WHERE model_run_id = ?').all(r.id) as any[];
      const testsRows = this.db.prepare('SELECT * FROM test_results WHERE model_run_id = ? ORDER BY test_index ASC').all(r.id) as any[];

      const gates: ValidationGateResult[] = gatesRows.map((g) => ({
        gate: g.gate as any,
        passed: Boolean(g.passed),
        status: g.status,
        message: g.message || undefined,
        diagnostics: g.diagnostics || undefined,
        durationMs: g.duration_ms ?? undefined,
      }));

      const testResults: TestResult[] = testsRows.map((t) => ({
        testIndex: t.test_index,
        input: JSON.parse(t.input_json),
        expectedOutput: t.expected_output_json ? JSON.parse(t.expected_output_json) : undefined,
        actualOutput: t.actual_output_json ? JSON.parse(t.actual_output_json) : undefined,
        passed: Boolean(t.passed),
        outcome: t.outcome as any,
        executionTimeMs: t.execution_time_ms ?? undefined,
        errorMessage: t.error_message || undefined,
      }));

      return {
        id: r.id,
        jobId: r.job_id,
        modelId: r.model_id,
        modelMetadataSnapshot: snapshotMap[r.model_id] || {
          id: r.model_id,
          displayName: r.model_id,
          publisher: 'Unknown',
          family: 'Unknown',
          architecture: 'encoder-decoder',
          checkpoint: r.model_id,
          revision: 'unknown',
          tokenizer: r.model_id,
          license: 'UNKNOWN',
          supportedTasks: ['code-to-code'],
          supportedLanguages: [jobRow.source_language, jobRow.target_language],
          status: 'AVAILABLE',
          fineTuningStatus: 'PRETRAINED_ONLY',
          limitations: []
        },
        status: r.status as ValidationStatus,
        candidateCode: r.candidate_code,
        generationTimeMs: r.generation_time_ms,
        totalTimeMs: r.total_time_ms,
        peakMemoryMb: r.peak_memory_mb,
        gates,
        testResults,
        passedTestsCount: r.passed_tests_count || 0,
        totalTestsCount: r.total_tests_count || 0,
        compilerDiagnostics: r.compiler_diagnostics,
        runtimeDiagnostics: r.runtime_diagnostics,
        failureCategory: r.failure_category,
        repairAttemptsCount: r.repair_attempts_count || 0,
      };
    });

    const passedModels = modelRuns.filter((m) => m.status === 'PASSED_AVAILABLE_TESTS').length;
    const completedModels = modelRuns.filter((m) => !['QUEUED', 'GENERATING'].includes(m.status)).length;

    return {
      id: jobRow.id,
      createdAt: jobRow.created_at,
      completedAt: jobRow.completed_at,
      status: jobRow.status as any,
      sourceLanguage: jobRow.source_language as any,
      sourceVersion: jobRow.source_version,
      targetLanguage: jobRow.target_language as any,
      targetVersion: jobRow.target_version,
      sourceCode: jobRow.source_code,
      entryPoint: JSON.parse(jobRow.entry_point_json),
      tests: JSON.parse(jobRow.tests_json),
      mode: jobRow.mode as any,
      generationConfig: JSON.parse(jobRow.generation_config_json),
      modelRuns,
      summary: {
        totalModels: modelRuns.length,
        completedModels,
        passedModels,
        failedModels: completedModels - passedModels,
      },
    };
  }

  updateModelRun(
    runId: string,
    data: {
      status: ValidationStatus;
      candidateCode?: string | null;
      generationTimeMs?: number | null;
      totalTimeMs?: number | null;
      peakMemoryMb?: number | null;
      passedTestsCount?: number;
      totalTestsCount?: number;
      compilerDiagnostics?: string | null;
      runtimeDiagnostics?: string | null;
      failureCategory?: string | null;
      gates?: ValidationGateResult[];
      testResults?: TestResult[];
    }
  ): void {
    this.db.transaction(() => {
      this.db.prepare(`
        UPDATE comparison_model_runs SET
          status = ?,
          candidate_code = COALESCE(?, candidate_code),
          generation_time_ms = COALESCE(?, generation_time_ms),
          total_time_ms = COALESCE(?, total_time_ms),
          peak_memory_mb = COALESCE(?, peak_memory_mb),
          passed_tests_count = COALESCE(?, passed_tests_count),
          total_tests_count = COALESCE(?, total_tests_count),
          compiler_diagnostics = COALESCE(?, compiler_diagnostics),
          runtime_diagnostics = COALESCE(?, runtime_diagnostics),
          failure_category = COALESCE(?, failure_category),
          completed_at = ?
        WHERE id = ?
      `).run(
        data.status,
        data.candidateCode,
        data.generationTimeMs,
        data.totalTimeMs,
        data.peakMemoryMb,
        data.passedTestsCount,
        data.totalTestsCount,
        data.compilerDiagnostics,
        data.runtimeDiagnostics,
        data.failureCategory,
        new Date().toISOString(),
        runId
      );

      if (data.gates && data.gates.length > 0) {
        this.db.prepare('DELETE FROM validation_gates WHERE model_run_id = ?').run(runId);
        const insertGate = this.db.prepare(`
          INSERT INTO validation_gates (id, model_run_id, gate, passed, status, message, diagnostics, duration_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const g of data.gates) {
          insertGate.run(
            uuidv4(),
            runId,
            g.gate,
            g.passed ? 1 : 0,
            g.status,
            g.message || null,
            g.diagnostics || null,
            g.durationMs || null
          );
        }
      }

      if (data.testResults && data.testResults.length > 0) {
        this.db.prepare('DELETE FROM test_results WHERE model_run_id = ?').run(runId);
        const insertTest = this.db.prepare(`
          INSERT INTO test_results (id, model_run_id, test_index, input_json, expected_output_json, actual_output_json, passed, outcome, execution_time_ms, error_message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of data.testResults) {
          insertTest.run(
            uuidv4(),
            runId,
            t.testIndex,
            JSON.stringify(t.input),
            t.expectedOutput !== undefined ? JSON.stringify(t.expectedOutput) : null,
            t.actualOutput !== undefined ? JSON.stringify(t.actualOutput) : null,
            t.passed ? 1 : 0,
            t.outcome,
            t.executionTimeMs || null,
            t.errorMessage || null
          );
        }
      }
    })();
  }

  updateJobStatus(jobId: string, status: string): void {
    const completedAt = ['COMPLETED', 'FAILED'].includes(status) ? new Date().toISOString() : null;
    this.db.prepare(`
      UPDATE comparison_jobs SET status = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(status, completedAt, jobId);
  }

  listJobs(limit = 20, offset = 0): ComparisonJobResponse[] {
    const rows = this.db.prepare(`
      SELECT id FROM comparison_jobs ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as { id: string }[];

    return rows.map((r) => this.getJobById(r.id)).filter(Boolean) as ComparisonJobResponse[];
  }
}

