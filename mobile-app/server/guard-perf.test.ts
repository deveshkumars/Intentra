import { describe, test, expect } from 'bun:test';
import { evaluateCommandGuard } from './guard';

const samples = [
  'ls -la',
  'git push --force origin main',
  'rm -rf ./src',
  'docker system prune',
  'kubectl delete pod foo',
  'DROP TABLE users;',
  'git reset --hard HEAD',
];

describe('evaluateCommandGuard performance', () => {
  test('N representative commands complete within budget', () => {
    const iterations = 50;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      for (const s of samples) {
        evaluateCommandGuard(s, null);
      }
    }
    const ms = performance.now() - t0;
    const perBatchMs = ms / iterations;
    expect(perBatchMs).toBeLessThan(10);
  });
});
