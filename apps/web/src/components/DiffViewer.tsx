import React from 'react';

interface DiffViewerProps {
  originalCode: string;
  candidateCode: string;
  originalLabel?: string;
  candidateLabel?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalCode,
  candidateCode,
  originalLabel = 'Reference / Source',
  candidateLabel = 'Generated Candidate'
}) => {
  const origLines = originalCode.split('\n');
  const candLines = candidateCode.split('\n');
  const maxLines = Math.max(origLines.length, candLines.length);

  return (
    <div className="border border-border-subtle rounded overflow-hidden bg-surface-base font-mono text-xs">
      <div className="grid grid-cols-2 bg-canvas-default border-b border-border-subtle text-[11px] font-medium text-text-secondary">
        <div className="px-3 py-1.5 border-r border-border-subtle">{originalLabel}</div>
        <div className="px-3 py-1.5">{candidateLabel}</div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {Array.from({ length: maxLines }).map((_, i) => {
          const l1 = origLines[i] ?? '';
          const l2 = candLines[i] ?? '';
          const isSame = l1 === l2;

          return (
            <div key={i} className="grid grid-cols-2 hover:bg-surface-elevated/40 border-b border-border-subtle/30 text-[11px] leading-relaxed">
              <div className={`px-3 py-0.5 border-r border-border-subtle truncate flex gap-2 ${!isSame && l1 ? 'bg-rose-500/10 text-rose-300' : 'text-text-secondary'}`}>
                <span className="text-text-tertiary select-none w-5 text-right">{i + 1}</span>
                <span className="truncate">{l1 || ' '}</span>
              </div>
              <div className={`px-3 py-0.5 truncate flex gap-2 ${!isSame && l2 ? 'bg-emerald-500/10 text-emerald-300' : 'text-text-primary'}`}>
                <span className="text-text-tertiary select-none w-5 text-right">{i + 1}</span>
                <span className="truncate">{l2 || ' '}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

