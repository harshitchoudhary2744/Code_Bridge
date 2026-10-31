import React, { useState } from 'react';
import { ComparisonJobResponse, ModelRunDetail } from '@transcode-lab/api-contracts';
import { StatusBadge } from '../components/StatusBadge';
import { DiffViewer } from '../components/DiffViewer';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  Code2,
  FileDiff,
  Terminal,
  Activity
} from 'lucide-react';

interface ResultsViewProps {
  job: ComparisonJobResponse | null;
  onStartRepair: (run: ModelRunDetail) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ job, onStartRepair }) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'diff' | 'tests' | 'diagnostics'>('code');

  if (!job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-canvas-default text-text-tertiary p-8 font-mono text-xs">
        <Activity className="w-8 h-8 text-border-strong mb-2 animate-pulse" />
        <p className="text-sm font-sans font-medium text-text-secondary">No Comparison Results Selected</p>
        <p className="mt-1">Submit a translation task from the Workbench to view side-by-side candidate evaluations.</p>
      </div>
    );
  }

  const activeRun = job.modelRuns.find((r) => r.id === (selectedRunId || job.modelRuns[0]?.id)) || job.modelRuns[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-default overflow-hidden">
      {/* Top Telemetry Summary Header */}
      <div className="h-14 border-b border-border-subtle bg-surface-base px-4 flex items-center justify-between select-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-text-primary">
              Job <span className="text-accent-primary">{job.id.slice(0, 8)}</span>
            </span>
            <span className="text-xs font-mono text-text-tertiary">
              {job.sourceLanguage.toUpperCase()} → {job.targetLanguage.toUpperCase()}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated font-mono text-text-secondary border border-border-subtle">
              Status: <strong>{job.status}</strong>
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary font-mono mt-0.5">
            Entry: <code className="text-text-secondary">{job.entryPoint.name}</code> • {job.modelRuns.length} models compared • {job.tests.length} tests evaluated
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-text-tertiary block text-[10px]">PASSING MODELS</span>
            <span className="text-emerald-400 font-bold">
              {job.summary?.passedModels ?? 0} / {job.modelRuns.length}
            </span>
          </div>
          <div className="text-right pl-3 border-l border-border-subtle">
            <span className="text-text-tertiary block text-[10px]">FAILED MODELS</span>
            <span className="text-rose-400 font-bold">
              {job.summary?.failedModels ?? 0} / {job.modelRuns.length}
            </span>
          </div>
        </div>
      </div>

      {/* Split Comparison Columns */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Model Tabs / Selector Rail (3 Cols) */}
        <div className="col-span-3 border-r border-border-subtle bg-surface-base flex flex-col overflow-y-auto p-2 space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-wider text-text-tertiary px-2 pt-1 font-bold">
            Evaluated Models
          </div>
          {job.modelRuns.map((run) => {
            const isSelected = run.id === activeRun?.id;
            return (
              <div
                key={run.id}
                onClick={() => setSelectedRunId(run.id)}
                className={`p-2.5 rounded border text-xs font-mono cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-surface-elevated border-accent-primary text-text-primary shadow-sm'
                    : 'bg-canvas-default border-border-subtle text-text-secondary hover:border-border-strong hover:bg-surface-elevated/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-text-primary truncate">{run.modelMetadataSnapshot.displayName}</span>
                  <StatusBadge status={run.status} showIcon={false} />
                </div>
                <div className="text-[10px] text-text-tertiary truncate">
                  {run.modelMetadataSnapshot.publisher} • {run.modelMetadataSnapshot.parameterCount ? `${Math.round(run.modelMetadataSnapshot.parameterCount / 1000000)}M` : 'Seq2Seq'}
                </div>
                <div className="mt-2 pt-1.5 border-t border-border-subtle/50 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-text-tertiary">
                    <Clock className="w-3 h-3" /> {run.generationTimeMs ? `${run.generationTimeMs}ms` : '--'}
                  </span>
                  <span className="font-medium text-text-secondary">
                    Tests: {run.passedTestsCount}/{run.totalTestsCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Model Deep Inspection (9 Cols) */}
        {activeRun && (
          <div className="col-span-9 flex flex-col bg-surface-base overflow-hidden">
            {/* Model Card Header */}
            <div className="border-b border-border-subtle bg-surface-elevated px-4 py-2.5 flex items-center justify-between select-none">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-text-primary font-sans">
                    {activeRun.modelMetadataSnapshot.displayName}
                  </h3>
                  <StatusBadge status={activeRun.status} />
                  <span className="text-xs font-mono text-text-tertiary">
                    Revision: {activeRun.modelMetadataSnapshot.revision.slice(0, 7)}
                  </span>
                </div>
                <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                  Checkpoint: <code className="text-text-secondary">{activeRun.modelMetadataSnapshot.checkpoint}</code> • License: {activeRun.modelMetadataSnapshot.license}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {activeRun.status !== 'PASSED_AVAILABLE_TESTS' && (
                  <button
                    onClick={() => onStartRepair(activeRun)}
                    className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Launch Repair Experiment
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs for Active Model */}
            <div className="h-9 border-b border-border-subtle bg-surface-base px-4 flex items-center gap-4 text-xs font-mono">
              <button
                onClick={() => setActiveTab('code')}
                className={`h-full border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'code' ? 'border-accent-primary text-accent-subtle font-medium' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}
              >
                <Code2 className="w-3.5 h-3.5" /> Generated Code
              </button>
              <button
                onClick={() => setActiveTab('diff')}
                className={`h-full border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'diff' ? 'border-accent-primary text-accent-subtle font-medium' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}
              >
                <FileDiff className="w-3.5 h-3.5" /> Source / Output Diff
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`h-full border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'tests' ? 'border-accent-primary text-accent-subtle font-medium' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Test Outcomes ({activeRun.passedTestsCount}/{activeRun.totalTestsCount})
              </button>
              {(activeRun.compilerDiagnostics || activeRun.runtimeDiagnostics) && (
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`h-full border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'diagnostics' ? 'border-rose-400 text-rose-300 font-medium' : 'border-transparent text-rose-400/70 hover:text-rose-300'}`}
                >
                  <Terminal className="w-3.5 h-3.5" /> {activeRun.compilerDiagnostics ? 'Compiler Diagnostics' : 'Diagnostics'}
                </button>
              )}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Gates Strip */}
              <div className="grid grid-cols-6 gap-2">
                {activeRun.gates.map((g) => (
                  <div key={g.gate} className="p-2 rounded bg-surface-elevated border border-border-subtle font-mono text-[11px]">
                    <div className="text-text-tertiary text-[10px] uppercase truncate">{g.gate}</div>
                    <div className="flex items-center gap-1 mt-1 font-semibold">
                      {g.passed ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      )}
                      <span className={g.passed ? 'text-emerald-400' : 'text-rose-400'}>
                        {g.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* View 1: Generated Code */}
              {activeTab === 'code' && (
                <div className="space-y-2">
                  {activeRun.status === 'MODEL_UNAVAILABLE' && activeRun.runtimeDiagnostics && (
                    <div className="p-3 rounded bg-amber-950/20 border border-amber-900/50 text-xs font-mono text-amber-300">
                      <div className="font-semibold text-amber-400 mb-1">Model Inference Diagnostic:</div>
                      <div>{activeRun.runtimeDiagnostics}</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-mono text-text-tertiary">
                    <span>Target Candidate ({job.targetLanguage.toUpperCase()})</span>
                    <span>Tokens Extracted Successfully</span>
                  </div>
                  <pre className="p-3 rounded bg-canvas-default border border-border-subtle font-mono text-xs text-text-primary overflow-x-auto leading-relaxed max-h-96">
                    {activeRun.candidateCode || '// No candidate tokens returned'}
                  </pre>
                </div>
              )}

              {/* View 2: Diff */}
              {activeTab === 'diff' && (
                <div className="space-y-2">
                  <DiffViewer
                    originalCode={job.sourceCode}
                    candidateCode={activeRun.candidateCode || ''}
                    originalLabel={`Source Code (${job.sourceLanguage.toUpperCase()})`}
                    candidateLabel={`Model Output (${job.targetLanguage.toUpperCase()})`}
                  />
                </div>
              )}

              {/* View 3: Tests Matrix */}
              {activeTab === 'tests' && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">
                    Differential Input Evaluation ({activeRun.testResults.length} cases)
                  </div>
                  <div className="border border-border-subtle rounded overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-canvas-default text-text-secondary text-[11px] border-b border-border-subtle">
                        <tr>
                          <th className="py-1.5 px-3">#</th>
                          <th className="py-1.5 px-3">Input Arguments</th>
                          <th className="py-1.5 px-3">Expected Output</th>
                          <th className="py-1.5 px-3">Observed Output</th>
                          <th className="py-1.5 px-3">Latency</th>
                          <th className="py-1.5 px-3">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50 text-[11px]">
                        {activeRun.testResults.map((t) => (
                          <tr key={t.testIndex} className="hover:bg-surface-elevated/40">
                            <td className="py-1.5 px-3 text-text-tertiary">{t.testIndex + 1}</td>
                            <td className="py-1.5 px-3 font-mono text-text-secondary">{JSON.stringify(t.input)}</td>
                            <td className="py-1.5 px-3 font-mono text-text-secondary">{JSON.stringify(t.expectedOutput)}</td>
                            <td className="py-1.5 px-3 font-mono text-text-primary">{JSON.stringify(t.actualOutput) ?? '--'}</td>
                            <td className="py-1.5 px-3 text-text-tertiary">{t.executionTimeMs ? `${t.executionTimeMs.toFixed(1)}ms` : '--'}</td>
                            <td className="py-1.5 px-3">
                              <span className={`inline-flex items-center gap-1 font-semibold ${t.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {t.outcome}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 4: Diagnostics */}
              {(activeTab === 'diagnostics' || activeRun.compilerDiagnostics || activeRun.runtimeDiagnostics) && (
                <div className="p-3 rounded bg-rose-950/20 border border-rose-900/40 text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                    <Terminal className="w-4 h-4" /> {activeRun.compilerDiagnostics ? 'Real javac Compiler Diagnostics' : 'System & Runtime Diagnostics'}
                  </div>
                  <pre className="p-2.5 rounded bg-black/60 text-rose-200 text-[11px] overflow-x-auto whitespace-pre-wrap font-mono">
                    {activeRun.compilerDiagnostics || activeRun.runtimeDiagnostics || 'No diagnostics recorded'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
