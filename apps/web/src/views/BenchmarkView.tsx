import React, { useState, useEffect } from 'react';
import { BenchmarkManifest, BenchmarkRunResponse, ModelMetadata, SupportedLanguage } from '@transcode-lab/api-contracts';
import { apiClient } from '../api/client';
import { FlaskConical, Play, Download, Info } from 'lucide-react';

interface BenchmarkViewProps {
  availableModels: ModelMetadata[];
}

export const BenchmarkView: React.FC<BenchmarkViewProps> = ({ availableModels }) => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkManifest[]>([]);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('transcode-lab-curated-v1');
  const [sourceLanguage, setSourceLanguage] = useState<SupportedLanguage>('python');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('java');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([
    'salesforce-codet5-small',
    'uclanlp-plbart-base'
  ]);
  const [limitProblems, setLimitProblems] = useState<number>(4);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeRunResult, setActiveRunResult] = useState<BenchmarkRunResponse | null>(null);

  useEffect(() => {
    apiClient.getBenchmarks().then(setBenchmarks).catch(console.error);
  }, []);

  const handleRun = async () => {
    if (selectedModelIds.length === 0) {
      alert('Select at least one model for benchmark evaluation.');
      return;
    }
    setIsRunning(true);
    try {
      const res = await apiClient.runBenchmark({
        benchmarkId: selectedBenchmarkId,
        sourceLanguage,
        targetLanguage,
        modelIds: selectedModelIds,
        limitProblems,
        runRepair: false,
        generation: {
          maxNewTokens: 128,
          numBeams: 1,
          temperature: 0.2,
          topP: 0.95,
          doSample: false,
        },
      });
      setActiveRunResult(res);
    } catch (err: any) {
      alert(`Benchmark execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportCsv = () => {
    if (!activeRunResult) return;
    const headers = ['model_id', 'total_problems', 'syntax_rate', 'compile_rate', 'behavioral_rate', 'median_latency_ms', 'p95_latency_ms'];
    const rows = activeRunResult.modelSummaries.map((m) => [
      m.modelId,
      m.totalProblems,
      m.syntaxPassRate,
      m.compilePassRate,
      m.firstPassBehavioralRate,
      m.medianLatencyMs,
      m.p95LatencyMs,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark_${activeRunResult.id}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-default overflow-hidden font-mono">
      {/* Benchmark Header */}
      <div className="h-14 border-b border-border-subtle bg-surface-base px-4 flex items-center justify-between select-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary">
              Benchmark Lab • Held-Out Empirical Evaluation
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated font-mono text-text-secondary border border-border-subtle">
              Zero-Fabrication Rigor
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            Evaluate multiple encoder-decoder checkpoints under strictly identical problems, fixtures, and execution conditions
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeRunResult && (
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Benchmark CSV
            </button>
          )}

          <button
            onClick={handleRun}
            disabled={isRunning || selectedModelIds.length === 0}
            className="px-4 py-1.5 bg-accent-primary hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded border border-accent-primary flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Evaluating Held-Out Test Set...' : 'Run Benchmark Evaluation'}
          </button>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="border-b border-border-subtle bg-surface-elevated px-4 py-3 grid grid-cols-12 gap-4 text-xs">
        <div className="col-span-3">
          <label className="text-[10px] text-text-tertiary uppercase block font-semibold mb-1">Benchmark Suite</label>
          <select
            value={selectedBenchmarkId}
            onChange={(e) => setSelectedBenchmarkId(e.target.value)}
            className="w-full bg-canvas-default border border-border-subtle rounded px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent-primary"
          >
            {benchmarks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-3">
          <label className="text-[10px] text-text-tertiary uppercase block font-semibold mb-1">Language Direction</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSourceLanguage('python'); setTargetLanguage('java'); }}
              className={`px-2.5 py-1 rounded text-xs border ${sourceLanguage === 'python' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-canvas-default text-text-secondary border-border-subtle'}`}
            >
              Python → Java
            </button>
            <button
              type="button"
              onClick={() => { setSourceLanguage('java'); setTargetLanguage('python'); }}
              className={`px-2.5 py-1 rounded text-xs border ${sourceLanguage === 'java' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-canvas-default text-text-secondary border-border-subtle'}`}
            >
              Java → Python
            </button>
          </div>
        </div>

        <div className="col-span-4">
          <label className="text-[10px] text-text-tertiary uppercase block font-semibold mb-1">Models Under Test</label>
          <div className="flex flex-wrap gap-2">
            {availableModels
              .filter((m) => m.status === 'AVAILABLE')
              .map((m) => {
                const isSelected = selectedModelIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      setSelectedModelIds((prev) =>
                        isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                      )
                    }
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      isSelected
                        ? 'bg-accent-muted border-accent-primary text-accent-subtle font-medium'
                        : 'bg-canvas-default border-border-subtle text-text-tertiary hover:border-border-strong'
                    }`}
                  >
                    {m.displayName}
                  </button>
                );
              })}
          </div>
        </div>

        <div className="col-span-2">
          <label className="text-[10px] text-text-tertiary uppercase block font-semibold mb-1">Problem Limit</label>
          <input
            type="number"
            min={1}
            max={20}
            value={limitProblems}
            onChange={(e) => setLimitProblems(parseInt(e.target.value, 10) || 4)}
            className="w-full bg-canvas-default border border-border-subtle rounded px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent-primary"
          />
        </div>
      </div>

      {/* Main Results / Table Deck */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Anti-Mislabeling & Scientific Transparency Notice */}
        <div className="p-3 rounded bg-blue-950/20 border border-blue-900/40 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-accent-subtle shrink-0 mt-0.5" />
          <div className="text-[11px] text-text-secondary space-y-1">
            <strong className="text-text-primary">Research Audit & Anti-Mislabeling Notice:</strong>
            <p>
              TransCode Lab strictly audits dataset provenance. The official Microsoft CodeXGLUE code-to-code translation task evaluates <em>Java ↔ C#</em>, not Python ↔ Java. Mislabeling it has been explicitly prevented.
              Furthermore, finite unit tests provide operational evidence of behavior, not a mathematical proof of equivalence across arbitrary inputs.
            </p>
          </div>
        </div>

        {activeRunResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary font-sans">
                Evaluation Metric Summary (Run {activeRunResult.id.slice(0, 8)})
              </h3>
              <span className="text-xs text-text-tertiary">
                Direction: {activeRunResult.sourceLanguage.toUpperCase()} → {activeRunResult.targetLanguage.toUpperCase()}
              </span>
            </div>

            {/* Metrics Table */}
            <div className="border border-border-subtle rounded overflow-hidden bg-surface-base">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-canvas-default text-text-secondary text-[11px] border-b border-border-subtle">
                  <tr>
                    <th className="py-2 px-3">Model</th>
                    <th className="py-2 px-3">Problems Evaluated</th>
                    <th className="py-2 px-3">Syntax Pass %</th>
                    <th className="py-2 px-3">Compilation Pass %</th>
                    <th className="py-2 px-3">Behavioral Pass %</th>
                    <th className="py-2 px-3">Median Latency</th>
                    <th className="py-2 px-3">p95 Latency</th>
                    <th className="py-2 px-3">Primary Failure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 text-[11px]">
                  {activeRunResult.modelSummaries.map((m) => {
                    const failEntries = Object.entries(m.failureBreakdown);
                    const topFailure = failEntries.length > 0 ? failEntries[0][0] : 'None';

                    return (
                      <tr key={m.modelId} className="hover:bg-surface-elevated/40">
                        <td className="py-2 px-3 font-semibold text-text-primary">{m.displayName}</td>
                        <td className="py-2 px-3 text-text-secondary">{m.totalProblems}</td>
                        <td className="py-2 px-3">
                          <span className={m.syntaxPassRate > 0.5 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {(m.syntaxPassRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={m.compilePassRate > 0.5 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                            {(m.compilePassRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={m.firstPassBehavioralRate > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                            {(m.firstPassBehavioralRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-text-tertiary">{m.medianLatencyMs}ms</td>
                        <td className="py-2 px-3 text-text-tertiary">{m.p95LatencyMs}ms</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border-subtle text-[10px]">
                            {topFailure}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-text-tertiary text-xs">
            <FlaskConical className="w-8 h-8 text-border-strong mb-2" />
            <p className="text-sm font-sans font-medium text-text-secondary">Ready to Execute Benchmark Suite</p>
            <p className="mt-1">Configure models and problem counts above, then click "Run Benchmark Evaluation".</p>
          </div>
        )}
      </div>
    </div>
  );
};
