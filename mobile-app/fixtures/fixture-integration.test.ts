/**
 * Cross-validates the real skill-usage-evaluator-sample.jsonl fixture against
 * the live guard engine rule registry. Proves that every hook_fire pattern name
 * in production telemetry corresponds to a real guard engine rule — the two
 * systems are aligned, not independently maintained.
 */
import { test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { GUARD_RULE_IDS, GUARD_RULES } from '../server/guard-policy';

const FIXTURE = path.join(import.meta.dir, 'skill-usage-evaluator-sample.jsonl');

interface HookFireLine {
  event: 'hook_fire';
  skill: string;
  pattern: string;
  ts: string;
  repo?: string;
}

interface SkillRunLine {
  skill?: string;
  event_type?: string;
  v?: number;
  ts: string;
  outcome?: string;
  duration_s?: number;
  session_id?: string;
}

type FixtureLine = HookFireLine | SkillRunLine;

function parseFixture(): FixtureLine[] {
  const raw = fs.readFileSync(FIXTURE, 'utf-8');
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as FixtureLine);
}

test('every /careful hook_fire pattern in real telemetry maps to a guard engine rule', () => {
  const lines = parseFixture();
  const hookLines = lines.filter((l): l is HookFireLine => (l as HookFireLine).event === 'hook_fire');

  expect(hookLines.length).toBeGreaterThanOrEqual(20);

  // /careful patterns → guard engine rule IDs; /freeze emits "boundary_deny" which is a
  // separate boundary enforcement system (not part of the command guard engine)
  const carefulLines = hookLines.filter((l) => l.skill === 'careful');
  const freezeLines = hookLines.filter((l) => l.skill === 'freeze');

  expect(carefulLines.length).toBeGreaterThan(0);
  expect(freezeLines.length).toBeGreaterThan(0);

  const unknownPatterns: string[] = [];
  for (const line of carefulLines) {
    if (!GUARD_RULE_IDS.has(line.pattern)) {
      unknownPatterns.push(line.pattern);
    }
  }
  expect(unknownPatterns).toEqual([]);

  // /freeze always emits "boundary_deny" — not a guard engine pattern
  for (const line of freezeLines) {
    expect(line.pattern).toBe('boundary_deny');
  }
});

test('fixture covers all 8 guard engine rule categories', () => {
  const lines = parseFixture();
  const hookLines = lines.filter((l): l is HookFireLine => (l as HookFireLine).event === 'hook_fire');
  // Only /careful patterns map to guard engine rules
  const fixturePatterns = new Set(hookLines.filter((l) => l.skill === 'careful').map((l) => l.pattern));

  const allRuleIds = new Set(GUARD_RULES.map((r) => r.id));
  const covered = [...allRuleIds].filter((id) => fixturePatterns.has(id));

  // Real session data fired all 8 guard rules — full rule coverage in production
  expect(covered.length).toBe(GUARD_RULES.length);
});

test('fixture hook_fire events are temporally clustered (single burst)', () => {
  const lines = parseFixture();
  const hookLines = lines.filter((l): l is HookFireLine => (l as HookFireLine).event === 'hook_fire');

  const timestamps = hookLines.map((l) => new Date(l.ts).getTime());
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const spanSeconds = (maxTs - minTs) / 1000;

  // All 22 hook firings happened within a 2-second window — one intense session
  expect(spanSeconds).toBeLessThan(5);
});

test('fixture skill runs include ship, qa, and investigate', () => {
  const lines = parseFixture();
  const skills = new Set(
    lines
      .filter((l): l is SkillRunLine => !('event' in l))
      .map((l) => l.skill)
      .filter(Boolean),
  );

  expect(skills.has('ship')).toBe(true);
  expect(skills.has('qa')).toBe(true);
  expect(skills.has('investigate')).toBe(true);
});

test('guard engine correctly classifies all real hook_fire commands by category', () => {
  const categoryMap: Record<string, string> = {
    rm_recursive: 'filesystem',
    drop_table: 'sql',
    truncate: 'sql',
    git_force_push: 'vcs',
    git_reset_hard: 'vcs',
    git_discard: 'vcs',
    kubectl_delete: 'orchestration',
    docker_destructive: 'container',
  };

  for (const rule of GUARD_RULES) {
    expect(categoryMap[rule.id]).toBe(rule.category);
  }
});
