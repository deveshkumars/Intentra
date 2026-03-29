#!/usr/bin/env bun
/**
 * Redact paths and obvious PII from a local skill-usage.jsonl for safe sharing.
 * Usage: bun run scripts/redact-skill-usage-sample.ts ~/.gstack/analytics/skill-usage.jsonl > redacted.jsonl
 */
const inputPath = process.argv[2];
if (!inputPath) {
  console.error(
    'Usage: bun run scripts/redact-skill-usage-sample.ts <path-to-skill-usage.jsonl>',
  );
  process.exit(1);
}

function redactString(s: string): string {
  return s
    .replace(/\/Users\/[^/]+/g, '/Users/<redacted>')
    .replace(/\\Users\\[^\\]+/g, '\\Users\\<redacted>')
    .replace(/\/home\/[^/]+/g, '/home/<redacted>')
    .replace(/C:\\Users\\[^\\]+/gi, 'C:\\Users\\<redacted>');
}

function walk(v: unknown): unknown {
  if (typeof v === 'string') return redactString(v);
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      if (k === 'session_id' || k === 'installation_id') {
        out[k] = '<redacted>';
        continue;
      }
      out[k] = walk(o[k]);
    }
    return out;
  }
  return v;
}

const text = await Bun.file(inputPath).text();
for (const line of text.split('\n')) {
  const t = line.trim();
  if (!t) continue;
  try {
    const obj = JSON.parse(t) as unknown;
    console.log(JSON.stringify(walk(obj)));
  } catch {
    console.log(redactString(t));
  }
}
