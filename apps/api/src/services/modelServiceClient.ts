import { config } from '../config';
import { ModelMetadata, GenerationConfig } from '@transcode-lab/api-contracts';

export interface TranslateApiResponse {
  modelId: string;
  status: string;
  candidateCode: string | null;
  generationTimeMs: number;
  peakMemoryMb?: number | null;
  generationConfig: Record<string, any>;
  checkpointRevision: string;
  deviceUsed: string;
  error?: string | null;
}

export interface RepairApiResponse {
  modelId: string;
  status: string;
  candidateCode: string | null;
  generationTimeMs: number;
  feedbackPayloadUsed: string;
  error?: string | null;
}

export class ModelServiceClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.modelServiceUrl;
  }

  async health(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Model service health check failed with status ${res.status}`);
    return res.json() as any;
  }

  async listModels(): Promise<ModelMetadata[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/models`);
    if (!res.ok) throw new Error(`Failed to list models from model service: ${res.status}`);
    return res.json() as any;
  }

  async translate(params: {
    modelId: string;
    sourceLanguage: string;
    targetLanguage: string;
    sourceCode: string;
    generation: GenerationConfig;
  }): Promise<TranslateApiResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        modelId: params.modelId,
        status: 'MODEL_UNAVAILABLE',
        candidateCode: null,
        generationTimeMs: 0,
        generationConfig: params.generation,
        checkpointRevision: 'unknown',
        deviceUsed: 'unknown',
        error: `Model service error (${res.status}): ${errText}`,
      };
    }

    return res.json() as any;
  }

  async repair(params: {
    modelId: string;
    sourceLanguage: string;
    targetLanguage: string;
    sourceCode: string;
    previousCandidate: string;
    compilerDiagnostics?: string | null;
    failingTestInput?: any;
    expectedOutput?: any;
    actualOutput?: any;
    failureCategory?: string | null;
    generation: GenerationConfig;
  }): Promise<RepairApiResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        modelId: params.modelId,
        status: 'REPAIR_FAILED',
        candidateCode: null,
        generationTimeMs: 0,
        feedbackPayloadUsed: '',
        error: `Model service repair error (${res.status}): ${errText}`,
      };
    }

    return res.json() as any;
  }
}

