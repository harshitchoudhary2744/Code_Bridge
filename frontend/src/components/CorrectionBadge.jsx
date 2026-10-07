import React from 'react';
import { Wrench, CheckCircle2, AlertOctagon } from 'lucide-react';

export default function CorrectionBadge({ correctionDetails, validation }) {
  if (!correctionDetails) return null;

  const isPassed = validation?.status === 'valid' || correctionDetails.status === 'PASSED';

  return (
    <div className={`correction-box ${isPassed ? 'corr-pass' : 'corr-fail'}`}>
      <div className="correction-header">
        <div className="corr-title">
          <Wrench size={15} />
          <span>Automatic One-Shot Correction Loop</span>
        </div>
        <span className={`corr-status-badge ${isPassed ? 'status-pass' : 'status-fail'}`}>
          {isPassed ? <CheckCircle2 size={13} /> : <AlertOctagon size={13} />}
          {isPassed ? 'CORRECTION SUCCEEDED' : 'CORRECTION ATTEMPT FAILED'}
        </span>
      </div>

      <div className="correction-stats-row">
        <div className="stat-item">
          <span className="stat-label">Initial Validation:</span>
          <span className="stat-val failed">FAILED</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Correction Attempts:</span>
          <span className="stat-val">1 of 1 max</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Final Status:</span>
          <span className={`stat-val ${isPassed ? 'passed' : 'failed'}`}>
            {isPassed ? 'PASSED (Valid)' : 'FAILED (Needs Inspection)'}
          </span>
        </div>
      </div>

      {correctionDetails.initial_error && (
        <div className="initial-error-note">
          <span className="note-title">Trigger Error:</span>
          <code className="note-code">{correctionDetails.initial_error.split('\n')[0]}</code>
        </div>
      )}
    </div>
  );
}
