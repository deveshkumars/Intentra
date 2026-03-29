import { describe, test, expect } from 'bun:test';
import { evaluateCommandGuard, validateRiskGateKeys } from './guard';

describe('evaluateCommandGuard', () => {
  test('allows benign commands', () => {
    const r = evaluateCommandGuard('ls -la', null);
    expect(r.verdict).toBe('allow');
    expect(r.pattern).toBeUndefined();
    expect(r.risk_score).toBe(0);
  });

  test('denies git force-push by default with rule metadata + risk', () => {
    const r = evaluateCommandGuard('git push --force origin main', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('git_force_push');
    expect(r.rule?.id).toBe('git_force_push');
    expect(r.rule?.category).toBe('vcs');
    expect(r.risk_score).toBeGreaterThan(0);
  });

  test('allows safe recursive rm targets', () => {
    const r = evaluateCommandGuard('rm -rf node_modules', null);
    expect(r.verdict).toBe('allow');
  });

  test('denies unsafe recursive rm', () => {
    const r = evaluateCommandGuard('rm -rf ./src', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
  });

  test('quoted rm targets tokenize as single path', () => {
    const r = evaluateCommandGuard('rm -rf "src app"', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
  });

  test('culture risk_gates allow overrides deny', () => {
    const culture = { intentra: { risk_gates: { git_force_push: 'allow' } } };
    const r = evaluateCommandGuard('git push -f', culture);
    expect(r.verdict).toBe('allow');
    expect(r.pattern).toBe('git_force_push');
  });

  test('culture risk_gates warn', () => {
    const culture = { intentra: { risk_gates: { docker_destructive: 'warn' } } };
    const r = evaluateCommandGuard('docker system prune', culture);
    expect(r.verdict).toBe('warn');
    expect(r.pattern).toBe('docker_destructive');
  });

  test('unknown risk_gates keys surface culture_warnings', () => {
    const culture = { intentra: { risk_gates: { not_a_registered_rule: 'deny' } } };
    expect(validateRiskGateKeys(culture).length).toBeGreaterThan(0);
    const r = evaluateCommandGuard('ls', culture);
    expect(r.culture_warnings?.some((w) => w.includes('not_a_registered_rule'))).toBe(true);
  });

  test('debug mode emits per-rule trace', () => {
    const r = evaluateCommandGuard('ls', null, { debug: true });
    expect(r.trace?.some((t) => t.phase === 'rule:rm_recursive')).toBe(true);
    expect(r.trace?.some((t) => t.phase === 'match')).toBe(true);
  });
});
