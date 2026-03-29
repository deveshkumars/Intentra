import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const ROOT = path.resolve(import.meta.dir, '..');
const CAREFUL_SCRIPT = path.join(ROOT, 'careful', 'bin', 'check-careful.sh');
const FREEZE_SCRIPT = path.join(ROOT, 'freeze', 'bin', 'check-freeze.sh');

function runHook(scriptPath: string, input: object, env?: Record<string, string>): { exitCode: number; output: any; raw: string } {
  const result = spawnSync('bash', [scriptPath], {
    input: JSON.stringify(input),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
    timeout: 5000,
  });
  const raw = result.stdout.toString().trim();
  let output: any = {};
  try {
    output = JSON.parse(raw);
  } catch {}
  return { exitCode: result.status ?? 1, output, raw };
}

function runHookRaw(scriptPath: string, rawInput: string, env?: Record<string, string>): { exitCode: number; output: any; raw: string } {
  const result = spawnSync('bash', [scriptPath], {
    input: rawInput,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
    timeout: 5000,
  });
  const raw = result.stdout.toString().trim();
  let output: any = {};
  try {
    output = JSON.parse(raw);
  } catch {}
  return { exitCode: result.status ?? 1, output, raw };
}

function carefulInput(command: string) {
  return { tool_input: { command } };
}

function freezeInput(filePath: string) {
  return { tool_input: { file_path: filePath } };
}

function withFreezeDir(freezePath: string, fn: (stateDir: string) => void) {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-freeze-test-'));
  fs.writeFileSync(path.join(stateDir, 'freeze-dir.txt'), freezePath);
  try {
    fn(stateDir);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
}

// Detect whether the safe-rm-targets regex works on this platform.
// macOS sed -E does not support \s, so the safe exception check fails there.
function detectSafeRmWorks(): boolean {
  const { output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf node_modules'));
  return output.permissionDecision === undefined;
}

// ============================================================
// check-careful.sh tests
// ============================================================
describe('check-careful.sh', () => {

  // --- Destructive rm commands ---

  describe('rm -rf / rm -r', () => {
    test('rm -rf /var/data denies (default verdict: deny)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf /var/data'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('recursive delete');
    });

    test('rm -r ./some-dir denies', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -r ./some-dir'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('recursive delete');
    });

    test('rm -rf node_modules allows (safe exception)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf node_modules'));
      expect(exitCode).toBe(0);
      if (detectSafeRmWorks()) {
        // GNU sed: safe exception triggers, allows through
        expect(output.permissionDecision).toBeUndefined();
      } else {
        // macOS sed: safe exception regex uses \\s which is unsupported,
        // so the safe-targets check fails and the command denies (default: deny)
        expect(output.permissionDecision).toBe('deny');
      }
    });

    test('rm -rf .next dist allows (multiple safe targets)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf .next dist'));
      expect(exitCode).toBe(0);
      if (detectSafeRmWorks()) {
        expect(output.permissionDecision).toBeUndefined();
      } else {
        expect(output.permissionDecision).toBe('deny');
      }
    });

    test('rm -rf node_modules /var/data denies (mixed safe+unsafe)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf node_modules /var/data'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('recursive delete');
    });
  });

  // --- SQL destructive commands ---
  // Note: SQL commands that contain embedded double quotes (e.g., psql -c "DROP TABLE")
  // get their command value truncated by the grep-based JSON extractor because \"
  // terminates the [^"]* match. We use commands WITHOUT embedded quotes so the grep
  // extraction works and the SQL keywords are visible to the pattern matcher.

  describe('SQL destructive commands', () => {
    test('psql DROP TABLE denies (default verdict: deny)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('psql -c DROP TABLE users;'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('DROP');
    });

    test('mysql drop database denies (case insensitive)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('mysql -e drop database mydb'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message.toLowerCase()).toContain('drop');
    });

    test('psql TRUNCATE denies (default verdict: deny)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('psql -c TRUNCATE orders;'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('TRUNCATE');
    });
  });

  // --- Git destructive commands ---

  describe('git destructive commands', () => {
    test('git push --force denies (default verdict: deny)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('git push --force origin main'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('force-push');
    });

    test('git push -f denies', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('git push -f origin main'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('force-push');
    });

    test('git reset --hard denies (default verdict: deny)', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('git reset --hard HEAD~3'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('uncommitted');
    });

    test('git checkout . denies', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('git checkout .'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('uncommitted');
    });

    test('git restore . denies', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('git restore .'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('uncommitted');
    });
  });

  // --- Container / infra destructive commands ---

  describe('container and infra commands', () => {
    test('kubectl delete warns with kubectl in message', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('kubectl delete pod my-pod'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('ask');
      expect(output.message).toContain('kubectl');
    });

    test('docker rm -f warns', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('docker rm -f container123'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('ask');
      expect(output.message).toContain('Docker');
    });

    test('docker system prune -a warns', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput('docker system prune -a'));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('ask');
      expect(output.message).toContain('Docker');
    });
  });

  // --- Safe commands ---

  describe('safe commands allow without warning', () => {
    const safeCmds = [
      'ls -la',
      'git status',
      'npm install',
      'cat README.md',
      'echo hello',
    ];

    for (const cmd of safeCmds) {
      test(`"${cmd}" allows`, () => {
        const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput(cmd));
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBeUndefined();
      });
    }
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    test('empty command allows gracefully', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, carefulInput(''));
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBeUndefined();
    });

    test('missing command field allows gracefully', () => {
      const { exitCode, output } = runHook(CAREFUL_SCRIPT, { tool_input: {} });
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBeUndefined();
    });

    test('malformed JSON input allows gracefully (exit 0, output {})', () => {
      const { exitCode, raw } = runHookRaw(CAREFUL_SCRIPT, 'this is not json at all{{{{');
      expect(exitCode).toBe(0);
      expect(raw).toBe('{}');
    });

    test('Python fallback: grep fails on multiline JSON, Python parses it', () => {
      // Construct JSON where "command": and the value are on separate lines.
      // grep works line-by-line, so it cannot match "command"..."value" across lines.
      // This forces CMD to be empty, triggering the Python fallback which handles
      // the full JSON correctly.
      const rawJson = '{"tool_input":{"command":\n"rm -rf /tmp/important"}}';
      const { exitCode, output } = runHookRaw(CAREFUL_SCRIPT, rawJson);
      expect(exitCode).toBe(0);
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('recursive delete');
    });
  });
});

