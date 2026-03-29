/**
 * Read ~/.gstack/culture.json (or $GSTACK_STATE_DIR/culture.json).
 * Intentra exposes this on GET /intentra/culture so mobile and auditors
 * see the same team DNA file agents load — without claiming hooks run here.
 */

import fs from 'fs';
import path from 'path';

export function gstackCulturePath(): string {
  const state = process.env.GSTACK_STATE_DIR ?? path.join(process.env.HOME ?? '~', '.gstack');
  return path.join(state, 'culture.json');
}

export interface CultureReadResult {
  path: string;
  culture: unknown | null;
  loaded: boolean;
  error: string | null;
}

export function readCultureSnapshot(): CultureReadResult {
  const p = gstackCulturePath();
  try {
    if (!fs.existsSync(p)) {
      return { path: p, culture: null, loaded: false, error: null };
    }
    const raw = fs.readFileSync(p, 'utf-8');
    return { path: p, culture: JSON.parse(raw), loaded: true, error: null };
  } catch (e) {
    return {
      path: p,
      culture: null,
      loaded: false,
      error: e instanceof Error ? e.message : 'read error',
    };
  }
}
