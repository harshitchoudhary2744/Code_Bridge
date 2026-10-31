import React, { useState, useEffect } from 'react';
import { ModelMetadata } from '@transcode-lab/api-contracts';
import { StatusBadge } from '../components/StatusBadge';
import { apiClient } from '../api/client';
import { Cpu, ExternalLink, Activity, AlertCircle, RefreshCw } from 'lucide-react';

interface RegistryViewProps {
  models: ModelMetadata[];
  onRefreshModels: () => void;
}

export const RegistryView: React.FC<RegistryViewProps> = ({ models, onRefreshModels }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const checkHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const data = await apiClient.getHealth();
      setHealthData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-default overflow-hidden font-mono">
      {/* Registry Header */}
      <div className="h-14 border-b border-border-subtle bg-surface-base px-4 flex items-center justify-between select-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary">
              Model Registry & Checkpoint Provenance
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated font-mono text-text-secondary border border-border-subtle">
              Verified Seq2Seq Baseline
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            Architecture, parameter scale, licensing, tokenizer compatibility, and execution readiness
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { onRefreshModels(); checkHealth(); }}
            className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} /> Refresh Readiness
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Service Readiness Cards */}
        <div>
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-accent-subtle" /> Subsystem Readiness Status
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded bg-surface-base border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary font-semibold">Node.js API & SQLite</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {healthData?.checks?.database || 'ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] text-text-tertiary">Port 4000 • Job tracking, migrations, and SQLite WAL persistence</p>
            </div>

            <div className="p-3 rounded bg-surface-base border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary font-semibold">FastAPI Model Service</span>
                <span className={`px-2 py-0.5 rounded text-[10px] border ${healthData?.checks?.modelService === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {healthData?.checks?.modelService || 'INSPECTING'}
                </span>
              </div>
              <p className="text-[11px] text-text-tertiary">Port 8000 • PyTorch & Hugging Face independent adapters</p>
            </div>

            <div className="p-3 rounded bg-surface-base border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary font-semibold">Language Execution Runner</span>
                <span className={`px-2 py-0.5 rounded text-[10px] border ${healthData?.checks?.executionRunner === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {healthData?.checks?.executionRunner || 'RESTRICTED_LOCAL'}
                </span>
              </div>
              <p className="text-[11px] text-text-tertiary">Port 5000 • Python 3.11 AST & OpenJDK 25 (Java 17 target) javac/java</p>
            </div>
          </div>
        </div>

        {/* Models Matrix Table */}
        <div>
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-accent-subtle" /> Registered Encoder-Decoder Transformer Models ({models.length})
          </h3>

          <div className="space-y-3">
            {models.map((m) => (
              <div key={m.id} className="p-4 rounded bg-surface-base border border-border-subtle space-y-3">
                <div className="flex items-center justify-between border-b border-border-subtle/60 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-text-primary font-sans">{m.displayName}</h4>
                      <StatusBadge status={m.status} />
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border-subtle">
                        {m.fineTuningStatus}
                      </span>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      Publisher: <strong className="text-text-secondary">{m.publisher}</strong> • Architecture: {m.architecture} ({m.family})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {m.paperUrl && (
                      <a
                        href={m.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-text-secondary hover:text-text-primary flex items-center gap-1"
                      >
                        Paper <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {m.licenseUrl && (
                      <a
                        href={m.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-text-secondary hover:text-text-primary flex items-center gap-1"
                      >
                        License: {m.license} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Hugging Face Checkpoint</span>
                    <code className="text-text-primary font-semibold truncate block">{m.checkpoint}</code>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Immutable Revision</span>
                    <code className="text-text-secondary truncate block">{m.revision}</code>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Tokenizer Specification</span>
                    <code className="text-text-secondary truncate block">{m.tokenizerClass || m.tokenizer}</code>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Verified Parameters</span>
                    <span className="text-text-primary font-semibold">
                      {m.parameterCount ? `${(m.parameterCount / 1000000).toFixed(1)}M parameters` : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Disclosed Limitations */}
                {m.limitations && m.limitations.length > 0 && (
                  <div className="p-2.5 rounded bg-canvas-default border border-border-subtle/80 text-[11px] space-y-1">
                    <span className="text-text-tertiary uppercase text-[10px] font-bold block flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" /> Disclosed Operational Constraints & Pretraining Limitations:
                    </span>
                    <ul className="list-disc list-inside text-text-secondary space-y-0.5">
                      {m.limitations.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
