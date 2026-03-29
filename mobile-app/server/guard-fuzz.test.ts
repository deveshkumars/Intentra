import { describe, test, expect } from 'bun:test';
import { buildCommandContext, normalizeCommand, tokenizeShell } from './guard-command';
import { evaluateCommandGuard } from './guard';
import { splitGuardSegments } from './guard-segment';

const ALPHABET =
  'abcABC012 \t\n;&|\'"`\\$(){}[]rm git push -rf./_가';

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randString(maxLen: number): string {
  const n = randInt(maxLen + 1);
  let s = '';
  for (let i = 0; i < n; i++) {
    s += ALPHABET[randInt(ALPHABET.length)]!;
  }
  return s;
}

describe('guard tokenizer / segment invariants (fuzz smoke)', () => {
  test('normalizeCommand + tokenizeShell + buildCommandContext never throw', () => {
    for (let i = 0; i < 400; i++) {
      const raw = randString(96);
      expect(() => normalizeCommand(raw)).not.toThrow();
      const norm = normalizeCommand(raw);
      let tokens: string[] = [];
      expect(() => {
        tokens = tokenizeShell(norm);
      }).not.toThrow();
      expect(Number.isFinite(tokens.length)).toBe(true);
      expect(tokens.length).toBeLessThan(10_000);
      expect(() => buildCommandContext(raw)).not.toThrow();
    }
  });

  test('splitGuardSegments never throws and returns finite segments', () => {
    for (let i = 0; i < 200; i++) {
      const raw = randString(96);
      let segs: string[] = [];
      expect(() => {
        segs = splitGuardSegments(raw);
      }).not.toThrow();
      expect(segs.length).toBeLessThan(500);
      for (const s of segs) {
        expect(typeof s).toBe('string');
      }
    }
  });
});

describe('evaluateCommandGuard invariants (fuzz smoke)', () => {
  test('verdict is allow|warn|deny and risk_score in [0,100]', () => {
    for (let i = 0; i < 300; i++) {
      const raw = randString(120);
      let r!: ReturnType<typeof evaluateCommandGuard>;
      expect(() => {
        r = evaluateCommandGuard(raw, null);
      }).not.toThrow();
      expect(['allow', 'warn', 'deny']).toContain(r.verdict);
      expect(r.risk_score).toBeGreaterThanOrEqual(0);
      expect(r.risk_score).toBeLessThanOrEqual(100);
    }
  });
});
