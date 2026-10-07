import React from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check, Trash2, Download, Code, Sparkles } from 'lucide-react';

export default function CodeEditor({
  title,
  language,
  value,
  onChange,
  readOnly = false,
  onClear,
  onLoadExample,
  onDownload,
  examples = [],
  placeholder = ''
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const lineCount = (value || '').split('\n').length;

  return (
    <div className={`editor-container ${readOnly ? 'target-editor' : 'source-editor'}`}>
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <Code size={14} className="toolbar-icon" />
          <span className="toolbar-title">{title}</span>
          <span className="editor-lang-tag">{language.toUpperCase()}</span>
          {value && <span className="line-count-tag">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>}
        </div>

        <div className="toolbar-right">
          {!readOnly && examples.length > 0 && (
            <div className="examples-dropdown-wrapper">
              <select
                className="example-select"
                onChange={(e) => {
                  const selected = examples.find((ex) => ex.id === e.target.value);
                  if (selected) onLoadExample(selected);
                  e.target.value = '';
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Load Example ▾
                </option>
                {examples.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!readOnly && onClear && (
            <button
              type="button"
              className="toolbar-btn"
              onClick={onClear}
              title="Clear editor"
              disabled={!value}
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}

          <button
            type="button"
            className="toolbar-btn"
            onClick={handleCopy}
            title="Copy code to clipboard"
            disabled={!value}
          >
            {copied ? <Check size={13} className="success" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {readOnly && onDownload && (
            <button
              type="button"
              className="toolbar-btn"
              onClick={onDownload}
              title={`Download .${language === 'python' ? 'py' : 'java'}`}
              disabled={!value}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      <div className="monaco-editor-frame">
        <Editor
          height="340px"
          language={language === 'python' ? 'python' : 'java'}
          value={value}
          onChange={readOnly ? undefined : onChange}
          theme="vs-dark"
          options={{
            readOnly: readOnly,
            fontSize: 13,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 4,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            padding: { top: 10, bottom: 10 }
          }}
          loading={<div className="editor-loading">Loading Monaco Editor...</div>}
        />

        {readOnly && !value && (
          <div className="editor-empty-overlay">
            <Sparkles size={24} className="sparkle-icon" />
            <p className="empty-title">Your translated code will appear here.</p>
            <p className="empty-sub">
              Paste or load a {language === 'python' ? 'Java' : 'Python'} function on the left and click Translate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
