import { TraceResult, Program, UserSessionState, AIResponse, CompilerDiagnostic } from './types';

const BASE_URL = 'http://localhost:8000/api';

export async function compileCode(code: string): Promise<{
  success: boolean;
  return_code: number;
  diagnostics: CompilerDiagnostic[];
  raw_output: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        return_code: res.status,
        diagnostics: [],
        raw_output: `HTTP error ${res.status}: ${text}`
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      return_code: 1,
      diagnostics: [],
      raw_output: `Network/parse error: ${err?.message || 'Server connection failed'}`
    };
  }
}

export async function traceCode(code: string, stdin: string = ''): Promise<TraceResult> {
  try {
    const res = await fetch(`${BASE_URL}/trace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, stdin })
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        steps: [],
        summary: { total_steps: 0, exit_code: res.status, leak_count: 0, leaked_bytes: 0, has_error: true },
        error: `Server responded with status ${res.status}: ${text}`
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      steps: [],
      summary: { total_steps: 0, exit_code: 1, leak_count: 0, leaked_bytes: 0, has_error: true },
      error: `Network/parse error: ${err?.message || 'Failed to connect to backend server'}`
    };
  }
}

export async function runCode(code: string, stdin: string = ''): Promise<{
  success: boolean;
  compile_failed?: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
}> {
  try {
    const res = await fetch(`${BASE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, stdin })
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        stdout: '',
        stderr: `HTTP error ${res.status}: ${text}`,
        exit_code: res.status,
        execution_time_ms: 0
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      stdout: '',
      stderr: `Network/parse error: ${err?.message || 'Failed to connect to backend server'}`,
      exit_code: 1,
      execution_time_ms: 0
    };
  }
}

export async function fetchPrograms(category?: string): Promise<Program[]> {
  const url = category && category !== 'all' 
    ? `${BASE_URL}/programs?category=${encodeURIComponent(category)}`
    : `${BASE_URL}/programs`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchProgram(id: number): Promise<Program> {
  const res = await fetch(`${BASE_URL}/programs/${id}`);
  return res.json();
}

export async function createProgram(program: {
  title: string;
  category: string;
  description: string;
  code: string;
}): Promise<Program> {
  const res = await fetch(`${BASE_URL}/programs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(program)
  });
  return res.json();
}

export async function updateProgram(id: number, updates: Partial<Program>): Promise<Program> {
  const res = await fetch(`${BASE_URL}/programs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteProgram(id: number): Promise<{ success: boolean; deleted_id: number }> {
  const res = await fetch(`${BASE_URL}/programs/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function fetchSession(): Promise<UserSessionState> {
  const res = await fetch(`${BASE_URL}/session`);
  return res.json();
}

export async function saveSession(session: Partial<UserSessionState>): Promise<UserSessionState> {
  const res = await fetch(`${BASE_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  });
  return res.json();
}

export async function askAI(payload: {
  question: string;
  code: string;
  current_step?: any;
  runtime_error?: string;
  api_key?: string;
}): Promise<AIResponse> {
  const res = await fetch(`${BASE_URL}/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}
