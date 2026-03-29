/**
 * Shared types for the Intentra command guard policy engine.
 */

export type GuardVerdict = 'allow' | 'warn' | 'deny';

export type GuardCategory = 'filesystem' | 'vcs' | 'sql' | 'container' | 'orchestration';

/** Parsed command after normalization + shell-like tokenization */
export interface CommandContext {
  raw: string;
  /** NFKC + collapsed whitespace — use for regex that need original-ish shape */
  normalized: string;
  /** Lowercase normalized — SQL / case-insensitive checks */
  lower: string;
  /** Word tokens with quotes respected (no command substitution) */
  tokens: string[];
}

export interface GuardRuleMeta {
  id: string;
  category: GuardCategory;
  /** Documentation-only hints (not a formal CWE claim) */
  cweHints?: string[];
  /** When culture omits this pattern, use this verdict */
  defaultVerdict: GuardVerdict;
  /** 0–100 intrinsic severity for scoring / dashboards */
  baseRisk: number;
  description: string;
}

export type GuardRule = GuardRuleMeta & {
  match: (ctx: CommandContext) => boolean;
};

export interface GuardEvaluationOptions {
  /** Include `trace` steps and extra diagnostics (do not log raw commands server-side) */
  debug?: boolean;
}

export interface GuardEvaluation {
  verdict: GuardVerdict;
  pattern?: string;
  message?: string;
  source: 'intentra_guard';
  /** Matched rule metadata when a pattern fired */
  rule?: {
    id: string;
    category: GuardCategory;
    baseRisk: number;
    cwe_hints?: string[];
  };
  /** 0 = no match; higher = more severe given verdict */
  risk_score?: number;
  /** e.g. unknown `intentra.risk_gates` keys */
  culture_warnings?: string[];
  /** Ordered pipeline steps (debug only) */
  trace?: Array<{ phase: string; detail: string }>;
  /** Set when input was split on `&&` / `;` outside quotes (see guard-segment) */
  compound?: {
    segment_count: number;
    /** 1-based index of segment that drove warn/deny; null if all allow */
    decisive_segment_index: number | null;
  };
}
