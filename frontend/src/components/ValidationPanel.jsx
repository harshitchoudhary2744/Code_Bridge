import React from 'react';
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle, ShieldCheck, TerminalSquare } from 'lucide-react';

export default function ValidationPanel({ validation, targetLanguage, isTranslating }) {
  if (isTranslating) {
    return (
      <div className="validation-panel loading">
        <div className="validation-header">
          <ShieldCheck size={16} />
          <span>Validating Target Code...</span>
        </div>
        <div className="validation-skeleton">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="validation-panel empty">
        <div className="validation-header">
          <ShieldCheck size={16} />
          <span>Validation Report</span>
        </div>
        <p className="empty-validation-msg">
          Validation results (Syntax analysis, Java compiler output, and execution tests) will appear here after translation.
        </p>
      </div>
    );
  }

  const { syntax, compilation, tests_passed, tests_total, status, message, error_details, test_details } = validation;
  const isJava = targetLanguage === 'java';
  const isPassed = status === 'valid';

  return (
    <div className={`validation-panel ${isPassed ? 'status-passed' : 'status-failed'}`}>
      <div className="validation-header">
        <div className="header-left">
          <ShieldCheck size={16} />
          <span>VALIDATION REPORT</span>
        </div>
        <div className={`status-badge ${isPassed ? 'badge-pass' : 'badge-fail'}`}>
          {isPassed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          <span>{isPassed ? 'OVERALL: VALID' : 'OVERALL: ATTENTION NEEDED'}</span>
        </div>
      </div>

      <div className="validation-grid">
        {/* Syntax Row */}
        <div className="validation-item">
          <span className="item-label">Syntax Analysis</span>
          <span className={`item-value ${syntax ? 'pass' : 'fail'}`}>
            {syntax ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {syntax ? 'PASS' : 'FAIL'}
          </span>
        </div>

        {/* Compilation Row (Relevant for Java) */}
        <div className="validation-item">
          <span className="item-label">{isJava ? 'JDK javac Compilation' : 'Python Bytecode Compiler'}</span>
          <span className={`item-value ${compilation ? 'pass' : 'fail'}`}>
            {compilation ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {compilation ? 'PASS' : 'FAIL'}
          </span>
        </div>

        {/* Tests Row */}
        <div className="validation-item">
          <span className="item-label">Execution Unit Tests</span>
          {tests_total > 0 ? (
            <span className={`item-value ${tests_passed === tests_total ? 'pass' : 'fail'}`}>
              {tests_passed === tests_total ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {`${tests_passed} / ${tests_total} PASS`}
            </span>
          ) : (
            <span className="item-value skipped">
              <MinusCircle size={14} />
              SKIPPED (None provided)
            </span>
          )}
        </div>
      </div>

      {/* Message & Compiler Error Details */}
      <div className="validation-message-box">
        <p className="validation-summary-text">{message}</p>
        {error_details && (
          <div className="error-details-container">
            <div className="error-title">
              <TerminalSquare size={13} /> Compiler / Execution Diagnostics:
            </div>
            <pre className="error-output">{error_details}</pre>
          </div>
        )}
      </div>

      {/* Test Case Details Breakdown if any */}
      {test_details && test_details.length > 0 && (
        <div className="test-breakdown">
          <div className="test-breakdown-title">Test Results:</div>
          <div className="test-cards-grid">
            {test_details.map((t, idx) => (
              <div key={idx} className={`test-card ${t.passed ? 'test-pass' : 'test-fail'}`}>
                <div className="test-card-header">
                  <span>Case #{idx + 1}: {t.function || 'function'}</span>
                  <span>{t.passed ? '✓ PASS' : '✕ FAIL'}</span>
                </div>
                <div className="test-card-body">
                  <div>Inputs: <code>{JSON.stringify(t.inputs)}</code></div>
                  <div>Expected: <code>{JSON.stringify(t.expected)}</code></div>
                  {t.actual !== undefined && <div>Actual: <code>{JSON.stringify(t.actual)}</code></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
