import { z } from 'zod';

// ==========================================
// 1. Language & Version Types
// ==========================================
export const SupportedLanguageSchema = z.enum(['python', 'java']);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

export const EntryPointKindSchema = z.enum(['function', 'method', 'class']);
export type EntryPointKind = z.infer<typeof EntryPointKindSchema>;

export const EntryPointSchema = z.object({
  kind: EntryPointKindSchema.default('function'),
  name: z.string().min(1, 'Entry point name is required'),
  className: z.string().optional(),
});
export type EntryPoint = z.infer<typeof EntryPointSchema>;

// ==========================================
// 2. Test Case & Evaluation Schemas
// ==========================================
export const TestCaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  input: z.array(z.any()),
  expectedOutput: z.any().optional(),
  isEdgeCase: z.boolean().optional(),
  description: z.string().optional(),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

export const TestResultOutcomeSchema = z.enum([
  'PASSED',
  'FAILED',
  'CRASHED',
  'TIMED_OUT',
  'NOT_RUN',
  'SOURCE_FAILED'
]);
export type TestResultOutcome = z.infer<typeof TestResultOutcomeSchema>;

export const TestResultSchema = z.object({
  testIndex: z.number(),
  input: z.array(z.any()),
  expectedOutput: z.any().optional(),
  actualOutput: z.any().optional(),
  passed: z.boolean(),
  outcome: TestResultOutcomeSchema,
  executionTimeMs: z.number().optional(),
  errorMessage: z.string().optional(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

// ==========================================
// 3. Model Registry & Metadata Schemas
// ==========================================
export const ModelStatusSchema = z.enum([
  'AVAILABLE',
  'DOWNLOAD_REQUIRED',
  'FINE_TUNING_REQUIRED',
  'INCOMPATIBLE',
  'DISABLED',
  'PLANNED'
]);
export type ModelStatus = z.infer<typeof ModelStatusSchema>;

export const FineTuningStatusSchema = z.enum([
  'PRETRAINED_ONLY',
  'TASK_FINETUNED',
  'INSTRUCTION_TUNED'
]);
export type FineTuningStatus = z.infer<typeof FineTuningStatusSchema>;

export const ModelMetadataSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  publisher: z.string(),
  family: z.string(),
  architecture: z.string(),
  checkpoint: z.string(),
  revision: z.string(),
  tokenizer: z.string(),
  tokenizerClass: z.string().optional(),
  license: z.string(),
  licenseUrl: z.string().url().optional().or(z.literal('')),
  paperUrl: z.string().url().optional().or(z.literal('')),
  supportedTasks: z.array(z.string()),
  supportedLanguages: z.array(SupportedLanguageSchema),
  parameterCount: z.number().nullable().optional(),
  deviceRequirements: z.record(z.any()).optional(),
  status: ModelStatusSchema,
  fineTuningStatus: FineTuningStatusSchema.default('PRETRAINED_ONLY'),
  limitations: z.array(z.string()).default([]),
});
export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;

// ==========================================
// 4. Generation Configuration
// ==========================================
export const GenerationConfigSchema = z.object({
  maxNewTokens: z.number().int().min(16).max(2048).default(256),
  numBeams: z.number().int().min(1).max(10).default(1),
  temperature: z.number().min(0.0).max(2.0).default(0.2),
  topP: z.number().min(0.0).max(1.0).default(0.95),
  doSample: z.boolean().default(false),
  seed: z.number().optional(),
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

// ==========================================
// 5. Validation Gates & Overall Status
// ==========================================
export const GateTypeSchema = z.enum([
  'generation',
  'syntax',
  'compilation',
  'source_baseline',
  'target_execution',
  'behavioral'
]);
export type GateType = z.infer<typeof GateTypeSchema>;

export const ValidationStatusSchema = z.enum([
  'QUEUED',
  'GENERATING',
  'GENERATION_FAILED',
  'SYNTAX_FAILED',
  'COMPILE_FAILED',
  'SOURCE_BASELINE_FAILED',
  'EXECUTION_FAILED',
  'FAILED_BEHAVIORAL_TESTS',
  'PARTIAL_EVIDENCE',
  'PASSED_AVAILABLE_TESTS',
  'UNSUPPORTED',
  'MODEL_UNAVAILABLE',
  'NOT_RUN'
]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const ValidationGateResultSchema = z.object({
  gate: GateTypeSchema,
  passed: z.boolean(),
  status: z.string(),
  message: z.string().optional(),
  diagnostics: z.string().optional(),
  durationMs: z.number().optional(),
});
export type ValidationGateResult = z.infer<typeof ValidationGateResultSchema>;

// ==========================================
// 6. Comparison Job Schemas
// ==========================================
export const ComparisonModeSchema = z.enum([
  'compare',
  'validate',
  'validate-and-repair'
]);
export type ComparisonMode = z.infer<typeof ComparisonModeSchema>;

export const ComparisonJobRequestSchema = z.object({
  sourceLanguage: SupportedLanguageSchema,
  sourceVersion: z.string().default('3.11'),
  targetLanguage: SupportedLanguageSchema,
  targetVersion: z.string().default('17'),
  sourceCode: z.string().min(1, 'Source code cannot be empty'),
  entryPoint: EntryPointSchema,
  tests: z.array(TestCaseSchema).default([]),
  modelIds: z.array(z.string()).min(1, 'Select at least one model'),
  mode: ComparisonModeSchema.default('validate'),
  generation: GenerationConfigSchema.default({}),
});
export type ComparisonJobRequest = z.infer<typeof ComparisonJobRequestSchema>;

export const ModelRunDetailSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  modelId: z.string(),
  modelMetadataSnapshot: ModelMetadataSchema,
  status: ValidationStatusSchema,
  candidateCode: z.string().nullable(),
  generationTimeMs: z.number().nullable(),
  totalTimeMs: z.number().nullable(),
  peakMemoryMb: z.number().nullable().optional(),
  gates: z.array(ValidationGateResultSchema).default([]),
  testResults: z.array(TestResultSchema).default([]),
  passedTestsCount: z.number().default(0),
  totalTestsCount: z.number().default(0),
  compilerDiagnostics: z.string().nullable().optional(),
  runtimeDiagnostics: z.string().nullable().optional(),
  failureCategory: z.string().nullable().optional(),
  repairAttemptsCount: z.number().default(0),
});
export type ModelRunDetail = z.infer<typeof ModelRunDetailSchema>;

export const ComparisonJobResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']),
  sourceLanguage: SupportedLanguageSchema,
  sourceVersion: z.string(),
  targetLanguage: SupportedLanguageSchema,
  targetVersion: z.string(),
  sourceCode: z.string(),
  entryPoint: EntryPointSchema,
  tests: z.array(TestCaseSchema),
  mode: ComparisonModeSchema,
  generationConfig: GenerationConfigSchema,
  modelRuns: z.array(ModelRunDetailSchema),
  summary: z.object({
    totalModels: z.number(),
    completedModels: z.number(),
    passedModels: z.number(),
    failedModels: z.number(),
  }).optional(),
});
export type ComparisonJobResponse = z.infer<typeof ComparisonJobResponseSchema>;

