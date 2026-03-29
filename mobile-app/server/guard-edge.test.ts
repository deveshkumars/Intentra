/**
 * Guard engine edge cases, exact risk score formula, and culture.ts unit tests.
 * Pure unit tests — no server spawned.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { evaluateCommandGuard } from './guard';
import { readCultureSnapshot } from './culture';

// ─── rm_recursive edge cases ────────────────────────────────────────────────

describe('rm_recursive edge cases', () => {
  test('double-quoted path rm -rf "./src" → deny', () => {
    const r = evaluateCommandGuard('rm -rf "./src"', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
  });

  test("single-quoted path rm -rf './src' → deny", () => {
    const r = evaluateCommandGuard("rm -rf './src'", null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
  });

  test('quoted safe target rm -rf "node_modules" → allow', () => {
    const r = evaluateCommandGuard('rm -rf "node_modules"', null);
    expect(r.verdict).toBe('allow');
  });

  test('mixed safe + unsafe: rm -rf node_modules ./src → deny', () => {
    // One unsafe path in a multi-target rm still triggers denial
    const r = evaluateCommandGuard('rm -rf node_modules ./src', null);
    expect(r.verdict).toBe('deny');
  });

  test('long flag rm --recursive ./src → deny', () => {
    const r = evaluateCommandGuard('rm --recursive ./src', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
  });

  test('uppercase -Rf flag → deny (flag regex is case-insensitive)', () => {
    const r = evaluateCommandGuard('rm -Rf ./src', null);
    expect(r.verdict).toBe('deny');
  });

  test('no path tokens: rm -rf (no target) → deny', () => {
    // paths.length === 0 branch returns true (undirected recursive rm is denied)
    const r = evaluateCommandGuard('rm -rf', null);
    expect(r.verdict).toBe('deny');
  });

  test('safe target with trailing slash: rm -rf coverage/ → allow', () => {
    // isSafeRmTarget strips trailing slashes before checking
    const r = evaluateCommandGuard('rm -rf coverage/', null);
    expect(r.verdict).toBe('allow');
  });
});

// ─── git_force_push edge cases ───────────────────────────────────────────────

describe('git_force_push edge cases', () => {
  test('git push --force-with-lease → deny (implicit policy: any flag containing "f" after git push)', () => {
    // matchGitForcePush: x.startsWith('-') && x !== '--' && x.includes('f')
    // '--force-with-lease' satisfies all three conditions → denied by policy
    const r = evaluateCommandGuard('git push --force-with-lease', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('git_force_push');
  });

  test('git push origin --force (flag after remote name) → deny', () => {
    const r = evaluateCommandGuard('git push origin --force', null);
    expect(r.verdict).toBe('deny');
  });

  test('git push -u origin main (no force flag) → allow', () => {
    const r = evaluateCommandGuard('git push -u origin main', null);
    expect(r.verdict).toBe('allow');
  });
});

// ─── SQL edge cases ──────────────────────────────────────────────────────────

describe('SQL edge cases', () => {
  test('DROP TABLE IF EXISTS users → deny', () => {
    // regex \bdrop\s+(table|database)\b matches "drop table" within the string
    const r = evaluateCommandGuard('DROP TABLE IF EXISTS users', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('drop_table');
  });

  test('drop database production → deny', () => {
    const r = evaluateCommandGuard('drop database production', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('drop_table');
  });

  test('TRUNCATE TABLE users; → deny', () => {
    const r = evaluateCommandGuard('TRUNCATE TABLE users;', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('truncate');
  });

  test('truncate (bare word) → deny', () => {
    const r = evaluateCommandGuard('truncate', null);
    expect(r.verdict).toBe('deny');
  });

  test('dropout → allow (word boundary prevents false match on \\btruncate\\b)', () => {
    const r = evaluateCommandGuard('dropout', null);
    expect(r.verdict).toBe('allow');
  });

  test('-- DROP TABLE users (SQL comment) → deny (no comment-stripping in guard)', () => {
    // ctx.lower still contains "drop table" — the guard has no SQL comment awareness
    const r = evaluateCommandGuard('-- DROP TABLE users', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('drop_table');
  });
});

// ─── Empty and boundary commands ────────────────────────────────────────────

describe('Empty and boundary commands', () => {
  test('empty string → allow, risk_score 0', () => {
    const r = evaluateCommandGuard('', null);
    expect(r.verdict).toBe('allow');
    expect(r.risk_score).toBe(0);
  });

  test('whitespace-only → allow, risk_score 0 (trimmed to empty)', () => {
    const r = evaluateCommandGuard('   ', null);
    expect(r.verdict).toBe('allow');
    expect(r.risk_score).toBe(0);
  });

  test('10,000-char command → does not throw, returns allow', () => {
    const long = 'ls ' + 'x'.repeat(10000);
    expect(() => evaluateCommandGuard(long, null)).not.toThrow();
    expect(evaluateCommandGuard(long, null).verdict).toBe('allow');
  });

  test('fullwidth Unicode "ｒｍ -rf ./src" → deny after NFKC normalization', () => {
    // Fullwidth ｒ (U+FF52) and ｍ (U+FF4D) normalize to ASCII rm under NFKC
    const r = evaluateCommandGuard('ｒｍ -rf ./src', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
  });
});

// ─── Risk score formula exact values ─────────────────────────────────────────

describe('Risk score formula exact values', () => {
  test('deny verdict: risk_score === baseRisk (git_force_push baseRisk=82)', () => {
    const r = evaluateCommandGuard('git push --force origin main', null);
    expect(r.verdict).toBe('deny');
    expect(r.risk_score).toBe(82); // min(100, 82)
  });

  test('warn verdict: risk_score === Math.round(baseRisk * 0.72) (docker_destructive=75 → 54)', () => {
    const culture = { intentra: { risk_gates: { docker_destructive: 'warn' } } };
    const r = evaluateCommandGuard('docker system prune', culture);
    expect(r.verdict).toBe('warn');
    expect(r.risk_score).toBe(54); // min(100, round(75 * 0.72)) = round(54.0) = 54
  });

  test('allow-via-culture: risk_score === Math.round(baseRisk * 0.12) (rm_recursive=88 → 11)', () => {
    const culture = { intentra: { risk_gates: { rm_recursive: 'allow' } } };
    const r = evaluateCommandGuard('rm -rf ./src', culture);
    expect(r.verdict).toBe('allow');
    expect(r.risk_score).toBe(11); // min(100, round(88 * 0.12)) = round(10.56) = 11
  });

  test('allow (no rule match): risk_score === 0', () => {
    const r = evaluateCommandGuard('ls -la', null);
    expect(r.verdict).toBe('allow');
    expect(r.risk_score).toBe(0);
  });

  test('drop_table (highest baseRisk=92) deny → risk_score === 92', () => {
    const r = evaluateCommandGuard('DROP TABLE users', null);
    expect(r.verdict).toBe('deny');
    expect(r.risk_score).toBe(92);
  });
});

// ─── culture.ts — readCultureSnapshot ────────────────────────────────────────

describe('culture.ts readCultureSnapshot', () => {
  let tmpDir: string;
  let savedStateDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'culture-test-'));
    savedStateDir = process.env.GSTACK_STATE_DIR;
    process.env.GSTACK_STATE_DIR = tmpDir;
  });

  afterEach(() => {
    if (savedStateDir !== undefined) {
      process.env.GSTACK_STATE_DIR = savedStateDir;
    } else {
      delete process.env.GSTACK_STATE_DIR;
    }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  test('missing file → { loaded: false, error: null, culture: null }', () => {
    // tmpDir has no culture.json
    const snap = readCultureSnapshot();
    expect(snap.loaded).toBe(false);
    expect(snap.error).toBeNull();
    expect(snap.culture).toBeNull();
  });

  test('valid JSON → { loaded: true, culture: <object> }', () => {
    fs.writeFileSync(path.join(tmpDir, 'culture.json'), JSON.stringify({ intentra: {} }));
    const snap = readCultureSnapshot();
    expect(snap.loaded).toBe(true);
    expect(typeof snap.culture).toBe('object');
    expect(snap.culture).not.toBeNull();
  });

  test('malformed JSON → { loaded: false, error: <string> }', () => {
    fs.writeFileSync(path.join(tmpDir, 'culture.json'), '{not json}');
    const snap = readCultureSnapshot();
    expect(snap.loaded).toBe(false);
    expect(typeof snap.error).toBe('string');
    expect(snap.error).not.toBeNull();
  });

  test('GSTACK_STATE_DIR env sets culture.json path', () => {
    const snap = readCultureSnapshot();
    expect(snap.path).toContain(tmpDir);
  });
});