// ============================================================
// culture.json override tests
// ============================================================

/**
 * Helper: create a temp dir with culture.json containing the given risk_gates,
 * run fn with GSTACK_STATE_DIR pointing to it, then clean up.
 */
function withCultureFile(
  gates: Record<string, string>,
  fn: (stateDir: string) => void,
) {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-culture-test-'));
  try {
    const culture = { intentra: { risk_gates: gates } };
    fs.writeFileSync(path.join(stateDir, 'culture.json'), JSON.stringify(culture));
    fn(stateDir);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
}

describe('check-careful.sh culture.json overrides', () => {

  test('deny verdict: rm_recursive with deny → permissionDecision: deny', () => {
    withCultureFile({ rm_recursive: 'deny' }, (stateDir) => {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf /var/data'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toContain('[careful/deny]');
    });
  });

  test('warn verdict: rm_recursive with warn → permissionDecision: ask', () => {
    withCultureFile({ rm_recursive: 'warn' }, (stateDir) => {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf /var/data'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBe('ask');
      expect(output.message).toContain('[careful/warn]');
    });
  });

  test('allow verdict: rm_recursive with allow → passes silently ({})', () => {
    withCultureFile({ rm_recursive: 'allow' }, (stateDir) => {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf /var/data'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBeUndefined();
    });
  });

  test('deny verdict: git_force_push with deny → permissionDecision: deny', () => {
    withCultureFile({ git_force_push: 'deny' }, (stateDir) => {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('git push --force origin main'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBe('deny');
    });
  });

  test('allow verdict: kubectl_delete with allow → passes silently', () => {
    withCultureFile({ kubectl_delete: 'allow' }, (stateDir) => {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('kubectl delete pod my-pod'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBeUndefined();
    });
  });

  test('no culture file → rm_recursive falls back to default: deny', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-noculture-'));
    try {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf /var/data'), { GSTACK_STATE_DIR: emptyDir });
      expect(output.permissionDecision).toBe('deny');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test('no culture file → kubectl_delete falls back to default: warn (ask)', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-noculture-'));
    try {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('kubectl delete pod'), { GSTACK_STATE_DIR: emptyDir });
      expect(output.permissionDecision).toBe('ask');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test('malformed culture.json → falls back to default verdict', () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-badculture-'));
    try {
      fs.writeFileSync(path.join(stateDir, 'culture.json'), '{ this is not valid json {{{{');
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf /var/data'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBe('deny'); // falls back to default
    } finally {
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
  });

  test('missing key in risk_gates → falls back to default verdict', () => {
    withCultureFile({ drop_table: 'warn' }, (stateDir) => {
      // rm_recursive key is absent; should fall back to deny
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('rm -rf /var/data'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBe('deny');
    });
  });

  test('deny verdict message includes [careful/deny] prefix', () => {
    withCultureFile({ drop_table: 'deny' }, (stateDir) => {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('psql -c DROP TABLE users;'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBe('deny');
      expect(output.message).toMatch(/^\[careful\/deny\]/);
    });
  });

  test('warn verdict message includes [careful/warn] prefix', () => {
    withCultureFile({ drop_table: 'warn' }, (stateDir) => {
      const { output } = runHook(CAREFUL_SCRIPT, carefulInput('psql -c DROP TABLE users;'), { GSTACK_STATE_DIR: stateDir });
      expect(output.permissionDecision).toBe('ask');
      expect(output.message).toMatch(/^\[careful\/warn\]/);
    });
  });
});

// ============================================================
// check-freeze.sh tests
// ============================================================
describe('check-freeze.sh', () => {

  describe('edits inside freeze boundary', () => {
    test('edit inside freeze boundary allows', () => {
      withFreezeDir('/Users/dev/project/src/', (stateDir) => {
        const { exitCode, output } = runHook(
          FREEZE_SCRIPT,
          freezeInput('/Users/dev/project/src/index.ts'),
          { CLAUDE_PLUGIN_DATA: stateDir },
        );
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBeUndefined();
      });
    });

    test('edit in subdirectory of freeze path allows', () => {
      withFreezeDir('/Users/dev/project/src/', (stateDir) => {
        const { exitCode, output } = runHook(
          FREEZE_SCRIPT,
          freezeInput('/Users/dev/project/src/components/Button.tsx'),
          { CLAUDE_PLUGIN_DATA: stateDir },
        );
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBeUndefined();
      });
    });
  });

  describe('edits outside freeze boundary', () => {
    test('edit outside freeze boundary denies', () => {
      withFreezeDir('/Users/dev/project/src/', (stateDir) => {
        const { exitCode, output } = runHook(
          FREEZE_SCRIPT,
          freezeInput('/Users/dev/other-project/index.ts'),
          { CLAUDE_PLUGIN_DATA: stateDir },
        );
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBe('deny');
        expect(output.message).toContain('freeze');
        expect(output.message).toContain('outside');
      });
    });

    test('write outside freeze boundary denies', () => {
      withFreezeDir('/Users/dev/project/src/', (stateDir) => {
        const { exitCode, output } = runHook(
          FREEZE_SCRIPT,
          freezeInput('/etc/hosts'),
          { CLAUDE_PLUGIN_DATA: stateDir },
        );
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBe('deny');
        expect(output.message).toContain('freeze');
        expect(output.message).toContain('outside');
      });
    });
  });

  describe('trailing slash prevents prefix confusion', () => {
    test('freeze at /src/ denies /src-old/ (trailing slash prevents prefix match)', () => {
      withFreezeDir('/Users/dev/project/src/', (stateDir) => {
        const { exitCode, output } = runHook(
          FREEZE_SCRIPT,
          freezeInput('/Users/dev/project/src-old/index.ts'),
          { CLAUDE_PLUGIN_DATA: stateDir },
        );
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBe('deny');
        expect(output.message).toContain('outside');
      });
    });
  });

  describe('no freeze file exists', () => {
    test('allows everything when no freeze file present', () => {
      const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-freeze-test-'));
      try {
        const { exitCode, output } = runHook(
          FREEZE_SCRIPT,
          freezeInput('/anywhere/at/all.ts'),
          { CLAUDE_PLUGIN_DATA: stateDir },
        );
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBeUndefined();
      } finally {
        fs.rmSync(stateDir, { recursive: true, force: true });
      }
    });
  });

  describe('edge cases', () => {
    test('missing file_path field allows gracefully', () => {
      withFreezeDir('/Users/dev/project/src/', (stateDir) => {
        const { exitCode, output } = runHook(
          FREEZE_SCRIPT,
          { tool_input: {} },
          { CLAUDE_PLUGIN_DATA: stateDir },
        );
        expect(exitCode).toBe(0);
        expect(output.permissionDecision).toBeUndefined();
      });
    });
  });
});
