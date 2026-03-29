import { describe, test, expect } from 'bun:test';
import { evaluateCommandGuard, splitGuardSegments } from './guard';

describe('splitGuardSegments', () => {
  test('splits on && outside quotes', () => {
    expect(splitGuardSegments('git status && git push')).toEqual(['git status', 'git push']);
  });

  test('splits on ; outside quotes', () => {
    expect(splitGuardSegments('ls; rm -rf ./src')).toEqual(['ls', 'rm -rf ./src']);
  });

  test('does not split && inside double quotes', () => {
    expect(splitGuardSegments('echo "a && b"')).toEqual(['echo "a && b"']);
  });
});

describe('evaluateCommandGuard compound', () => {
  test('denies when any segment matches deny (git status && git push --force)', () => {
    const r = evaluateCommandGuard('git status && git push --force origin main', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('git_force_push');
    expect(r.compound?.segment_count).toBe(2);
    expect(r.compound?.decisive_segment_index).toBe(2);
  });

  test('denies on second clause after benign first (ls; rm -rf ./src)', () => {
    const r = evaluateCommandGuard('ls; rm -rf ./src', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
    expect(r.compound?.segment_count).toBe(2);
    expect(r.compound?.decisive_segment_index).toBe(2);
  });

  test('allows multiple benign segments', () => {
    const r = evaluateCommandGuard('ls -la && pwd', null);
    expect(r.verdict).toBe('allow');
    expect(r.compound?.segment_count).toBe(2);
    expect(r.compound?.decisive_segment_index).toBeNull();
  });

  test('single segment behavior unchanged (no compound fields required for semantics)', () => {
    const r = evaluateCommandGuard('git push --force', null);
    expect(r.verdict).toBe('deny');
    expect(r.compound?.segment_count).toBe(1);
    expect(r.compound?.decisive_segment_index).toBe(1);
  });

  test('debug includes compound phase and per-segment trace prefixes', () => {
    const r = evaluateCommandGuard('ls && ls', null, { debug: true });
    expect(r.trace?.some((t) => t.phase === 'compound')).toBe(true);
    expect(r.trace?.some((t) => t.phase.startsWith('s1:'))).toBe(true);
    expect(r.trace?.some((t) => t.phase.startsWith('s2:'))).toBe(true);
  });

  test('max risk_score across segments when both match rules', () => {
    const r = evaluateCommandGuard('docker system prune; git push --force', null);
    expect(r.verdict).toBe('deny');
    const single = evaluateCommandGuard('git push --force', null);
    expect(r.risk_score).toBeGreaterThanOrEqual(single.risk_score);
  });
});
