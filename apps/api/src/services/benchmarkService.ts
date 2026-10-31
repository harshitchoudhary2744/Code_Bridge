import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  BenchmarkManifest,
  BenchmarkRunRequest,
  BenchmarkRunResponse,
  BenchmarkMetricSummary
} from '@transcode-lab/api-contracts';
import { ModelServiceClient } from './modelServiceClient';
import { RunnerClient } from './runnerClient';

export class BenchmarkService {
  private fixturePath: string;

  constructor(
    private db: Database.Database,
    private modelClient: ModelServiceClient,
    private runnerClient: RunnerClient
  ) {
    this.fixturePath = path.resolve(process.cwd(), 'tests/fixtures/python_java_benchmark.json');
    if (!fs.existsSync(this.fixturePath)) {
      // Look one directory up if running from apps/api
      this.fixturePath = path.resolve(process.cwd(), '../../tests/fixtures/python_java_benchmark.json');
    }
  }

  getBenchmarks(): BenchmarkManifest[] {
    return [
      {
        id: 'transcode-lab-curated-v1',
        name: 'TransCode Lab Curated Evaluation Set (Python <-> Java)',
        description: 'Verified parallel functions with deterministic test cases and edge cases',
        languages: ['python', 'java'],
        problemCount: 8,
        testCount: 34,
        license: 'MIT',
      },
      {
        id: 'codexglue-code2code',
        name: 'CodeXGLUE Code Translation (Java <-> C# Reference)',
        description: 'Canonical CodeXGLUE translation task (Audited: Java <-> C# only, excluded from Python/Java run)',
        languages: ['java'],
        problemCount: 1000,
        testCount: 0,
        license: 'MIT',
      }
    ];
  }

  async runBenchmark(req: BenchmarkRunRequest): Promise<BenchmarkRunResponse> {
    const runId = uuidv4();
    const createdAt = new Date().toISOString();

    if (!fs.existsSync(this.fixturePath)) {
      throw new Error(`Benchmark fixture file not found at ${this.fixturePath}`);
    }

    const fixtureData = JSON.parse(fs.readFileSync(this.fixturePath, 'utf-8'));
    let problems = fixtureData.problems || [];
    if (req.limitProblems && req.limitProblems > 0) {
      problems = problems.slice(0, req.limitProblems);
    }

    this.db.prepare(`
      INSERT INTO benchmark_runs (id, benchmark_id, source_language, target_language, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(runId, req.benchmarkId, req.sourceLanguage, req.targetLanguage, 'RUNNING', createdAt);

    const modelSummaries: BenchmarkMetricSummary[] = [];

    // Run evaluation per model
    for (const modelId of req.modelIds) {
      const latencies: number[] = [];
      let syntaxPass = 0;
      let compilePass = 0;
      let behavioralPass = 0;
      const failureCounts: Record<string, number> = {};

      for (const prob of problems) {
        const sourceCode = req.sourceLanguage === 'python' ? prob.pythonCode : prob.javaCode;

        // 1. Translate
        const transRes = await this.modelClient.translate({
          modelId,
          sourceLanguage: req.sourceLanguage,
          targetLanguage: req.targetLanguage,
          sourceCode,
          generation: req.generation,
        });

        latencies.push(transRes.generationTimeMs);

        if (!transRes.candidateCode || transRes.status === 'MODEL_UNAVAILABLE') {
          failureCounts['MODEL_UNAVAILABLE'] = (failureCounts['MODEL_UNAVAILABLE'] || 0) + 1;
          continue;
        }

        // 2. Validate
        const valRes = await this.runnerClient.validate({
          sourceLanguage: req.sourceLanguage,
          targetLanguage: req.targetLanguage,
          sourceCode,
          candidateCode: transRes.candidateCode,
          entryPoint: prob.entryPoint,
          tests: prob.tests,
        });

        // Track syntax
        const synGate = valRes.gates.find((g) => g.gate === 'syntax');
        if (synGate && synGate.passed) {
          syntaxPass++;
        }

        // Track compile
        const compGate = valRes.gates.find((g) => g.gate === 'compilation');
        if (compGate && compGate.passed) {
          compilePass++;
        } else if (req.targetLanguage === 'python' && synGate && synGate.passed) {
          compilePass++; // In Python, syntax pass == compile pass
        }

        // Track behavioral
        if (valRes.overallStatus === 'PASSED_AVAILABLE_TESTS') {
          behavioralPass++;
        } else {
          const cat = valRes.failureCategory || 'UNKNOWN_FAILURE';
          failureCounts[cat] = (failureCounts[cat] || 0) + 1;
        }
      }

      latencies.sort((a, b) => a - b);
      const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;
      const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

      const summary: BenchmarkMetricSummary = {
        modelId,
        displayName: modelId,
        publisher: 'Evaluated Publisher',
        totalProblems: problems.length,
        syntaxPassCount: syntaxPass,
        syntaxPassRate: problems.length > 0 ? round(syntaxPass / problems.length, 3) : 0,
        compilePassCount: compilePass,
        compilePassRate: problems.length > 0 ? round(compilePass / problems.length, 3) : 0,
        firstPassBehavioralCount: behavioralPass,
        firstPassBehavioralRate: problems.length > 0 ? round(behavioralPass / problems.length, 3) : 0,
        medianLatencyMs: round(medianLatency, 1),
        p95LatencyMs: round(p95Latency, 1),
        totalAttempts: problems.length,
        failureBreakdown: failureCounts,
      };

      modelSummaries.push(summary);

      // Persist metrics
      this.db.prepare(`
        INSERT INTO benchmark_metrics (id, benchmark_run_id, model_id, summary_json)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), runId, modelId, JSON.stringify(summary));
    }

    const completedAt = new Date().toISOString();
    this.db.prepare(`
      UPDATE benchmark_runs SET status = 'COMPLETED', completed_at = ?
      WHERE id = ?
    `).run(completedAt, runId);

    return {
      id: runId,
      benchmarkId: req.benchmarkId,
      createdAt,
      completedAt,
      status: 'COMPLETED',
      sourceLanguage: req.sourceLanguage,
      targetLanguage: req.targetLanguage,
      modelSummaries,
    };
  }

  getBenchmarkRunById(runId: string): BenchmarkRunResponse | null {
    const runRow = this.db.prepare('SELECT * FROM benchmark_runs WHERE id = ?').get(runId) as any;
    if (!runRow) return null;

    const metricsRows = this.db.prepare('SELECT * FROM benchmark_metrics WHERE benchmark_run_id = ?').all(runId) as any[];
    const modelSummaries = metricsRows.map((m) => JSON.parse(m.summary_json));

    return {
      id: runRow.id,
      benchmarkId: runRow.benchmark_id,
      createdAt: runRow.created_at,
      completedAt: runRow.completed_at,
      status: runRow.status,
      sourceLanguage: runRow.source_language,
      targetLanguage: runRow.target_language,
      modelSummaries,
    };
  }
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

