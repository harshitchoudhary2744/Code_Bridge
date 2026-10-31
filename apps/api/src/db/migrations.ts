import Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRow = db.prepare('SELECT MAX(version) as current_version FROM schema_migrations').get() as { current_version: number | null };
  const currentVersion = appliedRow?.current_version || 0;

  if (currentVersion < 1) {
    db.transaction(() => {
      // 1. Comparison Jobs
      db.exec(`
        CREATE TABLE IF NOT EXISTS comparison_jobs (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          completed_at TEXT,
          status TEXT NOT NULL,
          source_language TEXT NOT NULL,
          source_version TEXT NOT NULL,
          target_language TEXT NOT NULL,
          target_version TEXT NOT NULL,
          source_code TEXT NOT NULL,
          entry_point_json TEXT NOT NULL,
          tests_json TEXT NOT NULL,
          mode TEXT NOT NULL,
          generation_config_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON comparison_jobs(created_at);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON comparison_jobs(status);
      `);

      // 2. Comparison Model Runs
      db.exec(`
        CREATE TABLE IF NOT EXISTS comparison_model_runs (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES comparison_jobs(id) ON DELETE CASCADE,
          model_id TEXT NOT NULL,
          status TEXT NOT NULL,
          candidate_code TEXT,
          generation_time_ms REAL,
          total_time_ms REAL,
          peak_memory_mb REAL,
          passed_tests_count INTEGER DEFAULT 0,
          total_tests_count INTEGER DEFAULT 0,
          compiler_diagnostics TEXT,
          runtime_diagnostics TEXT,
          failure_category TEXT,
          repair_attempts_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_runs_job_id ON comparison_model_runs(job_id);
        CREATE INDEX IF NOT EXISTS idx_runs_model_id ON comparison_model_runs(model_id);
      `);

      // 3. Model Registry Snapshots
      db.exec(`
        CREATE TABLE IF NOT EXISTS model_registry_snapshots (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES comparison_jobs(id) ON DELETE CASCADE,
          model_id TEXT NOT NULL,
          metadata_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_snapshots_job_id ON model_registry_snapshots(job_id);
      `);

      // 4. Validation Gates
      db.exec(`
        CREATE TABLE IF NOT EXISTS validation_gates (
          id TEXT PRIMARY KEY,
          model_run_id TEXT NOT NULL REFERENCES comparison_model_runs(id) ON DELETE CASCADE,
          gate TEXT NOT NULL,
          passed INTEGER NOT NULL,
          status TEXT NOT NULL,
          message TEXT,
          diagnostics TEXT,
          duration_ms REAL
        );
        CREATE INDEX IF NOT EXISTS idx_gates_run_id ON validation_gates(model_run_id);
      `);

      // 5. Test Results
      db.exec(`
        CREATE TABLE IF NOT EXISTS test_results (
          id TEXT PRIMARY KEY,
          model_run_id TEXT NOT NULL REFERENCES comparison_model_runs(id) ON DELETE CASCADE,
          test_index INTEGER NOT NULL,
          input_json TEXT NOT NULL,
          expected_output_json TEXT,
          actual_output_json TEXT,
          passed INTEGER NOT NULL,
          outcome TEXT NOT NULL,
          execution_time_ms REAL,
          error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tests_run_id ON test_results(model_run_id);
      `);

      // 6. Repair Attempts
      db.exec(`
        CREATE TABLE IF NOT EXISTS repair_attempts (
          id TEXT PRIMARY KEY,
          model_run_id TEXT NOT NULL REFERENCES comparison_model_runs(id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          repair_model_id TEXT NOT NULL,
          feedback_payload TEXT NOT NULL,
          generated_code TEXT NOT NULL,
          status TEXT NOT NULL,
          passed INTEGER NOT NULL,
          duration_ms REAL,
          gates_json TEXT,
          test_results_json TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_repairs_run_id ON repair_attempts(model_run_id);
      `);

      // 7. Benchmark Runs & Metrics
      db.exec(`
        CREATE TABLE IF NOT EXISTS benchmark_runs (
          id TEXT PRIMARY KEY,
          benchmark_id TEXT NOT NULL,
          source_language TEXT NOT NULL,
          target_language TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS benchmark_metrics (
          id TEXT PRIMARY KEY,
          benchmark_run_id TEXT NOT NULL REFERENCES benchmark_runs(id) ON DELETE CASCADE,
          model_id TEXT NOT NULL,
          summary_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_bench_metrics_run_id ON benchmark_metrics(benchmark_run_id);
      `);

      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)').run(new Date().toISOString());
    })();
  }
}

