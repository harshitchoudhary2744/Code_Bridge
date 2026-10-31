import { ComparisonJobResponse } from '@transcode-lab/api-contracts';

export class ExportService {
  exportJson(job: ComparisonJobResponse): string {
    return JSON.stringify(job, null, 2);
  }

  exportCsv(job: ComparisonJobResponse): string {
    const headers = [
      'job_id',
      'created_at',
      'source_language',
      'target_language',
      'model_id',
      'model_display_name',
      'publisher',
      'architecture',
      'checkpoint_revision',
      'status',
      'generation_time_ms',
      'total_time_ms',
      'passed_tests_count',
      'total_tests_count',
      'test_pass_rate',
      'failure_category',
      'compiler_diagnostics',
    ];

    const rows: string[] = [headers.join(',')];

    for (const run of job.modelRuns) {
      const passRate = run.totalTestsCount > 0 ? (run.passedTestsCount / run.totalTestsCount).toFixed(3) : '0.000';
      const cleanDiag = (run.compilerDiagnostics || '').replace(/[\r\n,"]/g, ' ').slice(0, 100);

      const row = [
        job.id,
        job.createdAt,
        job.sourceLanguage,
        job.targetLanguage,
        run.modelId,
        `"${run.modelMetadataSnapshot.displayName}"`,
        `"${run.modelMetadataSnapshot.publisher}"`,
        `"${run.modelMetadataSnapshot.architecture}"`,
        `"${run.modelMetadataSnapshot.revision}"`,
        run.status,
        run.generationTimeMs ?? '',
        run.totalTimeMs ?? '',
        run.passedTestsCount,
        run.totalTestsCount,
        passRate,
        run.failureCategory || 'NONE',
        `"${cleanDiag}"`,
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}

