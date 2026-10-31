import React, { useState, useEffect } from 'react';
import { ModelRunDetail, RepairResponse, ModelMetadata } from '@transcode-lab/api-contracts';
import { StatusBadge } from '../components/StatusBadge';
import { DiffViewer } from '../components/DiffViewer';
import { apiClient } from '../api/client';
import { Wrench, RotateCcw, AlertTriangle } from 'lucide-react';

interface RepairViewProps {
  initialRun: ModelRunDetail | null;
  availableModels: ModelMetadata[];
}

export const RepairView: React.FC<RepairViewProps> = ({ initialRun, availableModels }) => {
  const [activeRun, setActiveRun] = useState<ModelRunDetail | null>(initialRun);
  const [repairModelId, setRepairModelId] = useState<string>(initialRun?.modelId || availableModels[0]?.id || '');
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairResult, setRepairResult] = useState<RepairResponse | null>(null);
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number>(0);

  useEffect(() => {
    if (initialRun) {
      setActiveRun(initialRun);
      if (initialRun.modelId) {
        setRepairModelId(initialRun.modelId);
      }
    }
  }, [initialRun]);

  const startRepairLoop = async () => {
    if (!activeRun) return;
    setIsRepairing(true);
    setRepairResult(null);

    try {
      const res = await apiClient.runRepair({
        jobId: activeRun.jobId,
        modelRunId: activeRun.id,
        repairModelId: repairModelId || activeRun.modelId,
        maxAttempts,
      });
      setRepairResult(res);
      setSelectedAttemptIndex(res.attempts.length - 1);
    } catch (err: any) {
      alert(`Repair experiment failed: ${err.message}`);
    } finally {
      setIsRepairing(false);
    }
  };

  if (!activeRun) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-canvas-default text-text-tertiary p-8 font-mono text-xs">
        <Wrench className="w-8 h-8 text-border-strong mb-2" />
        <p className="text-sm font-sans font-medium text-text-secondary">No Model Run Selected for Repair</p>
        <p className="mt-1">Go to Results & Diff, select a failed or partial model run, and click "Launch Repair Experiment".</p>
      </div>
    );
  }

  const selectedAttempt = repairResult?.attempts[selectedAttemptIndex];

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-default overflow-hidden font-mono">
      {/* Repair Header */}
      <div className="h-14 border-b border-border-subtle bg-surface-base px-4 flex items-center justify-between select-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary">
              Repair Experiment Lab • <span className="text-accent-primary">{activeRun.modelMetadataSnapshot.displayName}</span>
            </span>
            <StatusBadge status={activeRun.status} />
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            Diagnostic-guided bounded retries with real compiler & counterexample feedback
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-tertiary">Repair Model:</span>
            <select
              value={repairModelId}
              onChange={(e) => setRepairModelId(e.target.value)}
              className="bg-surface-elevated border border-border-subtle rounded text-xs px-2 py-1 text-text-primary outline-none focus:border-accent-primary"
            >
              {availableModels
                .filter((m) => m.status === 'AVAILABLE')
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-text-tertiary">Max Retries:</span>
            <input
              type="number"
              min={1}
              max={5}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 3)}
              className="w-12 bg-surface-elevated border border-border-subtle rounded px-2 py-1 text-xs text-text-primary text-center outline-none focus:border-accent-primary"
            />
          </div>

          <button
            onClick={startRepairLoop}
            disabled={isRepairing}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold text-xs rounded border border-amber-400 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
            {isRepairing ? 'Executing Retries...' : 'Run Repair Loop'}
          </button>
        </div>
      </div>

      {/* Main Repair Workspace */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left: Original vs Repaired Summary (4 Cols) */}
        <div className="col-span-4 border-r border-border-subtle bg-surface-base p-4 overflow-y-auto space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-bold">
              Baseline vs Repaired Status
            </div>

            <div className="p-3 rounded bg-surface-elevated border border-border-subtle space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">Initial First-Pass:</span>
                <StatusBadge status={activeRun.status} />
              </div>
              {repairResult && (
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <span className="text-text-tertiary">Post-Repair Status:</span>
                  <StatusBadge status={repairResult.finalStatus} />
                </div>
              )}
            </div>
          </div>

          {/* Failure Evidence Fed to Repair Model */}
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Diagnostic Feedback Evidence
            </div>
            <div className="p-3 rounded bg-canvas-default border border-border-subtle text-[11px] space-y-2">
              {activeRun.compilerDiagnostics ? (
                <div>
                  <span className="text-rose-400 block font-semibold">Compiler Diagnostics:</span>
                  <pre className="text-text-secondary mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {activeRun.compilerDiagnostics}
                  </pre>
                </div>
              ) : activeRun.runtimeDiagnostics ? (
                <div>
                  <span className="text-amber-400 block font-semibold">Runtime Diagnostics:</span>
                  <pre className="text-text-secondary mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {activeRun.runtimeDiagnostics}
                  </pre>
                </div>
              ) : (
                <div className="text-text-tertiary">No compiler error recorded; failing test counterexamples will guide repair.</div>
              )}
            </div>
          </div>

          {/* Attempts Selector if result present */}
          {repairResult && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-bold">
                Repair Attempts ({repairResult.attempts.length})
              </div>
              <div className="space-y-1.5">
                {repairResult.attempts.map((att, idx) => (
                  <div
                    key={att.id}
                    onClick={() => setSelectedAttemptIndex(idx)}
                    className={`p-2 rounded border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      selectedAttemptIndex === idx
                        ? 'bg-surface-elevated border-accent-primary text-text-primary'
                        : 'bg-canvas-default border-border-subtle text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    <span>Attempt #{att.attemptNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-tertiary">{att.durationMs ? `${att.durationMs}ms` : ''}</span>
                      <StatusBadge status={att.status} showIcon={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Code Diff & Attempt Details (8 Cols) */}
        <div className="col-span-8 flex flex-col bg-surface-base p-4 overflow-y-auto space-y-4">
          {selectedAttempt ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-text-primary">
                    Attempt #{selectedAttempt.attemptNumber} Evaluation
                  </h4>
                  <p className="text-xs text-text-tertiary">
                    Generated by <strong className="text-text-secondary">{selectedAttempt.repairModelId}</strong> in {selectedAttempt.durationMs}ms
                  </p>
                </div>
                <StatusBadge status={selectedAttempt.status} />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-text-tertiary">Diff: Original vs Attempt #{selectedAttempt.attemptNumber}</span>
                <DiffViewer
                  originalCode={activeRun.candidateCode || ''}
                  candidateCode={selectedAttempt.generatedCode}
                  originalLabel="Initial Candidate"
                  candidateLabel={`Attempt #${selectedAttempt.attemptNumber} Output`}
                />
              </div>

              {/* Feedback Prompt Used */}
              <div className="p-3 rounded bg-canvas-default border border-border-subtle text-xs space-y-1">
                <span className="text-text-tertiary block text-[10px] uppercase font-bold">Structured Feedback Payload Provided to Model:</span>
                <pre className="text-text-secondary text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto font-mono">
                  {selectedAttempt.feedbackPayload}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary text-xs">
              <RotateCcw className="w-8 h-8 text-border-strong mb-2" />
              <p className="text-sm font-sans font-medium text-text-secondary">Ready to Start Repair</p>
              <p className="mt-1">Click "Run Repair Loop" to test if compiler diagnostics and counterexamples enable the model to self-correct.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
