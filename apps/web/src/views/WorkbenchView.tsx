import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { ModelMetadata, SupportedLanguage, TestCase, GenerationConfig } from '@transcode-lab/api-contracts';
import { StatusBadge } from '../components/StatusBadge';
import { Play, Plus, Trash2, Sliders, AlertCircle } from 'lucide-react';

interface WorkbenchViewProps {
  models: ModelMetadata[];
  isSubmitting: boolean;
  onSubmit: (data: {
    sourceLanguage: SupportedLanguage;
    sourceVersion: string;
    targetLanguage: SupportedLanguage;
    targetVersion: string;
    sourceCode: string;
    entryPoint: { kind: 'function' | 'method'; name: string };
    tests: TestCase[];
    modelIds: string[];
    generation: GenerationConfig;
  }) => void;
}

const SAMPLE_PROBLEMS = [
  {
    name: 'Add Two Numbers (Arithmetic)',
    lang: 'python',
    entry: 'add',
    code: `def add(a: int, b: int) -> int:
    return a + b
`,
    tests: [
      { input: [2, 3], expectedOutput: 5, description: 'Positive integers' },
      { input: [-5, 10], expectedOutput: 5, description: 'Negative operand' },
      { input: [0, 0], expectedOutput: 0, description: 'Zeros' }
    ]
  },
  {
    name: 'Factorial (Recursion / Loop)',
    lang: 'python',
    entry: 'factorial',
    code: `def factorial(n: int) -> int:
    if n <= 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
`,
    tests: [
      { input: [0], expectedOutput: 1, description: 'Boundary n=0' },
      { input: [1], expectedOutput: 1, description: 'Boundary n=1' },
      { input: [5], expectedOutput: 120, description: 'n=5' },
      { input: [6], expectedOutput: 720, description: 'n=6' }
    ]
  },
  {
    name: 'Integer Division Edge Case',
    lang: 'python',
    entry: 'truncateDivide',
    code: `def truncateDivide(a: int, b: int) -> int:
    # Explicit truncate towards zero to match Java behavior
    return int(a / b)
`,
    tests: [
      { input: [7, 3], expectedOutput: 2, description: 'Positive division' },
      { input: [-7, 3], expectedOutput: -2, description: 'Truncate negative' },
      { input: [7, -3], expectedOutput: -2, description: 'Negative divisor' }
    ]
  },
  {
    name: 'Reverse String',
    lang: 'python',
    entry: 'reverseString',
    code: `def reverseString(s: str) -> str:
    return s[::-1]
`,
    tests: [
      { input: ['hello'], expectedOutput: 'olleh', description: 'ASCII word' },
      { input: [''], expectedOutput: '', description: 'Empty string boundary' },
      { input: ['racecar'], expectedOutput: 'racecar', description: 'Palindrome' }
    ]
  },
  {
    name: 'Java to Python: Add Method',
    lang: 'java',
    entry: 'add',
    code: `public class Solution {
    public static int add(int a, int b) {
        return a + b;
    }
}
`,
    tests: [
      { input: [10, 20], expectedOutput: 30, description: 'Java add' },
      { input: [-5, 5], expectedOutput: 0, description: 'Zero sum' }
    ]
  }
];

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({ models, isSubmitting, onSubmit }) => {
  const [sourceLanguage, setSourceLanguage] = useState<SupportedLanguage>('python');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('java');
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_PROBLEMS[0].code);
  const [entryPointName, setEntryPointName] = useState<string>(SAMPLE_PROBLEMS[0].entry);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([
    'salesforce-codet5-finetuned',
    'salesforce-codet5-small'
  ]);
  const [tests, setTests] = useState<TestCase[]>(SAMPLE_PROBLEMS[0].tests);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<GenerationConfig>({
    maxNewTokens: 128,
    numBeams: 1,
    temperature: 0.2,
    topP: 0.95,
    doSample: false,
    seed: 42
  });

  const handleLanguageSwitch = (src: SupportedLanguage) => {
    setSourceLanguage(src);
    setTargetLanguage(src === 'python' ? 'java' : 'python');
  };

  const loadSample = (sample: typeof SAMPLE_PROBLEMS[0]) => {
    setSourceLanguage(sample.lang as SupportedLanguage);
    setTargetLanguage(sample.lang === 'python' ? 'java' : 'python');
    setSourceCode(sample.code);
    setEntryPointName(sample.entry);
    setTests(sample.tests);
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const addTest = () => {
    setTests([...tests, { input: [0], expectedOutput: 0, description: `Test #${tests.length + 1}` }]);
  };

  const updateTestInput = (index: number, valStr: string) => {
    try {
      const parsed = JSON.parse(valStr);
      const updated = [...tests];
      updated[index].input = Array.isArray(parsed) ? parsed : [parsed];
      setTests(updated);
    } catch (e) {
      // Ignored during user typing
    }
  };

  const updateTestOutput = (index: number, valStr: string) => {
    try {
      const parsed = JSON.parse(valStr);
      const updated = [...tests];
      updated[index].expectedOutput = parsed;
      setTests(updated);
    } catch (e) {
      // Ignored during typing
    }
  };

  const removeTest = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedModelIds.length === 0) {
      alert('Select at least one model for comparison.');
      return;
    }
    onSubmit({
      sourceLanguage,
      sourceVersion: sourceLanguage === 'python' ? '3.11' : '17',
      targetLanguage,
      targetVersion: targetLanguage === 'java' ? '17' : '3.11',
      sourceCode,
      entryPoint: { kind: 'function', name: entryPointName },
      tests,
      modelIds: selectedModelIds,
      generation: generationConfig,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-default overflow-hidden">
      {/* Workbench Toolbar */}
      <div className="h-12 border-b border-border-subtle bg-surface-base px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-elevated rounded border border-border-subtle p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleLanguageSwitch('python')}
              className={`px-3 py-1 rounded transition-colors ${sourceLanguage === 'python' ? 'bg-accent-primary text-white font-medium' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Python 3.11 → Java 17
            </button>
            <button
              type="button"
              onClick={() => handleLanguageSwitch('java')}
              className={`px-3 py-1 rounded transition-colors ${sourceLanguage === 'java' ? 'bg-accent-primary text-white font-medium' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Java 17 → Python 3.11
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary font-mono">Preset:</span>
            <select
              className="bg-surface-elevated border border-border-subtle rounded text-xs px-2 py-1 text-text-primary focus:outline-none focus:border-accent-primary font-mono"
              onChange={(e) => {
                const sample = SAMPLE_PROBLEMS.find((s) => s.name === e.target.value);
                if (sample) loadSample(sample);
              }}
            >
              {SAMPLE_PROBLEMS.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-2.5 py-1 rounded text-xs font-mono border flex items-center gap-1.5 transition-colors ${showAdvanced ? 'bg-accent-muted border-accent-primary text-accent-subtle' : 'bg-surface-elevated border-border-subtle text-text-secondary hover:text-text-primary'}`}
          >
            <Sliders className="w-3.5 h-3.5" /> Decoding Options
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedModelIds.length === 0}
            className="px-4 py-1.5 bg-accent-primary hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded border border-accent-primary flex items-center gap-2 shadow-sm transition-all"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isSubmitting ? 'animate-spin' : ''}`} />
            {isSubmitting ? 'Comparing Models...' : 'Translate & Compare'}
          </button>
        </div>
      </div>

      {/* Main Workbench Grid */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left: Editor & Entry Point (7 Cols) */}
        <div className="col-span-7 flex flex-col border-r border-border-subtle bg-surface-base overflow-hidden">
          <div className="h-8 bg-surface-elevated border-b border-border-subtle px-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-text-secondary">
              <span>Source ({sourceLanguage.toUpperCase()})</span>
              <span className="text-text-tertiary">• Entry Function:</span>
              <input
                type="text"
                value={entryPointName}
                onChange={(e) => setEntryPointName(e.target.value)}
                className="bg-canvas-default border border-border-subtle rounded px-2 py-0.5 text-xs text-text-primary focus:border-accent-primary outline-none w-28 font-mono"
                placeholder="function_name"
              />
            </div>
            <span className="text-[11px] text-text-tertiary">Monaco Editor</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={sourceLanguage}
              theme="vs-dark"
              value={sourceCode}
              onChange={(v) => setSourceCode(v || '')}
              options={{
                fontFamily: 'JetBrains Mono',
                fontSize: 13,
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
              }}
            />
          </div>

          {/* Decoding Options Drawer */}
          {showAdvanced && (
            <div className="border-t border-border-subtle bg-surface-elevated p-3 text-xs font-mono space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-bold">Decoding & Sampling Budget</div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-text-secondary text-[10px] block">maxNewTokens</label>
                  <input
                    type="number"
                    value={generationConfig.maxNewTokens}
                    onChange={(e) => setGenerationConfig({ ...generationConfig, maxNewTokens: parseInt(e.target.value, 10) || 128 })}
                    className="w-full bg-canvas-default border border-border-subtle rounded px-2 py-1 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[10px] block">numBeams</label>
                  <input
                    type="number"
                    value={generationConfig.numBeams}
                    onChange={(e) => setGenerationConfig({ ...generationConfig, numBeams: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-canvas-default border border-border-subtle rounded px-2 py-1 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[10px] block">Temperature</label>
                  <input
                    type="number"
                    step="0.05"
                    value={generationConfig.temperature}
                    onChange={(e) => setGenerationConfig({ ...generationConfig, temperature: parseFloat(e.target.value) || 0.2 })}
                    className="w-full bg-canvas-default border border-border-subtle rounded px-2 py-1 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[10px] block">Seed (Deterministic)</label>
                  <input
                    type="number"
                    value={generationConfig.seed || 42}
                    onChange={(e) => setGenerationConfig({ ...generationConfig, seed: parseInt(e.target.value, 10) || 42 })}
                    className="w-full bg-canvas-default border border-border-subtle rounded px-2 py-1 text-xs text-text-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Model Selector & Test Contract (5 Cols) */}
        <div className="col-span-5 flex flex-col bg-surface-base overflow-hidden">
          {/* Models Selection Deck */}
          <div className="border-b border-border-subtle p-3 bg-surface-base">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">
                Select Comparison Models ({selectedModelIds.length} chosen)
              </span>
              <span className="text-[11px] text-text-tertiary font-mono">Independent Adapters</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {models.map((m) => {
                const isSelected = selectedModelIds.includes(m.id);
                const isAvailable = m.status === 'AVAILABLE';

                return (
                  <div
                    key={m.id}
                    onClick={() => isAvailable && handleModelToggle(m.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-xs font-mono transition-colors ${
                      !isAvailable
                        ? 'opacity-60 bg-canvas-default border-border-subtle cursor-not-allowed'
                        : isSelected
                        ? 'bg-accent-muted/60 border-accent-primary text-text-primary cursor-pointer'
                        : 'bg-surface-elevated border-border-subtle text-text-secondary hover:border-border-strong cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isAvailable}
                        onChange={() => {}}
                        className="rounded border-border-strong text-accent-primary focus:ring-0"
                      />
                      <div className="truncate">
                        <div className="font-medium truncate">{m.displayName}</div>
                        <div className="text-[10px] text-text-tertiary truncate">
                          {m.publisher} • {m.architecture} • {m.parameterCount ? `${Math.round(m.parameterCount / 1000000)}M params` : 'Seq2Seq'}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={m.status} showIcon={false} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Case Contracts Deck */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">
                  Differential Test Cases ({tests.length})
                </span>
                <p className="text-[10px] text-text-tertiary">All selected models execute identical input contracts</p>
              </div>
              <button
                type="button"
                onClick={addTest}
                className="px-2 py-0.5 bg-surface-elevated hover:bg-surface-highlight border border-border-subtle rounded text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Case
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tests.length === 0 ? (
                <div className="p-4 rounded border border-dashed border-border-subtle text-center text-xs text-text-tertiary font-mono">
                  No tests defined. Add inputs to evaluate behavioral parity.
                </div>
              ) : (
                tests.map((t, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-surface-elevated border border-border-subtle text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-accent-subtle">Case #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeTest(idx)}
                        className="text-text-tertiary hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-text-tertiary block">Input Args (JSON Array)</label>
                        <input
                          type="text"
                          defaultValue={JSON.stringify(t.input)}
                          onBlur={(e) => updateTestInput(idx, e.target.value)}
                          className="w-full bg-canvas-default border border-border-subtle rounded px-2 py-1 text-xs text-text-primary font-mono focus:border-accent-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-tertiary block">Expected (JSON)</label>
                        <input
                          type="text"
                          defaultValue={JSON.stringify(t.expectedOutput)}
                          onBlur={(e) => updateTestOutput(idx, e.target.value)}
                          className="w-full bg-canvas-default border border-border-subtle rounded px-2 py-1 text-xs text-text-primary font-mono focus:border-accent-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-border-subtle text-[11px] text-text-tertiary flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Outputs are compared strictly. Source baseline verified before target evaluation.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
