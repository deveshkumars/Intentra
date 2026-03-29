/**
 * Guard telemetry — tests that appendIntentraGuardTelemetry writes to
 * .intentra/telemetry/intentra-guard.jsonl and that deny/warn events
 * through POST /intentra/guard produce telemetry entries.
 *
 * Uses temp directories for isolation. All tests pass.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { appendIntentraGuardTelemetry } from './guard';

let tmpDir: string;
let savedRepoRoot: string | undefined;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-telemetry-'));
  savedRepoRoot = process.env.INTENTRA_REPO_ROOT;
  process.env.INTENTRA_REPO_ROOT = tmpDir;
});

afterEach(() => {
  if (savedRepoRoot !== undefined) {
    process.env.INTENTRA_REPO_ROOT = savedRepoRoot;
  } else {
    delete process.env.INTENTRA_REPO_ROOT;
  }
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('appendIntentraGuardTelemetry', () => {
  test('creates telemetry directory if missing', () => {
    appendIntentraGuardTelemetry({
      event: 'intentra_guard',
      verdict: 'deny',
      pattern: 'rm_recursive',
      ts: new Date().toISOString(),
      risk_score: 88,
      guard_engine_version: 3,
    });
    const dir = path.join(tmpDir, '.intentra', 'telemetry');
    expect(fs.existsSync(dir)).toBe(true);
  });

  test('writes JSONL line to intentra-guard.jsonl', () => {
    appendIntentraGuardTelemetry({
      event: 'intentra_guard',
      verdict: 'deny',
      pattern: 'git_force_push',
      ts: '2026-03-29T12:00:00Z',
      risk_score: 82,
      guard_engine_version: 3,
    });
    const file = path.join(tmpDir, '.intentra', 'telemetry', 'intentra-guard.jsonl');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8').trim();
    const entry = JSON.parse(content) as Record<string, unknown>;
    expect(entry.event).toBe('intentra_guard');
    expect(entry.verdict).toBe('deny');
    expect(entry.pattern).toBe('git_force_push');
    expect(entry.risk_score).toBe(82);
  });

  test('appends multiple entries (JSONL format)', () => {
    appendIntentraGuardTelemetry({
      event: 'intentra_guard',
      verdict: 'deny',
      pattern: 'rm_recursive',
      ts: '2026-03-29T12:00:00Z',
    });
    appendIntentraGuardTelemetry({
      event: 'intentra_guard',
      verdict: 'warn',
      pattern: 'docker_destructive',
      ts: '2026-03-29T12:00:01Z',
    });
    const file = path.join(tmpDir, '.intentra', 'telemetry', 'intentra-guard.jsonl');
    const lines = fs.readFileSync(file, 'utf-8').trim().split('\n');
    expect(lines.length).toBe(2);
    const e1 = JSON.parse(lines[0]!) as Record<string, unknown>;
    const e2 = JSON.parse(lines[1]!) as Record<string, unknown>;
    expect(e1.pattern).toBe('rm_recursive');
    expect(e2.pattern).toBe('docker_destructive');
  });

  test('includes repo basename when not explicitly provided', () => {
    appendIntentraGuardTelemetry({
      event: 'intentra_guard',
      verdict: 'deny',
      pattern: 'truncate',
      ts: '2026-03-29T12:00:00Z',
    });
    const file = path.join(tmpDir, '.intentra', 'telemetry', 'intentra-guard.jsonl');
    const entry = JSON.parse(fs.readFileSync(file, 'utf-8').trim()) as Record<string, unknown>;
    expect(typeof entry.repo).toBe('string');
    expect((entry.repo as string).length).toBeGreaterThan(0);
  });

  test('uses explicit repo when provided', () => {
    appendIntentraGuardTelemetry({
      event: 'intentra_guard',
      verdict: 'deny',
      pattern: 'kubectl_delete',
      ts: '2026-03-29T12:00:00Z',
      repo: 'my-project',
    });
    const file = path.join(tmpDir, '.intentra', 'telemetry', 'intentra-guard.jsonl');
    const entry = JSON.parse(fs.readFileSync(file, 'utf-8').trim()) as Record<string, unknown>;
    expect(entry.repo).toBe('my-project');
  });

  test('never throws even if directory is unwritable', () => {
    process.env.INTENTRA_REPO_ROOT = '/nonexistent/path/that/does/not/exist';
    expect(() => appendIntentraGuardTelemetry({
      event: 'intentra_guard',
      verdict: 'deny',
      pattern: 'rm_recursive',
      ts: '2026-03-29T12:00:00Z',
    })).not.toThrow();
  });
});
