/**
 * Intentra command guard — policy engine facade (registry + tokenizer + culture gates).
 */

import fs from 'fs';
import path from 'path';
import { buildCommandContext } from './guard-command';
import { splitGuardSegments } from './guard-segment';
import {
  findFirstMatchingRule,
  GUARD_RULE_IDS,
  GUARD_RULES,
  listGuardRulePublicMeta,
} from './guard-policy';
import type {
  CommandContext,
  GuardEvaluation,
  GuardEvaluationOptions,
  GuardVerdict,
} from './guard-types';

export type { GuardEvaluation, GuardVerdict, GuardEvaluationOptions } from './guard-types';
export { listGuardRulePublicMeta } from './guard-policy';
export { buildCommandContext, normalizeCommand, tokenizeShell } from './guard-command';
export { splitGuardSegments } from './guard-segment';

const SOURCE = 'intentra_guard' as const;

function extractRiskGates(culture: unknown): Record<string, string> | null {
  if (!culture || typeof culture !== 'object') return null;
  const intentra = (culture as { intentra?: { risk_gates?: Record<string, string> } }).intentra;
  const gates = intentra?.risk_gates;
  if (!gates || typeof gates !== 'object') return null;
  return gates;
}

/** Validate culture keys; unknown pattern ids are reported (typos, drift). */
export function validateRiskGateKeys(culture: unknown): string[] {
  const gates = extractRiskGates(culture);
  if (!gates) return [];
  const warnings: string[] = [];
  for (const k of Object.keys(gates)) {
    if (!GUARD_RULE_IDS.has(k)) {
      warnings.push(`unknown intentra.risk_gates key "${k}" (not in policy registry)`);
    }
  }
  return warnings;
}

function resolveVerdictFromCulture(
  culture: unknown,
  patternId: string,
  ruleDefault: GuardVerdict,
): GuardVerdict {
  const gates = extractRiskGates(culture);
  if (!gates) return ruleDefault;
  const v = gates[patternId];
  if (v === 'allow' || v === 'warn' || v === 'deny') return v;
  return ruleDefault;
}

function computeRiskScore(
  baseRisk: number,
  verdict: GuardVerdict,
): number {
  if (verdict === 'deny') return Math.min(100, baseRisk);
  if (verdict === 'warn') return Math.min(100, Math.round(baseRisk * 0.72));
  return Math.min(100, Math.round(baseRisk * 0.12));
}

function buildTrace(
  ctx: CommandContext,
  ruleId: string | null,
  phases: Array<{ phase: string; detail: string }>,
): Array<{ phase: string; detail: string }> {
  const head = [
    { phase: 'normalize', detail: `nfkc+ws; len=${ctx.normalized.length}` },
    { phase: 'tokenize', detail: `tokens=${ctx.tokens.length}` },
  ];
  const tail = ruleId
    ? [{ phase: 'match', detail: `first_hit=${ruleId}` }]
    : [{ phase: 'match', detail: 'no_rule_matched' }];
  return [...head, ...phases, ...tail];
}

type SegmentEval = {
  verdict: GuardVerdict;
  pattern?: string;
  message?: string;
  rule?: GuardEvaluation['rule'];
  risk_score: number;
  trace?: Array<{ phase: string; detail: string }>;
};

/** One segment after compound split — same rule scan as legacy single-string guard. */
function evaluateSegmentInner(
  raw: string,
  culture: unknown | null,
  debug: boolean,
): SegmentEval {
  const ctx = buildCommandContext(raw);
  const phases: Array<{ phase: string; detail: string }> = [];

  if (debug) {
    for (const r of GUARD_RULES) {
      let hit = false;
      try {
        hit = r.match(ctx);
      } catch {
        hit = false;
      }
      phases.push({ phase: `rule:${r.id}`, detail: hit ? 'matched' : 'skip' });
    }
  }

  const rule = findFirstMatchingRule(ctx);
  if (!rule) {
    return {
      verdict: 'allow',
      risk_score: 0,
      trace: debug ? buildTrace(ctx, null, phases) : undefined,
    };
  }

  const gate = resolveVerdictFromCulture(culture, rule.id, rule.defaultVerdict);
  const risk_score = computeRiskScore(rule.baseRisk, gate);
  const baseMsg = rule.description;
  const ruleMeta = {
    id: rule.id,
    category: rule.category,
    baseRisk: rule.baseRisk,
    cwe_hints: rule.cweHints,
  };

  if (gate === 'allow') {
    return {
      verdict: 'allow',
      pattern: rule.id,
      message: `${baseMsg} (culture allows this pattern.)`,
      rule: ruleMeta,
      risk_score,
      trace: debug ? buildTrace(ctx, rule.id, phases) : undefined,
    };
  }
  if (gate === 'warn') {
    return {
      verdict: 'warn',
      pattern: rule.id,
      message: `[intentra guard] WARN: ${baseMsg}`,
      rule: ruleMeta,
      risk_score,
      trace: debug ? buildTrace(ctx, rule.id, phases) : undefined,
    };
  }
  return {
    verdict: 'deny',
    pattern: rule.id,
    message: `[intentra guard] DENY: ${baseMsg}`,
    rule: ruleMeta,
    risk_score,
    trace: debug ? buildTrace(ctx, rule.id, phases) : undefined,
  };
}

