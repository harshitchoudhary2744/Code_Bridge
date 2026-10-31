import {
  ModelMetadata,
  ComparisonJobRequest,
  ComparisonJobResponse,
  RepairRequest,
  RepairResponse,
  BenchmarkManifest,
  BenchmarkRunRequest,
  BenchmarkRunResponse
} from '@transcode-lab/api-contracts';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = {
  async getHealth(): Promise<{ status: string; checks: Record<string, string> }> {
    const res = await fetch(`${API_BASE}/ready`);
    return res.json();
  },

  async getModels(): Promise<ModelMetadata[]> {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  },

  async createComparison(req: ComparisonJobRequest): Promise<ComparisonJobResponse> {
    const res = await fetch(`${API_BASE}/comparisons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit comparison');
    }
    return res.json();
  },

  async getComparison(id: string): Promise<ComparisonJobResponse> {
    const res = await fetch(`${API_BASE}/comparisons/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch comparison ${id}`);
    return res.json();
  },

  async runRepair(req: RepairRequest): Promise<RepairResponse> {
    const res = await fetch(`${API_BASE}/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Repair experiment failed');
    }
    return res.json();
  },

  async getHistory(limit = 20, offset = 0): Promise<{ total: number; jobs: ComparisonJobResponse[] }> {
    const res = await fetch(`${API_BASE}/history?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async getBenchmarks(): Promise<BenchmarkManifest[]> {
    const res = await fetch(`${API_BASE}/benchmarks`);
    if (!res.ok) throw new Error('Failed to fetch benchmarks');
    return res.json();
  },

  async runBenchmark(req: BenchmarkRunRequest): Promise<BenchmarkRunResponse> {
    const res = await fetch(`${API_BASE}/benchmarks/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Benchmark run failed');
    }
    return res.json();
  },

  async getBenchmarkRun(id: string): Promise<BenchmarkRunResponse> {
    const res = await fetch(`${API_BASE}/benchmarks/runs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch benchmark run');
    return res.json();
  },

  getReportDownloadUrl(jobId: string, format: 'json' | 'csv'): string {
    return `${API_BASE}/reports/${jobId}?format=${format}`;
  }
};