// ==========================================
// 7. Repair Schemas
// ==========================================
export const RepairRequestSchema = z.object({
  jobId: z.string(),
  modelRunId: z.string(),
  repairModelId: z.string().optional(),
  maxAttempts: z.number().int().min(1).max(5).default(3),
});
export type RepairRequest = z.infer<typeof RepairRequestSchema>;

export const RepairAttemptSchema = z.object({
  id: z.string(),
  attemptNumber: z.number(),
  repairModelId: z.string(),
  feedbackPayload: z.string(),
  generatedCode: z.string(),
  gates: z.array(ValidationGateResultSchema),
  testResults: z.array(TestResultSchema),
  status: ValidationStatusSchema,
  passed: z.boolean(),
  createdAt: z.string(),
  durationMs: z.number().optional(),
});
export type RepairAttempt = z.infer<typeof RepairAttemptSchema>;

export const RepairResponseSchema = z.object({
  jobId: z.string(),
  modelRunId: z.string(),
  originalCandidate: z.string(),
  originalStatus: ValidationStatusSchema,
  attempts: z.array(RepairAttemptSchema),
  finalStatus: ValidationStatusSchema,
  finalCode: z.string(),
  repairSucceeded: z.boolean(),
  totalRetries: z.number(),
});
export type RepairResponse = z.infer<typeof RepairResponseSchema>;

// ==========================================
// 8. Benchmark Schemas
// ==========================================
export const BenchmarkManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  languages: z.array(SupportedLanguageSchema),
  problemCount: z.number(),
  testCount: z.number(),
  license: z.string(),
});
export type BenchmarkManifest = z.infer<typeof BenchmarkManifestSchema>;

export const BenchmarkRunRequestSchema = z.object({
  benchmarkId: z.string(),
  sourceLanguage: SupportedLanguageSchema,
  targetLanguage: SupportedLanguageSchema,
  modelIds: z.array(z.string()).min(1),
  generation: GenerationConfigSchema.default({}),
  limitProblems: z.number().int().optional(),
  runRepair: z.boolean().default(false),
});
export type BenchmarkRunRequest = z.infer<typeof BenchmarkRunRequestSchema>;

export const BenchmarkMetricSummarySchema = z.object({
  modelId: z.string(),
  displayName: z.string(),
  publisher: z.string(),
  totalProblems: z.number(),
  syntaxPassCount: z.number(),
  syntaxPassRate: z.number(),
  compilePassCount: z.number(),
  compilePassRate: z.number(),
  firstPassBehavioralCount: z.number(),
  firstPassBehavioralRate: z.number(),
  postRepairBehavioralCount: z.number().optional(),
  postRepairBehavioralRate: z.number().optional(),
  medianLatencyMs: z.number(),
  p95LatencyMs: z.number(),
  totalAttempts: z.number(),
  failureBreakdown: z.record(z.number()),
});
export type BenchmarkMetricSummary = z.infer<typeof BenchmarkMetricSummarySchema>;

export const BenchmarkRunResponseSchema = z.object({
  id: z.string(),
  benchmarkId: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED']),
  sourceLanguage: SupportedLanguageSchema,
  targetLanguage: SupportedLanguageSchema,
  modelSummaries: z.array(BenchmarkMetricSummarySchema),
});
export type BenchmarkRunResponse = z.infer<typeof BenchmarkRunResponseSchema>;

