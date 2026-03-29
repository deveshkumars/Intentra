/**
 * Declarative guard rules: ordered registry, categories, risk weights, matchers.
 * Order matches careful/bin/check-careful.sh priority (rm before git, etc.).
 */

import type { CommandContext, GuardRule, GuardVerdict } from './guard-types';

function isSafeRmTarget(token: string): boolean {
  const t = token.replace(/\/+$/, '');
  return /(^|\/)(node_modules|\.next|dist|__pycache__|\.cache|build|\.turbo|coverage)$/.test(t);
}

function hasRecursiveRmFlag(tokens: string[], rmIndex: number): boolean {
  for (let j = rmIndex + 1; j < tokens.length; j++) {
    const x = tokens[j]!;
    if (!x.startsWith('-')) break;
    if (x === '--recursive') return true;
    if (/^-[a-zA-Z]*r[a-zA-Z]*/i.test(x)) return true;
  }
  return false;
}

function rmPathTokens(tokens: string[], rmIndex: number): string[] {
  let j = rmIndex + 1;
  while (j < tokens.length && tokens[j]!.startsWith('-')) j++;
  const out: string[] = [];
  for (; j < tokens.length; j++) {
    const t = tokens[j]!;
    if (!t.startsWith('-')) out.push(t);
  }
  return out;
}

function matchRmRecursive(ctx: CommandContext): boolean {
  const t = ctx.tokens;
  for (let i = 0; i < t.length; i++) {
    if (t[i]!.toLowerCase() !== 'rm') continue;
    if (!hasRecursiveRmFlag(t, i)) continue;
    const paths = rmPathTokens(t, i);
    if (paths.length === 0) return true;
    for (const p of paths) {
      if (!isSafeRmTarget(p)) return true;
    }
  }
  return false;
}

function matchGitForcePush(ctx: CommandContext): boolean {
  const t = ctx.tokens.map((x) => x.toLowerCase());
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== 'git' || t[i + 1] !== 'push') continue;
    for (let j = i + 2; j < t.length; j++) {
      const x = t[j]!;
      if (x === '--force' || x === '-f') return true;
      if (x.startsWith('-') && x !== '--' && x.includes('f')) return true;
    }
  }
  return false;
}

/** Exported for GET /intentra/guard/rules — stable contract */
export const GUARD_RULES: readonly GuardRule[] = [
  {
    id: 'rm_recursive',
    category: 'filesystem',
    cweHints: ['CWE-782'],
    defaultVerdict: 'deny',
    baseRisk: 88,
    description: 'Recursive file deletion outside known safe artifact directories.',
    match: matchRmRecursive,
  },
  {
    id: 'drop_table',
    category: 'sql',
    cweHints: ['CWE-89'],
    defaultVerdict: 'deny',
    baseRisk: 92,
    description: 'SQL DROP TABLE / DROP DATABASE.',
    match: (ctx) => /\bdrop\s+(table|database)\b/.test(ctx.lower),
  },
  {
    id: 'truncate',
    category: 'sql',
    cweHints: ['CWE-89'],
    defaultVerdict: 'deny',
    baseRisk: 85,
    description: 'SQL TRUNCATE (bulk row wipe).',
    match: (ctx) => /\btruncate\b/.test(ctx.lower),
  },
  {
    id: 'git_force_push',
    category: 'vcs',
    cweHints: ['CWE-183'],
    defaultVerdict: 'deny',
    baseRisk: 82,
    description: 'Git force-push (history rewrite on remote).',
    match: matchGitForcePush,
  },
  {
    id: 'git_reset_hard',
    category: 'vcs',
    defaultVerdict: 'deny',
    baseRisk: 78,
    description: 'git reset --hard (discard tracked + index changes).',
    match: (ctx) => /\bgit\s+reset\s+--hard\b/.test(ctx.normalized),
  },
  {
    id: 'git_discard',
    category: 'vcs',
    defaultVerdict: 'deny',
    baseRisk: 72,
    description: 'git checkout . / git restore . (mass discard working tree).',
    match: (ctx) => /\bgit\s+(checkout|restore)\s+\./.test(ctx.normalized),
  },
  {
    id: 'kubectl_delete',
    category: 'orchestration',
    defaultVerdict: 'deny',
    baseRisk: 80,
    description: 'kubectl delete (cluster resource removal).',
    match: (ctx) => /\bkubectl\s+delete\b/.test(ctx.normalized),
  },
  {
    id: 'docker_destructive',
    category: 'container',
    defaultVerdict: 'deny',
    baseRisk: 75,
    description: 'docker rm -f / docker system prune.',
    match: (ctx) => /\bdocker\s+(rm\s+-f|system\s+prune)\b/.test(ctx.normalized),
  },
] as const;

export const GUARD_RULE_IDS: ReadonlySet<string> = new Set(GUARD_RULES.map((r) => r.id));

export function findFirstMatchingRule(ctx: CommandContext): GuardRule | null {
  for (const rule of GUARD_RULES) {
    try {
      if (rule.match(ctx)) return rule;
    } catch {
      /* treat matcher failure as non-match */
    }
  }
  return null;
}

/** Public metadata for introspection (no functions) */
export function listGuardRulePublicMeta(): Array<{
  id: string;
  category: string;
  default_verdict: GuardVerdict;
  base_risk: number;
  description: string;
  cwe_hints?: string[];
}> {
  return GUARD_RULES.map((r) => ({
    id: r.id,
    category: r.category,
    default_verdict: r.defaultVerdict,
    base_risk: r.baseRisk,
    description: r.description,
    cwe_hints: r.cweHints,
  }));
}
