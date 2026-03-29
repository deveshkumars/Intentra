---
name: claude-review
preamble-tier: 3
version: 1.0.0
description: |
  Claude second opinion from Codex — runs claude -p on the current diff to get an
  independent review from Anthropic's Claude. Three modes: review (pass/fail gate),
  challenge (adversarial), and consult (open question). The reverse of /codex.
  Use when asked to "claude review", "ask claude", "second opinion from claude",
  or "cross-model review".
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /claude-review — Claude Second Opinion

You are running the `/claude-review` skill. This calls Anthropic's Claude CLI (`claude -p`)
to get an independent review from a different AI system.

Run this on Codex to get Claude's perspective — the reverse of what `/codex` does from
Claude Code. Different model families have different strengths and blind spots. Overlapping
findings = high confidence. Unique findings from each = where you find the bugs neither
catches alone.

---

## Step 0: Check claude binary

```bash
CLAUDE_BIN=$(which claude 2>/dev/null || echo "")
[ -z "$CLAUDE_BIN" ] && echo "NOT_FOUND" || echo "FOUND: $CLAUDE_BIN"
```

If `NOT_FOUND`: stop and tell the user:
"Claude CLI not found. Install it from https://claude.ai/code or run: `npm install -g @anthropic-ai/claude-code`"

---

## Step 1: Detect mode

Parse the user's input:

1. `/claude-review review` or `/claude-review review <instructions>` — **Review mode** (Step 2A)
2. `/claude-review challenge` or `/claude-review challenge <focus>` — **Challenge mode** (Step 2B)
3. `/claude-review` with no arguments — **Auto-detect:**
   - Check for a diff: `git diff origin/<base> --stat 2>/dev/null | tail -1 || git diff HEAD~1 --stat 2>/dev/null | tail -1`
   - If diff exists, default to Review mode
   - Otherwise ask: "What would you like to ask Claude?"
4. `/claude-review <anything else>` — **Consult mode** (Step 2C), remaining text is the prompt

---

## Step 2A: Review Mode

Get an independent code review from Claude.

1. Detect base branch:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo "main"
```

2. Get the diff:
```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo "main")
git diff "origin/$BASE"...HEAD 2>/dev/null || git diff HEAD~1
```

3. Capture the diff to a temp file and call claude:
```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo "main")
DIFF=$(git diff "origin/$BASE"...HEAD 2>/dev/null || git diff HEAD~1)
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

PROMPT="You are a senior staff engineer doing a code review. Review this diff from repo '$REPO' branch '$BRANCH' and classify findings by severity:
- [P1] Critical: bugs that will cause data loss, security vulnerabilities, or production failures
- [P2] High: correctness issues, error handling gaps, race conditions, or serious performance problems
- [P3] Medium: code quality, test coverage, or maintainability issues

IMPORTANT: Stay focused on this diff only. Do not read configuration directories or skill template files.

Verdict: if any [P1] findings → FAIL. Otherwise → PASS.

Format your response exactly like:
VERDICT: PASS|FAIL (N total findings)
[P1] file.ts:line — Description of critical issue
[P2] file.ts:line — Description of high issue
[P3] file.ts:line — Description of medium issue

If no issues: VERDICT: PASS (0 findings) — No significant issues found.

DIFF:
$DIFF"

echo "$PROMPT" | claude -p --output-format text 2>/dev/null
```

If the user provided custom instructions (e.g., `/claude-review review focus on security`),
append them to the prompt after the diff section.

Use `timeout: 120000` on the Bash call (2 minutes).

4. Parse verdict: look for `VERDICT: PASS` or `VERDICT: FAIL` in the output.
   Count `[P1]` markers — any P1 = FAIL.

5. Present the output:

```
CLAUDE SAYS (code review):
════════════════════════════════════════════════════════════
<full claude output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
GATE: PASS
```

or `GATE: FAIL (N critical findings)`

6. **Cross-model comparison:** If Codex also ran a review earlier in this conversation,
   compare the two:

```
CROSS-MODEL ANALYSIS:
  Both found: [findings that overlap between Claude and Codex]
  Only Claude found: [findings unique to Claude]
  Only Codex found: [findings unique to Codex]
  Agreement rate: X% (N/M total unique findings overlap)
```

Overlapping findings across two different model families = high confidence, worth fixing
immediately. Unique findings deserve scrutiny — one model may be hallucinating, or finding
something real the other missed.

---

## Step 2B: Challenge Mode

Ask Claude to actively try to break the code.

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo "main")
DIFF=$(git diff "origin/$BASE"...HEAD 2>/dev/null || git diff HEAD~1)

PROMPT="You are an adversarial code reviewer. Your job is to find every possible way this code could fail.

Look for:
- Race conditions and concurrency bugs
- Edge cases the author didn't consider (empty inputs, null values, off-by-one errors)
- Security vulnerabilities (injection, auth bypass, data exposure)
- Assumptions that will break under load or with real user data
- Error handling paths that lead to silent failures
- Subtle logic bugs that only appear in production

Be direct. Be specific. Name the file and line. Show a concrete scenario where it fails.
Do not be diplomatic. Your job is to break this.

DIFF:
$DIFF"

echo "$PROMPT" | claude -p --output-format text 2>/dev/null
```

Present output verbatim. No gate verdict in challenge mode — present every finding as
something to investigate.

---

## Step 2C: Consult Mode

Open question with session continuity.

```bash
echo "<user's question>" | claude -p --output-format text 2>/dev/null
```

Present Claude's response verbatim. For follow-up questions in the same conversation,
include prior context in the prompt.

---

## Final step

After presenting results, ask if the user wants to:
- Fix any findings before shipping
- Run Codex review for comparison (if not already done)
- Get explanations for any specific finding
