import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import CodeEditor from './components/CodeEditor';
import ValidationPanel from './components/ValidationPanel';
import StructurePanel from './components/StructurePanel';
import ExperimentMode from './components/ExperimentMode';
import CorrectionBadge from './components/CorrectionBadge';
import { SAMPLE_PROGRAMS } from './utils/samples';
import { checkHealth, translateCode, analyzeStructure } from './services/api';
import { ArrowRight, Play, AlertCircle, RefreshCw } from 'lucide-react';
import './App.css';

export default function App() {
  const [sourceLanguage, setSourceLanguage] = useState('python');
  const [targetLanguage, setTargetLanguage] = useState('java');
  const [sourceCode, setSourceCode] = useState(SAMPLE_PROGRAMS[0].python);
  const [translatedCode, setTranslatedCode] = useState('');
  const [structure, setStructure] = useState(['FUNCTION', 'PARAMETER', 'PARAMETER', 'RETURN']);
  const [validation, setValidation] = useState(null);
  const [correctionDetails, setCorrectionDetails] = useState(null);
  const [activeTests, setActiveTests] = useState(SAMPLE_PROGRAMS[0].tests);

  // Settings & Modes
  const [experimentMode, setExperimentMode] = useState('structural_validation');
  const [useStructure, setUseStructure] = useState(true);
  const [runValidation, setRunValidation] = useState(true);

  // Status & Loaders
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [modelType, setModelType] = useState('Salesforce/codet5-small');
  const [errorMessage, setErrorMessage] = useState(null);

  // Health check on mount
  useEffect(() => {
    async function verifyBackend() {
      const health = await checkHealth();
      setBackendStatus(health);
    }
    verifyBackend();
    const interval = setInterval(verifyBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  // Update structure analysis whenever source code or source language changes
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!sourceCode.trim()) {
        if (active) setStructure([]);
        return;
      }
      setIsAnalyzing(true);
      try {
        const res = await analyzeStructure({
          language: sourceLanguage,
          code: sourceCode
        });
        if (active && res.structure) {
          setStructure(res.structure);
        }
      } catch (err) {
        // Soft fail on typing syntax
      } finally {
        if (active) setIsAnalyzing(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sourceCode, sourceLanguage]);

  // Main Translation Trigger
  const handleTranslate = async () => {
    if (!sourceCode.trim()) {
      setErrorMessage('Please enter source code to translate.');
      return;
    }
    setErrorMessage(null);
    setIsTranslating(true);
    setValidation(null);
    setCorrectionDetails(null);

    try {
      const res = await translateCode({
        source_language: sourceLanguage,
        target_language: targetLanguage,
        code: sourceCode,
        use_structure: useStructure,
        run_validation: runValidation,
        tests: activeTests || [],
        experiment_mode: experimentMode
      });

      setTranslatedCode(res.translated_code);
      if (res.extracted_structure) {
        setStructure(res.extracted_structure);
      }
      if (res.validation) {
        setValidation(res.validation);
      }
      if (res.correction_attempted && res.correction_details) {
        setCorrectionDetails(res.correction_details);
      }
      if (res.model_type) {
        setModelType(res.model_type);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during translation.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Language Swap
  const handleSwap = () => {
    const prevSrc = sourceLanguage;
    const prevTgt = targetLanguage;
    const prevSrcCode = sourceCode;
    const prevTgtCode = translatedCode;

    setSourceLanguage(prevTgt);
    setTargetLanguage(prevSrc);

    // If target has code, flip editors
    if (prevTgtCode) {
      setSourceCode(prevTgtCode);
      setTranslatedCode(prevSrcCode);
    } else {
      // Find matching sample
      const sample = SAMPLE_PROGRAMS.find((p) => p.python === sourceCode || p.java === sourceCode);
      if (sample) {
        setSourceCode(prevTgt === 'python' ? sample.python : sample.java);
      }
    }
    setValidation(null);
    setCorrectionDetails(null);
  };

  // Load Example Program
  const handleLoadExample = (example) => {
    const code = sourceLanguage === 'python' ? example.python : example.java;
    setSourceCode(code);
    setActiveTests(example.tests || []);
    setTranslatedCode('');
    setValidation(null);
    setCorrectionDetails(null);
    setErrorMessage(null);
  };

  // Download translated file
  const handleDownload = () => {
    if (!translatedCode) return;
    const ext = targetLanguage === 'python' ? 'py' : 'java';
    const filename = targetLanguage === 'java' ? 'Solution.java' : 'solution.py';
    const blob = new Blob([translatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <Header
        backendStatus={backendStatus}
        modelType={modelType}
        isTranslating={isTranslating}
      />

      <main className="main-content">
        {/* Language Selection Bar */}
        <LanguageSelector
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onSourceChange={(val) => {
            setSourceLanguage(val);
            if (val === targetLanguage) {
              setTargetLanguage(val === 'python' ? 'java' : 'python');
            }
          }}
          onTargetChange={(val) => {
            setTargetLanguage(val);
            if (val === sourceLanguage) {
              setSourceLanguage(val === 'python' ? 'java' : 'python');
            }
          }}
          onSwap={handleSwap}
          disabled={isTranslating}
        />

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dual Editor Grid */}
        <div className="editors-workspace">
          {/* Source Code Panel */}
          <div className="editor-column">
            <CodeEditor
              title="SOURCE CODE"
              language={sourceLanguage}
              value={sourceCode}
              onChange={setSourceCode}
              readOnly={false}
              onClear={() => {
                setSourceCode('');
                setTranslatedCode('');
                setValidation(null);
                setCorrectionDetails(null);
              }}
              onLoadExample={handleLoadExample}
              examples={SAMPLE_PROGRAMS}
            />

            {/* Structure Analysis Collapsible Panel */}
            <StructurePanel
              structure={structure}
              isAnalyzing={isAnalyzing}
              language={sourceLanguage}
            />
          </div>

          {/* Target Code Panel */}
          <div className="editor-column">
            <CodeEditor
              title="TRANSLATED CODE"
              language={targetLanguage}
              value={translatedCode}
              readOnly={true}
              onDownload={handleDownload}
            />

            {/* Automatic Correction Loop Indicator */}
            {correctionDetails && (
              <CorrectionBadge
                correctionDetails={correctionDetails}
                validation={validation}
              />
            )}

            {/* Validation Report Panel */}
            <ValidationPanel
              validation={validation}
              targetLanguage={targetLanguage}
              isTranslating={isTranslating}
            />
          </div>
        </div>

        {/* Primary Action & Controls Bar */}
        <div className="action-bar">
          <div className="action-left">
            <button
              type="button"
              className={`translate-primary-btn ${isTranslating ? 'loading' : ''}`}
              onClick={handleTranslate}
              disabled={isTranslating || !sourceCode.trim()}
            >
              {isTranslating ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Translating & Validating...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="play-icon" />
                  <span>Translate Code</span>
                </>
              )}
            </button>

            <span className="pipeline-flow-hint">
              {sourceLanguage.toUpperCase()} <ArrowRight size={13} /> {targetLanguage.toUpperCase()}
              {useStructure && ' • AST Structure'}
              {runValidation && ' • Compiler Validation'}
            </span>
          </div>

          <div className="action-right">
            {activeTests && activeTests.length > 0 && (
              <div className="active-tests-counter">
                <span>Unit Tests Configured:</span>
                <span className="tests-count-pill">{activeTests.length} tests</span>
              </div>
            )}
          </div>
        </div>

        {/* Research Experiment Mode Selector */}
        <ExperimentMode
          mode={experimentMode}
          onModeChange={setExperimentMode}
          useStructure={useStructure}
          onStructureToggle={setUseStructure}
          runValidation={runValidation}
          onValidationToggle={setRunValidation}
        />
      </main>

      <footer className="footer">
        <p>
          CodeBridge • Research Investigation into Lightweight Structural AST and Post-Translation Compiler Validation • Salesforce/codet5-small
        </p>
      </footer>
    </div>
  );
}
