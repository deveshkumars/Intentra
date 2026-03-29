/**
 * Command normalization and shell-like tokenization for policy matching.
 * Handles quoted segments so `rm -rf "my dir"` splits targets sanely.
 */

import type { CommandContext } from './guard-types';

/** Unicode NFKC + trim + internal whitespace collapse */
export function normalizeCommand(raw: string): string {
  const s = raw.normalize('NFKC').trim().replace(/\s+/g, ' ');
  return s;
}

/**
 * Tokenize like a minimal POSIX shell: spaces split; single/double quotes group;
 * backslash escapes inside double quotes only (common Claude/bash snippet shape).
 */
export function tokenizeShell(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  let cur = '';
  let quote: "'" | '"' | null = null;

  const push = () => {
    if (cur.length > 0) {
      tokens.push(cur);
      cur = '';
    }
  };

  while (i < input.length) {
    const c = input[i]!;

    if (quote === "'") {
      if (c === "'") {
        quote = null;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }

    if (quote === '"') {
      if (c === '\\' && input[i + 1]) {
        cur += input[i + 1]!;
        i += 2;
        continue;
      }
      if (c === '"') {
        quote = null;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }

    if (c === "'" || c === '"') {
      quote = c as "'" | '"';
      i++;
      continue;
    }

    if (/\s/.test(c)) {
      push();
      i++;
      continue;
    }

    cur += c;
    i++;
  }
  push();
  return tokens;
}

export function buildCommandContext(raw: string): CommandContext {
  const normalized = normalizeCommand(raw);
  return {
    raw: raw.trim(),
    normalized,
    lower: normalized.toLowerCase(),
    tokens: tokenizeShell(normalized),
  };
}
