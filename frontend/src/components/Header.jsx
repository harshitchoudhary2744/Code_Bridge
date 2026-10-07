import React from 'react';
import { Terminal, Cpu, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Header({ backendStatus, modelType, isTranslating }) {
  const isConnected = backendStatus?.status === 'ok';

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-icon">
          <Terminal size={22} className="logo-svg" />
        </div>
        <div>
          <h1 className="app-title">CodeBridge</h1>
          <p className="app-subtitle">Automated Code Translation System • Encoder-Decoder Transformer</p>
        </div>
      </div>

      <div className="header-right">
        {/* Model status */}
        <div className="status-pill">
          <Cpu size={14} className="status-icon" />
          <span className="status-label">Model:</span>
          <span className="status-value">{modelType || 'Salesforce/codet5-small'}</span>
          <span className="status-dot ready" title="Model Loaded"></span>
        </div>

        {/* Backend status */}
        <div className={`status-pill ${isConnected ? 'connected' : 'offline'}`}>
          {isTranslating ? (
            <RefreshCw size={14} className="spin status-icon" />
          ) : isConnected ? (
            <CheckCircle2 size={14} className="status-icon success" />
          ) : (
            <AlertCircle size={14} className="status-icon warning" />
          )}
          <span className="status-label">Backend:</span>
          <span className="status-value">{isConnected ? 'Connected' : 'Offline'}</span>
          <span className={`status-dot ${isConnected ? 'ready' : 'error'}`}></span>
        </div>
      </div>
    </header>
  );
}
