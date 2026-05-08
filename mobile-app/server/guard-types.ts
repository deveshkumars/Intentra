/**
 * Shared types for the Intentra command guard policy engine.
 *
 * Type hierarchy:
 *   GuardVerdict       — allow | warn | deny (ordered severity)
 *   GuardCategory      — rule classification for dashboards
 *   CommandContext      — normalized + tokenized command for matchers
 *   GuardRule          — registry entry: metadata + matcher function
 *   GuardEvaluation    — full pipeline result returned to callers
 *
 * Verdict ordering (used by compound evaluation):
 *   deny > warn > allow — strictest verdict wins across segments.
 */

/** Guard verdict severity levels, ordered: deny > warn > allow. */
export type GuardVerdict = 'allow' | 'warn' | 'deny';

/** Verdict severity as a numeric value for comparison. */
export const VERDICT_SEVERITY: Readonly<Record<GuardVerdict, number>> = {
  allow: 0,
  warn: 1,
  deny: 2,
} as const;

/** Rule classification for grouping in dashboards and reports. */
export type GuardCategory = 'filesystem' | 'vcs' | 'sql' | 'container' | 'orchestration';

/**
 * Parsed command after normalization + shell-like tokenization.
 *
 * This is the single input to all rule matchers. The pipeline produces it
 * from a raw string via: NFKC normalize → whitespace collapse → tokenize.
 *
 * @example
 *   buildCommandContext('  ｒｍ  -rf  "my dir"  ')
 *   // → {
 *   //   raw: 'ｒｍ  -rf  "my dir"',
 *   //   normalized: 'rm -rf "my dir"',
 *   //   lower: 'rm -rf "my dir"',
 *   //   tokens: ['rm', '-rf', 'my dir']
 *   // }
 */
export interface CommandContext {
  /** Original input after trim (pre-normalization). */
  readonly raw: string;
  /** NFKC + collapsed whitespace — use for regex that need original-ish shape. */
  readonly normalized: string;
  /** Lowercase normalized — SQL / case-insensitive checks. */
  readonly lower: string;
  /** Word tokens with quotes respected (no command substitution). */
  readonly tokens: readonly string[];
}

/**
 * Static metadata for a guard rule (safe to serialize — no functions).
 * Used by GET /intentra/guard/rules for introspection.
 */
export interface GuardRuleMeta {
  /** Unique identifier matching culture.json risk_gates keys. */
  readonly id: string;
  readonly category: GuardCategory;
  /** Documentation-only CWE references (not formal claims). */
  readonly cweHints?: readonly string[];
  /** Verdict when culture.json omits this rule ID. */
  readonly defaultVerdict: GuardVerdict;
  /** 0–100 intrinsic severity for scoring / dashboards. */
  readonly baseRisk: number;
  /** Human-readable explanation shown in deny/warn messages. */
  readonly description: string;
}

/**
 * A guard rule: static metadata + a matcher function.
 * The matcher receives a {@link CommandContext} and returns true if the
 * rule should fire. Matchers must be pure and side-effect-free.
 */
export type GuardRule = GuardRuleMeta & {
  readonly match: (ctx: CommandContext) => boolean;
};

export interface GuardEvaluationOptions {
  /** Include `trace` steps and extra diagnostics (do not log raw commands server-side). */
  debug?: boolean;
}

/** A single step in the guard evaluation debug trace. */
export interface TraceStep {
  /** Pipeline stage identifier (e.g. 'normalize', 's1:rule:rm_recursive'). */
  readonly phase: string;
  /** Human-readable detail about this step's result. */
  readonly detail: string;
}

/**
 * Full result of evaluating a command through the guard pipeline.
 * Returned by `POST /intentra/guard` and `evaluateCommandGuard()`.
 */
export interface GuardEvaluation {
  readonly verdict: GuardVerdict;
  /** Rule ID that fired (if any). */
  readonly pattern?: string;
  /** Human-readable explanation for the verdict. */
  readonly message?: string;
  readonly source: 'intentra_guard';
  /** Matched rule metadata when a pattern fired. */
  readonly rule?: {
    readonly id: string;
    readonly category: GuardCategory;
    readonly baseRisk: number;
    readonly cwe_hints?: readonly string[];
  };
  /** 0 = no match; higher = more severe given verdict. */
  readonly risk_score?: number;
  /** Unknown `intentra.risk_gates` keys (typos, drift). */
  readonly culture_warnings?: readonly string[];
  /** Ordered pipeline steps (debug mode only). */
  readonly trace?: readonly TraceStep[];
  /** Compound command segmentation metadata. */
  readonly compound?: {
    readonly segment_count: number;
    /** 1-based index of the segment that drove warn/deny; null if all allow. */
    readonly decisive_segment_index: number | null;
  };
}
