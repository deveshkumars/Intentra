import { describe, test, expect } from 'bun:test';
import { evaluateCommandGuard } from './guard';

describe('evaluateCommandGuard', () => {
  test('allows benign commands', () => {
    const r = evaluateCommandGuard('ls -la', null);
    expect(r.verdict).toBe('allow');
    expect(r.pattern).toBeUndefined();
  });

  test('denies git force-push by default', () => {
    const r = evaluateCommandGuard('git push --force origin main', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('git_force_push');
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
});
