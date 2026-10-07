import React from 'react';
import { ArrowLeftRight, Code2 } from 'lucide-react';

export default function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange,
  onSwap,
  disabled
}) {
  const languages = [
    { id: 'python', label: 'Python (3.x)' },
    { id: 'java', label: 'Java (JDK 17+)' }
  ];

  return (
    <div className="language-bar">
      <div className="selector-group">
        <label className="selector-label">
          <Code2 size={14} /> Source Language
        </label>
        <select
          value={sourceLanguage}
          onChange={(e) => onSourceChange(e.target.value)}
          disabled={disabled}
          className="lang-select"
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id} disabled={l.id === targetLanguage}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="swap-btn"
        onClick={onSwap}
        disabled={disabled}
        title="Swap Source and Target Languages"
      >
        <ArrowLeftRight size={16} />
      </button>

      <div className="selector-group">
        <label className="selector-label">
          <Code2 size={14} /> Target Language
        </label>
        <select
          value={targetLanguage}
          onChange={(e) => onTargetChange(e.target.value)}
          disabled={disabled}
          className="lang-select"
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id} disabled={l.id === sourceLanguage}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
