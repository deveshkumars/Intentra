/**
 * Pure unit tests for intent.ts — no server spawned.
 * Each test gets a fresh isolated tmp directory via INTENTRA_REPO_ROOT.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Dynamic imports so env is set before module resolves paths at call time.
// We import directly — intent.ts reads process.env at call time, not module load time.
import {
  createIntent,
  getIntent,
  listIntents,
  updateIntentOutcome,
  isIntentOutcome,
} from './intent';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'intentra-test-'));
  process.env.INTENTRA_REPO_ROOT = tmpDir;
});

afterEach(() => {
  delete process.env.INTENTRA_REPO_ROOT;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ─── isIntentOutcome ────────────────────────────────────────────────────────

describe('isIntentOutcome', () => {
  test("'success' is valid", () => expect(isIntentOutcome('success')).toBe(true));
  test("'error' is valid", () => expect(isIntentOutcome('error')).toBe(true));
  test("'cancelled' is valid", () => expect(isIntentOutcome('cancelled')).toBe(true));
  test("'pending' is not valid", () => expect(isIntentOutcome('pending')).toBe(false));
  test('empty string is not valid', () => expect(isIntentOutcome('')).toBe(false));
});

// ─── createIntent ───────────────────────────────────────────────────────────

describe('createIntent', () => {
  test('intent_id matches ISO timestamp format', () => {
    const art = createIntent({ prompt: 'test prompt' });
    expect(art.intent_id).toMatch(/^intent_\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test('writes file to INTENTRA_REPO_ROOT/.intentra/', () => {
    const art = createIntent({ prompt: 'file write test' });
    const filePath = path.join(tmpDir, '.intentra', `${art.intent_id}.json`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('detects branch from .git/HEAD ref', () => {
    const gitDir = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/feat/add-tests\n');
    const art = createIntent({ prompt: 'branch test' });
    expect(art.repo.branch).toBe('feat/add-tests');
  });

  test('falls back to "unknown" when .git/HEAD absent', () => {
    // tmpDir has no .git directory
    const art = createIntent({ prompt: 'no git' });
    expect(art.repo.branch).toBe('unknown');
  });

  test('detached HEAD (raw SHA) falls back to "unknown"', () => {
    const gitDir = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'HEAD'), 'abc123def456\n');
    const art = createIntent({ prompt: 'detached' });
    expect(art.repo.branch).toBe('unknown');
  });

  test('outcome is null on creation', () => {
    const art = createIntent({ prompt: 'outcome check' });
    expect(art.outcome).toBeNull();
  });

  test('constraints and plan round-trip', () => {
    const art = createIntent({
      prompt: 'round-trip',
      constraints: { risk_tolerance: 'low', requires_approval_for: ['deploy'] },
      plan: [{ type: 'task', description: 'write code' }],
    });
    expect(art.constraints?.risk_tolerance).toBe('low');
    expect(art.plan?.[0]?.type).toBe('task');
  });
});

// ─── getIntent — path traversal defense ────────────────────────────────────

describe('getIntent — path traversal defense', () => {
  test('rejects id containing ..', () => {
    expect(getIntent('../etc/passwd')).toBeNull();
  });

  test('rejects id containing /', () => {
    expect(getIntent('foo/bar')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(getIntent('')).toBeNull();
  });

  test('returns null for nonexistent id', () => {
    expect(getIntent('intent_9999-01-01T00:00:00Z')).toBeNull();
  });

  test('returns artifact after createIntent', () => {
    const art = createIntent({ prompt: 'lookup me' });
    const fetched = getIntent(art.intent_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.prompt).toBe('lookup me');
  });
});

// ─── listIntents ────────────────────────────────────────────────────────────

describe('listIntents', () => {
  test('skips malformed JSON files without throwing', () => {
    const intentraDir = path.join(tmpDir, '.intentra');
    fs.mkdirSync(intentraDir, { recursive: true });
    fs.writeFileSync(path.join(intentraDir, 'intent_bad.json'), '{not json}');
    expect(() => listIntents()).not.toThrow();
    const ids = listIntents().map((a) => a.intent_id);
    expect(ids).not.toContain('intent_bad');
  });

  test('filters non-intent files', () => {
    const intentraDir = path.join(tmpDir, '.intentra');
    fs.mkdirSync(intentraDir, { recursive: true });
    fs.writeFileSync(path.join(intentraDir, 'README.md'), '# readme');
    fs.writeFileSync(path.join(intentraDir, 'culture.json'), '{}');
    const results = listIntents();
    // Non-intent_*.json files should not appear
    expect(results.every((a) => a.intent_id.startsWith('intent_'))).toBe(true);
  });

  test('sorts chronologically (alphabetic = chronological for ISO ids)', async () => {
    createIntent({ prompt: 'first' });
    // Wait just over 1s to get a different second-precision timestamp
    await new Promise((r) => setTimeout(r, 1100));
    createIntent({ prompt: 'second' });
    const results = listIntents();
    expect(results.length).toBeGreaterThanOrEqual(2);
    const lastTwo = results.slice(-2);
    expect(lastTwo[0]!.intent_id < lastTwo[1]!.intent_id).toBe(true);
    expect(lastTwo[0]!.prompt).toBe('first');
    expect(lastTwo[1]!.prompt).toBe('second');
  });
});

// ─── updateIntentOutcome ────────────────────────────────────────────────────

describe('updateIntentOutcome', () => {
  test('rejects id with .. — returns null', () => {
    expect(updateIntentOutcome('../malicious', 'success')).toBeNull();
  });

  test('returns null for nonexistent id without throwing', () => {
    expect(updateIntentOutcome('intent_9999-01-01T00:00:00Z', 'success')).toBeNull();
  });

  test('updates outcome on existing intent', () => {
    const art = createIntent({ prompt: 'to update' });
    const updated = updateIntentOutcome(art.intent_id, 'error');
    expect(updated).not.toBeNull();
    expect(updated!.outcome).toBe('error');
    // Persisted to disk — verify via getIntent
    expect(getIntent(art.intent_id)!.outcome).toBe('error');
  });

  test('all three valid outcomes can be set', () => {
    for (const outcome of ['success', 'error', 'cancelled'] as const) {
      const art = createIntent({ prompt: `outcome-${outcome}` });
      const updated = updateIntentOutcome(art.intent_id, outcome);
      expect(updated!.outcome).toBe(outcome);
    }
  });
});
