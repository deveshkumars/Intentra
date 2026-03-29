import { describe, test, expect } from 'bun:test';
import { buildCommandContext, normalizeCommand, tokenizeShell } from './guard-command';

describe('normalizeCommand', () => {
  test('NFKC trim and collapse whitespace', () => {
    expect(normalizeCommand('  rm   -rf\t./src  ')).toBe('rm -rf ./src');
  });
});

describe('tokenizeShell', () => {
  test('splits simple words', () => {
    expect(tokenizeShell('git push origin main')).toEqual(['git', 'push', 'origin', 'main']);
  });

  test('respects double quotes', () => {
    expect(tokenizeShell('rm -rf "weird name"')).toEqual(['rm', '-rf', 'weird name']);
  });

  test('respects single quotes', () => {
    expect(tokenizeShell("echo 'a b'")).toEqual(['echo', 'a b']);
  });
});

describe('buildCommandContext', () => {
  test('produces aligned normalized lower tokens', () => {
    const ctx = buildCommandContext('  Git   PUSH   --force  ');
    expect(ctx.tokens[0]?.toLowerCase()).toBe('git');
    expect(ctx.tokens[1]?.toLowerCase()).toBe('push');
    expect(ctx.lower).toContain('git push');
  });
});
