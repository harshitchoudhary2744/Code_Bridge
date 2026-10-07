import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronRight, Binary } from 'lucide-react';

export default function StructurePanel({ structure, isAnalyzing, language }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!structure || structure.length === 0) {
    return (
      <div className="structure-panel empty">
        <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="panel-header-title">
            <Layers size={14} className="icon" />
            <span>Structure Analysis (Tree-sitter)</span>
          </div>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        {isExpanded && (
          <div className="panel-body empty-text">
            {isAnalyzing ? (
              <span className="analyzing-text">Extracting structural tokens...</span>
            ) : (
              <span>Enter source code or translate to view extracted AST structure.</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="structure-panel">
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="panel-header-title">
          <Layers size={14} className="icon" />
          <span>Structure Analysis (Tree-sitter: {language.toUpperCase()})</span>
          <span className="badge">{structure.length} tokens</span>
        </div>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>

      {isExpanded && (
        <div className="panel-body">
          <div className="token-pills-container">
            {structure.map((token, index) => (
              <span key={index} className={`token-pill token-${token.toLowerCase()}`}>
                <Binary size={10} className="pill-icon" />
                {token}
              </span>
            ))}
          </div>
          <div className="structure-summary-text">
            <span className="summary-title">Model Prompt Context:</span>
            <pre className="compact-structure-dump">{structure.join('\n')}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
