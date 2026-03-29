/**
 * Intentra-native command guard — executable policy in TypeScript (not SKILL.md prose).
 * Mirrors the destructive-pattern checks in careful/bin/check-careful.sh; gates are
 * overridden by culture.json → intentra.risk_gates[pattern] = deny | warn | allow.
 */

import fs from 'fs';
import path from 'path';

export type GuardVerdict = 'allow' | 'warn' | 'deny';

export interface GuardEvaluation {
  verdict: GuardVerdict;
  pattern?: string;
  message?: string;
  /** Always intentra_guard for this module */
  source: 'intentra_guard';
}

const SOURCE: GuardEvaluation['source'] = 'intentra_guard';

const PATTERN_MESSAGES: Record<string, string> = {
  rm_recursive: 'Recursive delete (rm -r) outside safe build-artifact paths.',
  drop_table: 'SQL DROP detected.',
  truncate: 'SQL TRUNCATE detected.',
  git_force_push: 'Git force-push rewrites remote history.',
  git_reset_hard: 'git reset --hard discards uncommitted work.',
  git_discard: 'Discards uncommitted changes in the working tree.',
  kubectl_delete: 'kubectl delete removes cluster resources.',
  docker_destructive: 'Docker force-remove or system prune.',
};

/** Same allowlist spirit as careful/bin/check-careful.sh */
function isSafeRmTarget(token: string): boolean {
  const t = token.replace(/\/+$/, '');
  return /(^|\/)(node_modules|\.next|dist|__pycache__|\.cache|build|\.turbo|coverage)$/.test(t);
}

function isRecursiveRmCommand(cmd: string): boolean {
  const i = cmd.search(/\brm\b/i);
  if (i < 0) return false;
  const rest = cmd.slice(i + 2).trim();
  const tokens = rest.split(/\s+/);
  for (const t of tokens) {
    if (!t.startsWith('-')) break;
    if (t === '--recursive' || /^-[a-zA-Z]*r[a-zA-Z]*/i.test(t)) return true;
  }
  return false;
}

function rmTargetsAfterFlags(cmd: string): string[] {
  const i = cmd.search(/\brm\b/i);
  let rest = cmd.slice(i + 2).trim();
  while (rest.length > 0) {
    const tok = rest.split(/\s+/)[0];
    if (!tok?.startsWith('-')) break;
    rest = rest.slice(tok.length).trim();
  }
  return rest ? rest.split(/\s+/).filter((t) => t && !t.startsWith('-')) : [];
}

function matchRmRecursive(cmd: string): boolean {
  if (!isRecursiveRmCommand(cmd)) return false;
  const targets = rmTargetsAfterFlags(cmd);
  for (const t of targets) {
    if (!isSafeRmTarget(t)) return true;
  }
  return false;
}

function matchDestructivePattern(cmd: string, cmdLower: string): string | null {
  if (matchRmRecursive(cmd)) return 'rm_recursive';
  if (/\bdrop\s+(table|database)\b/.test(cmdLower)) return 'drop_table';
  if (/\btruncate\b/.test(cmdLower)) return 'truncate';
  // Match `git push ... -f` and `git push ... --force` (see careful/bin/check-careful.sh)
  if (/\bgit\s+push\s+.*(-f\b|--force)/.test(cmd)) return 'git_force_push';
  if (/\bgit\s+reset\s+--hard\b/.test(cmd)) return 'git_reset_hard';
  if (/\bgit\s+(checkout|restore)\s+\./.test(cmd)) return 'git_discard';
  if (/\bkubectl\s+delete\b/.test(cmd)) return 'kubectl_delete';
  if (/\bdocker\s+(rm\s+-f|system\s+prune)\b/.test(cmd)) return 'docker_destructive';
  return null;
}

function getRiskGate(culture: unknown, pattern: string): GuardVerdict {
  if (!culture || typeof culture !== 'object') return 'deny';
  const intentra = (culture as { intentra?: { risk_gates?: Record<string, string> } }).intentra;
  const gates = intentra?.risk_gates;
  if (!gates || typeof gates !== 'object') return 'deny';
  const v = gates[pattern];
  if (v === 'allow') return 'allow';
  if (v === 'warn') return 'warn';
  if (v === 'deny') return 'deny';
  return 'deny';
}

export function evaluateCommandGuard(command: string, culture: unknown | null): GuardEvaluation {
  const cmd = command.trim();
  if (!cmd) {
    return { verdict: 'allow', source: SOURCE };
  }
  const cmdLower = cmd.toLowerCase();
  const pattern = matchDestructivePattern(cmd, cmdLower);
  if (!pattern) {
    return { verdict: 'allow', source: SOURCE };
  }
  const gate = getRiskGate(culture, pattern);
  const baseMsg = PATTERN_MESSAGES[pattern] ?? 'Policy match.';
  if (gate === 'allow') {
    return { verdict: 'allow', pattern, message: `${baseMsg} (culture allows this pattern.)`, source: SOURCE };
  }
  if (gate === 'warn') {
    return {
      verdict: 'warn',
      pattern,
      message: `[intentra guard] WARN: ${baseMsg}`,
      source: SOURCE,
    };
  }
  return {
    verdict: 'deny',
    pattern,
    message: `[intentra guard] DENY: ${baseMsg}`,
    source: SOURCE,
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
