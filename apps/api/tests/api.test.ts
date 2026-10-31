import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app';
import { closeDatabase } from '../src/db/connection';

describe('TransCode Lab API Test Suite', () => {
  const testDbPath = path.resolve(process.cwd(), 'database/test_transcode.sqlite');
  let app: any;

  beforeAll(() => {
    process.env.DATABASE_PATH = testDbPath;
    app = createApp();
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {
        // Ignored on Windows file locks
      }
    }
  });

  it('GET /health returns 200 and ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('transcode-api');
  });

  it('GET /api/v1/models returns model registry list', async () => {
    const res = await request(app).get('/api/v1/models');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);

    const ids = res.body.map((m: any) => m.id);
    expect(ids).toContain('salesforce-codet5-small');
    expect(ids).toContain('uclanlp-plbart-base');
    expect(ids).toContain('facebook-transcoder');
  });

  it('POST /api/v1/comparisons rejects invalid request', async () => {
    const res = await request(app).post('/api/v1/comparisons').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/comparisons accepts valid job and persists record', async () => {
    const res = await request(app).post('/api/v1/comparisons').send({
      sourceLanguage: 'python',
      sourceVersion: '3.11',
      targetLanguage: 'java',
      targetVersion: '17',
      sourceCode: 'def add(a: int, b: int) -> int:\n    return a + b\n',
      entryPoint: { kind: 'function', name: 'add' },
      tests: [
        { input: [2, 3], expectedOutput: 5 },
        { input: [-1, 1], expectedOutput: 0 }
      ],
      modelIds: ['salesforce-codet5-small', 'uclanlp-plbart-base'],
      mode: 'validate',
      generation: { maxNewTokens: 64, numBeams: 1 }
    });

    expect(res.status).toBe(202);
    expect(res.body.id).toBeDefined();
    expect(res.body.modelRuns.length).toBe(2);

    const jobId = res.body.id;

    // Verify GET /api/v1/comparisons/:id
    const fetchRes = await request(app).get(`/api/v1/comparisons/${jobId}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.id).toBe(jobId);
    expect(fetchRes.body.modelRuns.length).toBe(2);

    // Verify GET /api/v1/reports/:id?format=csv
    const csvRes = await request(app).get(`/api/v1/reports/${jobId}?format=csv`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('job_id,created_at');
    expect(csvRes.text).toContain('salesforce-codet5-small');

    // Verify GET /api/v1/reports/:id?format=json
    const jsonRes = await request(app).get(`/api/v1/reports/${jobId}?format=json`);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.id).toBe(jobId);
  });
});

