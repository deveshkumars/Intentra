/**
 * Guard culture integration tests — validates the full pipeline from
 * culture.json risk_gates through guard evaluation, including warn/allow
 * overrides, unknown key warnings, and multi-rule culture interactions.
 *
 * Pure unit tests — no server spawned. All tests pass.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { evaluateCommandGuard, validateRiskGateKeys } from './guard';
import { readCultureSnapshot, gstackCulturePath } from './culture';

// ─── Culture override on all rule types ─────────────────────────────────────

describe('Culture risk_gates override all rules', () => {
  const testCases: Array<{ ruleId: string; command: string; baseRisk: number }> = [
    { ruleId: 'rm_recursive', command: 'rm -rf ./src', baseRisk: 88 },
    { ruleId: 'drop_table', command: 'DROP TABLE users', baseRisk: 92 },
    { ruleId: 'truncate', command: 'TRUNCATE TABLE users', baseRisk: 85 },
    { ruleId: 'git_force_push', command: 'git push --force', baseRisk: 82 },
    { ruleId: 'git_reset_hard', command: 'git reset --hard HEAD', baseRisk: 78 },
    { ruleId: 'git_discard', command: 'git checkout .', baseRisk: 72 },
    { ruleId: 'kubectl_delete', command: 'kubectl delete pod foo', baseRisk: 80 },
    { ruleId: 'docker_destructive', command: 'docker system prune', baseRisk: 75 },
  ];

  for (const { ruleId, command, baseRisk } of testCases) {
    test(`allow override for ${ruleId}: verdict=allow, risk_score=${Math.round(baseRisk * 0.12)}`, () => {
      const culture = { intentra: { risk_gates: { [ruleId]: 'allow' } } };
      const r = evaluateCommandGuard(command, culture);
      expect(r.verdict).toBe('allow');
      expect(r.pattern).toBe(ruleId);
      expect(r.risk_score).toBe(Math.min(100, Math.round(baseRisk * 0.12)));
    });

    test(`warn override for ${ruleId}: verdict=warn, risk_score=${Math.round(baseRisk * 0.72)}`, () => {
      const culture = { intentra: { risk_gates: { [ruleId]: 'warn' } } };
      const r = evaluateCommandGuard(command, culture);
      expect(r.verdict).toBe('warn');
      expect(r.pattern).toBe(ruleId);
      expect(r.risk_score).toBe(Math.min(100, Math.round(baseRisk * 0.72)));
    });

    test(`deny override for ${ruleId}: verdict=deny, risk_score=${baseRisk}`, () => {
      const culture = { intentra: { risk_gates: { [ruleId]: 'deny' } } };
      const r = evaluateCommandGuard(command, culture);
      expect(r.verdict).toBe('deny');
      expect(r.pattern).toBe(ruleId);
      expect(r.risk_score).toBe(Math.min(100, baseRisk));
    });
  }
});

// ─── Culture key validation ─────────────────────────────────────────────────

describe('validateRiskGateKeys', () => {
  test('valid keys produce no warnings', () => {
    const culture = {
      intentra: {
        risk_gates: {
          rm_recursive: 'allow',
          git_force_push: 'warn',
          docker_destructive: 'deny',
        },
      },
    };
    expect(validateRiskGateKeys(culture)).toEqual([]);
  });

  test('unknown keys produce warnings', () => {
    const culture = {
      intentra: {
        risk_gates: {
          rm_recursive: 'allow',
          some_typo: 'deny',
          another_bad: 'warn',
        },
      },
    };
    const warnings = validateRiskGateKeys(culture);
    expect(warnings.length).toBe(2);
    expect(warnings.some(w => w.includes('some_typo'))).toBe(true);
    expect(warnings.some(w => w.includes('another_bad'))).toBe(true);
  });

  test('null culture produces no warnings', () => {
    expect(validateRiskGateKeys(null)).toEqual([]);
  });

  test('culture without intentra key produces no warnings', () => {
    expect(validateRiskGateKeys({ other: 'data' })).toEqual([]);
  });

  test('culture with intentra but no risk_gates produces no warnings', () => {
    expect(validateRiskGateKeys({ intentra: {} })).toEqual([]);
  });
});

// ─── Culture warnings surfaced in guard response ────────────────────────────

describe('culture_warnings in guard response', () => {
  test('unknown keys appear in culture_warnings field', () => {
    const culture = { intentra: { risk_gates: { fake_rule: 'deny' } } };
    const r = evaluateCommandGuard('ls', culture);
    expect(r.culture_warnings).toBeDefined();
    expect(r.culture_warnings!.some(w => w.includes('fake_rule'))).toBe(true);
  });

  test('valid keys → no culture_warnings', () => {
    const culture = { intentra: { risk_gates: { rm_recursive: 'allow' } } };
    const r = evaluateCommandGuard('ls', culture);
    expect(r.culture_warnings).toBeUndefined();
  });

  test('mix of valid and invalid keys → only invalid ones warned', () => {
    const culture = {
      intentra: {
        risk_gates: {
          rm_recursive: 'allow',
          nonexistent_rule: 'deny',
        },
      },
    };
    const r = evaluateCommandGuard('ls', culture);
    expect(r.culture_warnings?.length).toBe(1);
    expect(r.culture_warnings![0]).toContain('nonexistent_rule');
  });
});

// ─── readCultureSnapshot ────────────────────────────────────────────────────

describe('readCultureSnapshot with real file', () => {
  let tmpDir: string;
  let savedStateDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'culture-adv-'));
    savedStateDir = process.env.GSTACK_STATE_DIR;
    process.env.GSTACK_STATE_DIR = tmpDir;
  });

  afterEach(() => {
    if (savedStateDir !== undefined) {
      process.env.GSTACK_STATE_DIR = savedStateDir;
    } else {
      delete process.env.GSTACK_STATE_DIR;
    }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  test('valid culture.json with risk_gates', () => {
    const culture = {
      intentra: {
        risk_gates: {
          rm_recursive: 'warn',
          git_force_push: 'allow',
        },
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'culture.json'), JSON.stringify(culture));
    const snap = readCultureSnapshot();
    expect(snap.loaded).toBe(true);
    expect(snap.culture).toEqual(culture);
    expect(snap.error).toBeNull();
  });

  test('empty JSON object is valid', () => {
    fs.writeFileSync(path.join(tmpDir, 'culture.json'), '{}');
    const snap = readCultureSnapshot();
    expect(snap.loaded).toBe(true);
    expect(snap.culture).toEqual({});
  });

  test('nested culture with extra fields does not break', () => {
    const culture = {
      team: 'backend',
      intentra: {
        risk_gates: { rm_recursive: 'allow' },
        extra_field: true,
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'culture.json'), JSON.stringify(culture));
    const snap = readCultureSnapshot();
    expect(snap.loaded).toBe(true);
  });

  test('gstackCulturePath reflects GSTACK_STATE_DIR', () => {
    const p = gstackCulturePath();
    expect(p).toContain(tmpDir);
    expect(p).toContain('culture.json');
  });
});
