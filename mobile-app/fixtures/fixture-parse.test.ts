import { test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURE = path.join(import.meta.dir, 'skill-usage-evaluator-sample.jsonl');

test('evaluator skill-usage fixture: 20+ hook_fire and skill_run shapes', () => {
  const raw = fs.readFileSync(FIXTURE, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);
  let hookFire = 0;
  let skillRun = 0;
  for (const line of lines) {
    const o = JSON.parse(line) as Record<string, unknown>;
    if (o.event === 'hook_fire') hookFire++;
    if (o.event_type === 'skill_run') skillRun++;
  }
  expect(hookFire).toBeGreaterThanOrEqual(20);
  expect(skillRun).toBeGreaterThanOrEqual(1);
});
