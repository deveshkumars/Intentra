/**
 * Intent-as-Code — structured JSON intent artifacts in .intentra/
 *
 * Each intent captures the prompt, repo context, constraints, culture reference,
 * and execution plan as a versioned JSON file. These artifacts make the "why"
 * behind every agent action queryable and persistent across sessions.
 */

import fs from 'fs';
import path from 'path';

// ─── IntentSchema (matches masterdoc3 lines 357-373) ────────────────────────

export interface IntentPlanStep {
  type: string;
  [key: string]: unknown;
}

export interface IntentRepo {
  path: string;
  branch: string;
}

export interface IntentConstraints {
  risk_tolerance?: 'low' | 'medium' | 'high';
  requires_approval_for?: string[];
  [key: string]: unknown;
}

export interface IntentArtifact {
  intent_id: string;
  prompt: string;
  repo: IntentRepo;
  constraints?: IntentConstraints;
  culture_ref?: string;
  plan?: IntentPlanStep[];
  outcome?: 'success' | 'error' | 'cancelled' | null;
}

// ─── File I/O ───────────────────────────────────────────────────────────────

/**
 * Resolve the .intentra/ directory. Uses INTENTRA_REPO_ROOT env var if set,
 * otherwise falls back to the current working directory.
 */
function intentraDir(): string {
  const root = process.env.INTENTRA_REPO_ROOT ?? process.cwd();
  return path.join(root, '.intentra');
}

function ensureDir(): void {
  const dir = intentraDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Generate a unique intent_id based on the current timestamp. */
function makeIntentId(): string {
  return `intent_${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`;
}

/** Write an intent artifact to .intentra/intent_{id}.json */
export function createIntent(input: {
  prompt: string;
  repo?: Partial<IntentRepo>;
  constraints?: IntentConstraints;
  culture_ref?: string;
  plan?: IntentPlanStep[];
}): IntentArtifact {
  ensureDir();

  const intent_id = makeIntentId();

  // Default repo context from environment if not provided
  const repoPath = input.repo?.path ?? process.env.INTENTRA_REPO_ROOT ?? process.cwd();
  let branch = input.repo?.branch ?? 'unknown';
  try {
    const headRef = fs.readFileSync(path.join(repoPath, '.git', 'HEAD'), 'utf-8').trim();
    if (headRef.startsWith('ref: refs/heads/')) {
      branch = headRef.slice('ref: refs/heads/'.length);
    }
  } catch {
    // not a git repo or .git not readable — keep provided/default branch
  }

  const artifact: IntentArtifact = {
    intent_id,
    prompt: input.prompt,
    repo: { path: repoPath, branch },
    constraints: input.constraints ?? undefined,
    culture_ref: input.culture_ref ?? undefined,
    plan: input.plan ?? undefined,
    outcome: null,
  };

  const filename = `${intent_id}.json`;
  const filepath = path.join(intentraDir(), filename);
  fs.writeFileSync(filepath, JSON.stringify(artifact, null, 2) + '\n');

  return artifact;
}

/** Read all intent artifacts from .intentra/ */
export function listIntents(): IntentArtifact[] {
  const dir = intentraDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('intent_') && f.endsWith('.json'))
    .sort(); // chronological by timestamp in filename

  const intents: IntentArtifact[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      intents.push(JSON.parse(raw));
    } catch {
      // skip malformed files
    }
  }
  return intents;
}
