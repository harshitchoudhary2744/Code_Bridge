import React from 'react';
import { Layers, Activity, Download } from 'lucide-react';

interface HeaderProps {
  systemStatus: string;
  onExport?: (format: 'json' | 'csv') => void;
  activeJobId?: string | null;
}

export const Header: React.FC<HeaderProps> = ({ systemStatus, onExport, activeJobId }) => {
  return (
    <header className="h-12 border-b border-border-subtle bg-surface-base px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-primary flex items-center justify-center text-white">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-semibold text-text-primary text-sm tracking-tight font-sans">
            TransCode<span className="text-accent-primary">Lab</span>
          </span>
        </div>
        <span className="text-xs text-text-tertiary border-l border-border-subtle pl-3 font-mono">
          v2.0 • Multi-Model Seq2Seq Code Translation & Differential Verification
        </span>
      </div>

      <div className="flex items-center gap-3">
        {activeJobId && onExport && (
          <div className="flex items-center gap-1.5 mr-2">
            <button
              onClick={() => onExport('json')}
              className="px-2 py-1 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
              title="Export complete run snapshot as JSON"
            >
              <Download className="w-3 h-3" /> JSON
            </button>
            <button
              onClick={() => onExport('csv')}
              className="px-2 py-1 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
              title="Export comparison metrics as CSV"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle">
          <Activity className={`w-3.5 h-3.5 ${systemStatus === 'ready' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-xs font-mono text-text-secondary uppercase">
            Services: <strong className={systemStatus === 'ready' ? 'text-emerald-400' : 'text-amber-400'}>{systemStatus}</strong>
          </span>
        </div>
      </div>
    </header>
  );
};

