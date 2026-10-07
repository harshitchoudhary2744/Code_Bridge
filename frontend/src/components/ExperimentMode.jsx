import React, { useState } from 'react';
import { FlaskConical, ChevronDown, ChevronRight, Info } from 'lucide-react';

export default function ExperimentMode({
  mode,
  onModeChange,
  useStructure,
  onStructureToggle,
  runValidation,
  onValidationToggle
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const modes = [
    {
      id: 'baseline',
      name: 'Baseline Mode',
      formula: 'Code → Transformer → Target Code',
      desc: 'Raw sequence-to-sequence translation without architectural AST structural hints.'
    },
    {
      id: 'structural',
      name: 'Structural Mode',
      formula: 'Code + Tree-sitter AST → Transformer → Target Code',
      desc: 'Supplies high-level structural category tokens alongside source code to guide code generation.'
    },
    {
      id: 'structural_validation',
      name: 'Structural + Validation Mode',
      formula: 'Code + Structure → Transformer → Compiler Validation (javac/ast)',
      desc: 'Proposed pipeline: Structural translation followed by automated syntax/compilation checking and one-shot correction.'
    }
  ];

  const handleModeSelect = (newMode) => {
    onModeChange(newMode);
    if (newMode === 'baseline') {
      onStructureToggle(false);
      onValidationToggle(false);
    } else if (newMode === 'structural') {
      onStructureToggle(true);
      onValidationToggle(false);
    } else if (newMode === 'structural_validation') {
      onStructureToggle(true);
      onValidationToggle(true);
    }
  };

  return (
    <div className="experiment-card">
      <div className="experiment-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-title">
          <FlaskConical size={15} className="exp-icon" />
          <span>Research Experiment Mode</span>
        </div>
        <div className="header-meta">
          <span className="active-mode-tag">
            {modes.find((m) => m.id === mode)?.name || 'Structural + Validation'}
          </span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="experiment-body">
          <div className="mode-options">
            {modes.map((m) => (
              <label
                key={m.id}
                className={`mode-radio-label ${mode === m.id ? 'active' : ''}`}
                onClick={() => handleModeSelect(m.id)}
              >
                <input
                  type="radio"
                  name="experimentMode"
                  value={m.id}
                  checked={mode === m.id}
                  onChange={() => handleModeSelect(m.id)}
                />
                <div className="mode-info">
                  <div className="mode-name-row">
                    <span className="mode-title">{m.name}</span>
                    <span className="mode-formula">{m.formula}</span>
                  </div>
                  <p className="mode-desc">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="custom-toggles-row">
            <span className="toggles-label">Fine-Grained Controls:</span>
            <label className="checkbox-toggle">
              <input
                type="checkbox"
                checked={useStructure}
                onChange={(e) => onStructureToggle(e.target.checked)}
              />
              <span>Use Tree-sitter Structure</span>
            </label>

            <label className="checkbox-toggle">
              <input
                type="checkbox"
                checked={runValidation}
                onChange={(e) => onValidationToggle(e.target.checked)}
              />
              <span>Validate with javac/Python</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
