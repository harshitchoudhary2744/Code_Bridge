import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { RepairAttempt, RepairResponse, ValidationStatus } from '@transcode-lab/api-contracts';

export class RepairsRepository {
  constructor(private db: Database.Database) {}

  recordAttempt(
    modelRunId: string,
    attempt: {
      attemptNumber: number;
      repairModelId: string;
      feedbackPayload: string;
      generatedCode: string;
      status: ValidationStatus;
      passed: boolean;
      durationMs?: number;
      gates: any[];
      testResults: any[];
    }
  ): RepairAttempt {
    const attemptId = uuidv4();
    const createdAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO repair_attempts (
        id, model_run_id, attempt_number, repair_model_id,
        feedback_payload, generated_code, status, passed,
        duration_ms, gates_json, test_results_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attemptId,
      modelRunId,
      attempt.attemptNumber,
      attempt.repairModelId,
      attempt.feedbackPayload,
      attempt.generatedCode,
      attempt.status,
      attempt.passed ? 1 : 0,
      attempt.durationMs || null,
      JSON.stringify(attempt.gates),
      JSON.stringify(attempt.testResults),
      createdAt
    );

    // Increment repair attempt count on model run
    this.db.prepare(`
      UPDATE comparison_model_runs
      SET repair_attempts_count = repair_attempts_count + 1
      WHERE id = ?
    `).run(modelRunId);

    return {
      id: attemptId,
      attemptNumber: attempt.attemptNumber,
      repairModelId: attempt.repairModelId,
      feedbackPayload: attempt.feedbackPayload,
      generatedCode: attempt.generatedCode,
      status: attempt.status,
      passed: attempt.passed,
      durationMs: attempt.durationMs,
      gates: attempt.gates,
      testResults: attempt.testResults,
      createdAt,
    };
  }

  getAttempts(modelRunId: string): RepairAttempt[] {
    const rows = this.db.prepare(`
      SELECT * FROM repair_attempts WHERE model_run_id = ? ORDER BY attempt_number ASC
    `).all(modelRunId) as any[];

    return rows.map((r) => ({
      id: r.id,
      attemptNumber: r.attempt_number,
      repairModelId: r.repair_model_id,
      feedbackPayload: r.feedback_payload,
      generatedCode: r.generated_code,
      status: r.status as ValidationStatus,
      passed: Boolean(r.passed),
      durationMs: r.duration_ms ?? undefined,
      gates: JSON.parse(r.gates_json || '[]'),
      testResults: JSON.parse(r.test_results_json || '[]'),
      createdAt: r.created_at,
    }));
  }
}

