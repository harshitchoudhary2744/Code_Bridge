/**
 * CodeBridge Frontend API Client
 * Connects to FastAPI backend endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

export async function getLanguages() {
  const res = await fetch(`${API_BASE_URL}/api/languages`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function translateCode({
  source_language,
  target_language,
  code,
  use_structure = true,
  run_validation = true,
  tests = [],
  experiment_mode = 'structural_validation'
}) {
  const res = await fetch(`${API_BASE_URL}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_language,
      target_language,
      code,
      use_structure,
      run_validation,
      tests,
      experiment_mode
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Translation failed with status: ${res.status}`);
  }

  return await res.json();
}

export async function analyzeStructure({ language, code }) {
  const res = await fetch(`${API_BASE_URL}/api/analyze-structure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Structure analysis failed`);
  }

  return await res.json();
}

export async function validateCode({ language, code, tests = [] }) {
  const res = await fetch(`${API_BASE_URL}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, tests })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Validation failed`);
  }

  return await res.json();
}