export function evaluateCommandGuard(
  command: string,
  culture: unknown | null,
  options?: GuardEvaluationOptions,
): GuardEvaluation {
  const debug = options?.debug === true;
  const culture_warnings = validateRiskGateKeys(culture ?? undefined);

  const raw = command.trim();
  if (!raw) {
    return {
      verdict: 'allow',
      source: SOURCE,
      risk_score: 0,
      culture_warnings: culture_warnings.length ? culture_warnings : undefined,
      trace: debug ? [{ phase: 'empty', detail: 'allow' }] : undefined,
    };
  }

  const split = splitGuardSegments(raw);
  const nonEmpty = split.map((s) => s.trim()).filter(Boolean);
  const segmentsToEval = nonEmpty.length > 0 ? nonEmpty : [raw];

  let worst: GuardVerdict = 'allow';
  let rep: SegmentEval | null = null;
  let decisiveIdx: number | null = null;
  let maxRisk = 0;
  /** First segment that matched a rule but resolved to allow (culture/default) — surfaces pattern like single-string guard */
  let allowRep: SegmentEval | null = null;
  const allTraces: Array<{ phase: string; detail: string }> = [];

  if (debug) {
    allTraces.push({
      phase: 'compound',
      detail: `segments=${segmentsToEval.length};split=&&|;quote_aware`,
    });
  }

  for (let si = 0; si < segmentsToEval.length; si++) {
    const seg = segmentsToEval[si]!;
    const e = evaluateSegmentInner(seg, culture, debug);
    maxRisk = Math.max(maxRisk, e.risk_score);
    if (e.verdict === 'allow' && e.pattern && !allowRep) {
      allowRep = e;
    }
    if (e.verdict === 'deny') {
      if (worst !== 'deny') {
        worst = 'deny';
        rep = e;
        decisiveIdx = si + 1;
      }
    } else if (e.verdict === 'warn' && worst === 'allow') {
      worst = 'warn';
      rep = e;
      decisiveIdx = si + 1;
    }
    if (debug && e.trace) {
      for (const t of e.trace) {
        allTraces.push({ phase: `s${si + 1}:${t.phase}`, detail: t.detail });
      }
    }
  }

  const compound = {
    segment_count: segmentsToEval.length,
    decisive_segment_index: worst === 'allow' ? null : decisiveIdx,
  };

  if (worst === 'allow') {
    return {
      verdict: 'allow',
      pattern: allowRep?.pattern,
      message: allowRep?.message,
      rule: allowRep?.rule,
      source: SOURCE,
      risk_score: maxRisk,
      culture_warnings: culture_warnings.length ? culture_warnings : undefined,
      compound,
      trace: debug ? allTraces : undefined,
    };
  }

  const e = rep!;
  return {
    verdict: worst,
    pattern: e.pattern,
    message: e.message,
    source: SOURCE,
    rule: e.rule,
    risk_score: maxRisk,
    culture_warnings: culture_warnings.length ? culture_warnings : undefined,
    compound,
    trace: debug ? allTraces : undefined,
  };
}

export function intentraRepoRoot(): string {
  return process.env.INTENTRA_REPO_ROOT ?? process.cwd();
}

export function appendIntentraGuardTelemetry(entry: {
  event: 'intentra_guard';
  verdict: GuardVerdict;
  pattern?: string;
  ts: string;
  repo?: string;
  risk_score?: number;
  guard_engine_version?: number;
}): void {
  const root = intentraRepoRoot();
  const dir = path.join(root, '.intentra', 'telemetry');
  try {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'intentra-guard.jsonl');
    const line = { ...entry, repo: entry.repo ?? path.basename(path.resolve(root)) };
    fs.appendFileSync(file, `${JSON.stringify(line)}\n`, 'utf-8');
  } catch {
    /* never block caller */
  }
}
