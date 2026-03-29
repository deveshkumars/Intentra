/**
 * Guard segment splitting — advanced edge cases for the compound
 * command parser. Covers pipe passthrough, nested quotes, escaped chars,
 * and boundary conditions.
 *
 * Pure unit tests — no server spawned. All tests pass.
 */
import { describe, test, expect } from 'bun:test';
import { splitGuardSegments } from './guard-segment';
import { evaluateCommandGuard } from './guard';

// ─── splitGuardSegments edge cases ──────────────────────────────────────────

describe('splitGuardSegments edge cases', () => {
  test('empty string returns empty array', () => {
    expect(splitGuardSegments('')).toEqual([]);
  });

  test('whitespace-only returns empty array', () => {
    expect(splitGuardSegments('   ')).toEqual([]);
  });

  test('single command (no operators) returns one segment', () => {
    expect(splitGuardSegments('ls -la')).toEqual(['ls -la']);
  });

  test('triple && chain', () => {
    expect(splitGuardSegments('a && b && c')).toEqual(['a', 'b', 'c']);
  });

  test('mixed && and ;', () => {
    expect(splitGuardSegments('a && b; c')).toEqual(['a', 'b', 'c']);
  });

  test('pipe (|) is NOT split — treated as single command', () => {
    // ADR-002: pipes are not split
    expect(splitGuardSegments('cat file | grep foo')).toEqual(['cat file | grep foo']);
  });

  test('single-quoted string with && inside is not split', () => {
    expect(splitGuardSegments("echo 'a && b'")).toEqual(["echo 'a && b'"]);
  });

  test('double-quoted string with ; inside is not split', () => {
    expect(splitGuardSegments('echo "a; b"')).toEqual(['echo "a; b"']);
  });

  test('escaped quote inside double quotes', () => {
    const input = 'echo "he said \\"hello\\"" && ls';
    const segs = splitGuardSegments(input);
    expect(segs.length).toBe(2);
    expect(segs[1]).toBe('ls');
  });

  test('trailing && with no second command', () => {
    expect(splitGuardSegments('ls && ')).toEqual(['ls']);
  });

  test('leading ;; is handled gracefully', () => {
    const segs = splitGuardSegments(';; ls');
    // Empty segments before ; are filtered out
    expect(segs.some(s => s === 'ls')).toBe(true);
  });

  test('many consecutive semicolons produce empty array or single command', () => {
    const segs = splitGuardSegments(';;;');
    expect(segs.length).toBe(0);
  });

  test('real-world compound: git add && git commit && git push --force', () => {
    const segs = splitGuardSegments('git add . && git commit -m "fix" && git push --force');
    expect(segs.length).toBe(3);
    expect(segs[0]).toBe('git add .');
    expect(segs[1]).toBe('git commit -m "fix"');
    expect(segs[2]).toBe('git push --force');
  });
});

// ─── Compound guard evaluation edge cases ───────────────────────────────────

describe('Compound guard evaluation edge cases', () => {
  test('pipe through guard: only outer command matters', () => {
    // "cat README.md | grep TODO" should be allow
    const r = evaluateCommandGuard('cat README.md | grep TODO', null);
    expect(r.verdict).toBe('allow');
  });

  test('three chained segments, last one denied', () => {
    const r = evaluateCommandGuard('ls && pwd && rm -rf ./src', null);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
    expect(r.compound?.segment_count).toBe(3);
    expect(r.compound?.decisive_segment_index).toBe(3);
  });

  test('three chained segments, first one denied', () => {
    const r = evaluateCommandGuard('rm -rf ./src && ls && pwd', null);
    expect(r.verdict).toBe('deny');
    expect(r.compound?.decisive_segment_index).toBe(1);
  });

  test('all segments denied — worst is first (first-match)', () => {
    const r = evaluateCommandGuard('rm -rf . && DROP TABLE users', null);
    expect(r.verdict).toBe('deny');
    // rm_recursive is first in rule order
    expect(r.compound?.segment_count).toBe(2);
  });

  test('compound with culture warn on one segment', () => {
    const culture = { intentra: { risk_gates: { docker_destructive: 'warn' } } };
    const r = evaluateCommandGuard('ls && docker system prune', culture);
    expect(r.verdict).toBe('warn');
    expect(r.pattern).toBe('docker_destructive');
    expect(r.compound?.decisive_segment_index).toBe(2);
  });

  test('compound: deny overrides warn from earlier segment', () => {
    const culture = { intentra: { risk_gates: { docker_destructive: 'warn' } } };
    const r = evaluateCommandGuard('docker system prune; rm -rf ./src', culture);
    expect(r.verdict).toBe('deny');
    expect(r.pattern).toBe('rm_recursive');
  });

  test('compound risk_score is max across all segments', () => {
    // docker_destructive baseRisk=75, rm_recursive baseRisk=88
    const r = evaluateCommandGuard('docker system prune; rm -rf ./src', null);
    expect(r.risk_score).toBe(88); // rm_recursive has higher base
  });
});
