import { config } from '../config';
import { ValidationGateResult, TestResult } from '@transcode-lab/api-contracts';

export interface ValidationApiResponse {
  overallStatus: string;
  passed: boolean;
  gates: ValidationGateResult[];
  testResults: TestResult[];
  passedTestsCount: number;
  totalTestsCount: number;
  compilerDiagnostics?: string | null;
  runtimeDiagnostics?: string | null;
  failureCategory?: string | null;
  sandboxStatus: string;
}

export class RunnerClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.executionRunnerUrl;
  }

  async health(): Promise<{ status: string; service: string; sandboxMode: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Execution runner health check failed with status ${res.status}`);
    return res.json() as any;
  }

  async validate(params: {
    sourceLanguage: string;
    sourceVersion?: string;
    targetLanguage: string;
    targetVersion?: string;
    sourceCode: string;
    candidateCode?: string | null;
    entryPoint: { kind?: string; name: string; className?: string };
    tests: Array<{ input: any[]; expectedOutput?: any; isEdgeCase?: boolean }>;
    timeoutSeconds?: number;
  }): Promise<ValidationApiResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        overallStatus: 'EXECUTION_FAILED',
        passed: false,
        gates: [
          {
            gate: 'target_execution',
            passed: false,
            status: 'EXECUTION_FAILED',
            message: `Runner error (${res.status}): ${errText}`,
          },
        ],
        testResults: [],
        passedTestsCount: 0,
        totalTestsCount: params.tests.length,
        runtimeDiagnostics: errText,
        failureCategory: 'RUNNER_SERVICE_ERROR',
        sandboxStatus: 'UNAVAILABLE',
      };
    }

    return res.json() as any;
  }
}

