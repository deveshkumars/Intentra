#!/usr/bin/env bun
/**
 * CI guard: OpenAPI subset must stay valid JSON with required paths (drift breaks the build).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = resolve(root, 'docs/openapi/intentra-progress.json');

let spec: { openapi?: string; paths?: Record<string, unknown> };
try {
  spec = JSON.parse(readFileSync(specPath, 'utf-8'));
} catch (e) {
  console.error('check-intentra-contracts: invalid JSON', specPath, e);
  process.exit(1);
}

if (!spec.openapi?.startsWith('3.')) {
  console.error('check-intentra-contracts: expected openapi 3.x, got', spec.openapi);
  process.exit(1);
}

const required = [
  '/health',
  '/progress',
  '/events/history',
  '/intentra/files',
  '/intentra/handoffs/summary',
  '/intentra/guard',
];

for (const p of required) {
  if (!spec.paths?.[p]) {
    console.error('check-intentra-contracts: missing path', p);
    process.exit(1);
  }
}

console.log('check-intentra-contracts: OK', specPath);
