import React from 'react';
import { ValidationStatus, ModelStatus } from '@transcode-lab/api-contracts';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, MinusCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ValidationStatus | ModelStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', showIcon = true }) => {
  let bg = 'bg-status-neutral/10 text-status-neutral border-status-neutral/30';
  let Icon = MinusCircle;
  let label = status;

  switch (status) {
    case 'PASSED_AVAILABLE_TESTS':
    case 'PASSED':
    case 'AVAILABLE':
      bg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      Icon = CheckCircle2;
      label = status === 'PASSED_AVAILABLE_TESTS' ? 'Passed Tests' : status;
      break;

    case 'PARTIAL_EVIDENCE':
      bg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      Icon = AlertTriangle;
      label = 'Partial Evidence';
      break;

    case 'COMPILE_FAILED':
      bg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      Icon = XCircle;
      label = 'Compilation Failed';
      break;

    case 'SYNTAX_FAILED':
      bg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      Icon = XCircle;
      label = 'Syntax Error';
      break;

    case 'EXECUTION_FAILED':
    case 'FAILED_BEHAVIORAL_TESTS':
    case 'CRASHED':
    case 'FAILED':
      bg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      Icon = XCircle;
      label = status === 'FAILED_BEHAVIORAL_TESTS' ? 'Behavior Diverged' : 'Failed';
      break;

    case 'SOURCE_BASELINE_FAILED':
      bg = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      Icon = AlertCircle;
      label = 'Source Baseline Error';
      break;

    case 'GENERATING':
    case 'VALIDATING':
    case 'RUNNING':
      bg = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      Icon = Loader2;
      label = status;
      break;

    case 'DOWNLOAD_REQUIRED':
      bg = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      Icon = AlertCircle;
      label = 'Download Required';
      break;

    case 'INCOMPATIBLE':
      bg = 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      Icon = MinusCircle;
      label = 'Incompatible';
      break;

    case 'PLANNED':
      bg = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      Icon = MinusCircle;
      label = 'Planned';
      break;

    case 'MODEL_UNAVAILABLE':
      bg = 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      Icon = AlertCircle;
      label = 'Model Unavailable';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium border ${bg} ${className}`}
    >
      {showIcon && <Icon className={`w-3.5 h-3.5 ${['GENERATING', 'VALIDATING', 'RUNNING'].includes(status) ? 'animate-spin' : ''}`} />}
      <span>{label}</span>
    </span>
  );
};

