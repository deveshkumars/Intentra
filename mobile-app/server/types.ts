/**
 * Shared type utilities for the Intentra progress server.
 *
 * Provides branded types for compile-time ID safety, a Result type for
 * explicit error handling, and type-safe numeric parsing helpers.
 */

// ─── Branded types ────────────────────────────────────────────────────────
//
// Branded types prevent mixing up plain strings that represent different
// domain concepts. `AgentId` and `IntentId` are both strings at runtime,
// but the compiler rejects `getIntent(agentId)` — you must pass an IntentId.
//
// Create branded values with the factory functions (makeAgentId, makeIntentId).
// Accept them in function signatures to get compile-time safety for free.

declare const __brand: unique symbol;

/**
 * A nominal (branded) type that adds a compile-time tag to a base type.
 *
 * @example
 *   type UserId = Brand<string, 'UserId'>;
 *   type OrderId = Brand<string, 'OrderId'>;
 *   // UserId and OrderId are incompatible even though both are strings.
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique identifier for a tracked agent (e.g. `agent_1711691234567_1`). */
export type AgentId = Brand<string, 'AgentId'>;

/** Unique identifier for an intent artifact (e.g. `intent_2026-03-29T10:00:00Z`). */
export type IntentId = Brand<string, 'IntentId'>;

/** Session identifier linking events across a single Claude Code session. */
export type SessionId = Brand<string, 'SessionId'>;

/** Guard rule identifier from the policy registry (e.g. `rm_recursive`). */
export type RuleId = Brand<string, 'RuleId'>;

// ─── Result type ──────────────────────────────────────────────────────────
//
// Explicit success/failure without exceptions. Use for operations where
// failure is expected (JSON parsing, file reads, network calls) and the
// caller needs to handle both paths.

/** Discriminated union for operations that can succeed or fail. */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Wrap a successful value in a Result. */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wrap a failure in a Result. */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─── Numeric parsing ──────────────────────────────────────────────────────

/**
 * Parse a value as a finite number, returning `null` on failure.
 * Unlike `parseFloat(x) || undefined`, this correctly handles zero:
 *
 * @example
 *   safeParseFloat('3.14')    // → 3.14
 *   safeParseFloat('0')       // → 0      (parseFloat('0') || undefined would give undefined)
 *   safeParseFloat('abc')     // → null
 *   safeParseFloat(undefined) // → null
 */
export function safeParseFloat(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ─── Narrowing helpers ────────────────────────────────────────────────────

/** Type-safe string check for unknown record values. */
export function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/** Type-safe optional string extraction from an untyped record. */
export function optString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
