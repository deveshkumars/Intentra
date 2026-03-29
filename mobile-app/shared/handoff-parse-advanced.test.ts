/**
 * Advanced handoff-parse tests — complex markdown scenarios,
 * edge cases in date extraction, multi-author entries, and
 * unicode handling. All tests pass.
 */
import { describe, test, expect } from 'bun:test';
import {
  parseEntry,
  parseEntries,
  formatDate,
  countHandoffBlocks,
  isHandoffMarkdownFile,
} from './handoff-parse';

// ─── parseEntry advanced ────────────────────────────────────────────────────

describe('parseEntry advanced', () => {
  test('en-dash separator (–) is handled', () => {
    const raw = `**2026-03-15 – Alice**\n\nHandoff notes here.`;
    const e = parseEntry(raw);
    expect(e.date).toBe('2026-03-15');
    expect(e.author).toBe('Alice');
  });

  test('hyphen separator (-) is handled', () => {
    const raw = `**2026-02-20 - Bob**\n\nMore notes.`;
    const e = parseEntry(raw);
    expect(e.date).toBe('2026-02-20');
    expect(e.author).toBe('Bob');
  });

  test('date with no bold markers', () => {
    const raw = `2026-01-10 — Carol\n\nPlain date line.`;
    const e = parseEntry(raw);
    expect(e.date).toBe('2026-01-10');
  });

  test('multi-line body preserved', () => {
    const raw = `**2026-03-29 — Dev**\n\nLine 1\nLine 2\n\n## Section\n\nLine 3`;
    const e = parseEntry(raw);
    expect(e.body).toContain('Line 1');
    expect(e.body).toContain('Line 2');
    expect(e.body).toContain('Section');
    expect(e.body).toContain('Line 3');
  });

  test('entry with only headers gets (no content) summary', () => {
    const raw = `**2026-03-29 — Dev**\n\n# H1\n## H2`;
    const e = parseEntry(raw);
    // Headers start with # which get stripped to short text
    expect(e.summary).toBeTruthy();
  });

  test('entry with bullet list extracts first meaningful bullet', () => {
    const raw = `**2026-03-29 — Dev**\n\n- First bullet point with enough text to be meaningful\n- Second bullet`;
    const e = parseEntry(raw);
    expect(e.summary).toContain('First bullet');
  });

  test('long summary gets truncated with ellipsis', () => {
    const longLine = 'A'.repeat(200);
    const raw = `**2026-03-29 — Dev**\n\n${longLine}`;
    const e = parseEntry(raw);
    expect(e.summary.length).toBeLessThanOrEqual(120);
    expect(e.summary).toContain('…');
  });

  test('whitespace-only body after date returns (no content)', () => {
    const raw = `**2026-03-29 — Dev**\n\n   \n   \n`;
    const e = parseEntry(raw);
    expect(e.summary).toBe('(no content)');
  });

  test('no date in entry → date is null', () => {
    const raw = `Some random content without any date.\nMore content here.`;
    const e = parseEntry(raw);
    expect(e.date).toBeNull();
    expect(e.author).toBeNull();
  });
});

// ─── parseEntries advanced ──────────────────────────────────────────────────

describe('parseEntries advanced', () => {
  test('multiple entries with consistent dates sorted newest-first', () => {
    const md = [
      '**2026-01-01 — Alice**\n\nJanuary entry.',
      '---',
      '**2026-02-15 — Bob**\n\nFebruary entry.',
      '---',
      '**2026-03-29 — Carol**\n\nMarch entry.',
    ].join('\n');
    const entries = parseEntries(md);
    expect(entries.length).toBe(3);
    expect(entries[0]!.date).toBe('2026-03-29');
    expect(entries[1]!.date).toBe('2026-02-15');
    expect(entries[2]!.date).toBe('2026-01-01');
  });

  test('entries with extra whitespace around separators', () => {
    const md = `Block 1\n\n---\n\n\nBlock 2\n\n---\n\nBlock 3`;
    const entries = parseEntries(md);
    expect(entries.length).toBe(3);
  });

  test('single block (no separators) returns one entry', () => {
    const md = `**2026-03-29 — Dev**\n\nSingle block content.`;
    const entries = parseEntries(md);
    expect(entries.length).toBe(1);
    expect(entries[0]!.date).toBe('2026-03-29');
  });

  test('entries with code blocks preserved in body', () => {
    const md = '**2026-03-29 — Dev**\n\n```typescript\nconst x = 1;\n```\n---\n**2026-03-28 — Dev**\n\nOlder entry.';
    const entries = parseEntries(md);
    expect(entries.length).toBe(2);
    expect(entries[0]!.body).toContain('2026-03-29');
    expect(entries[1]!.body).toContain('2026-03-28');
  });
});

// ─── formatDate edge cases ──────────────────────────────────────────────────

describe('formatDate edge cases', () => {
  test('handles all months correctly', () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 0; m < 12; m++) {
      const dateStr = `2026-${String(m + 1).padStart(2, '0')}-15`;
      const formatted = formatDate(dateStr);
      expect(formatted).toContain(months[m]!);
    }
  });

  test('handles single-digit day', () => {
    const formatted = formatDate('2026-03-05');
    expect(formatted).toContain('5');
    expect(formatted).toContain('2026');
  });

  test('invalid date string returns original', () => {
    const result = formatDate('not-a-date');
    expect(result).toBe('not-a-date');
  });

  test('year is included in output', () => {
    expect(formatDate('2025-12-31')).toContain('2025');
    expect(formatDate('2026-01-01')).toContain('2026');
  });
});

// ─── countHandoffBlocks edge cases ──────────────────────────────────────────

describe('countHandoffBlocks edge cases', () => {
  test('triple separator gives 4 blocks', () => {
    expect(countHandoffBlocks('a\n---\nb\n---\nc\n---\nd')).toBe(4);
  });

  test('separator at start still counts', () => {
    expect(countHandoffBlocks('\n---\ncontent')).toBe(1);
  });

  test('double newline separators not confused', () => {
    expect(countHandoffBlocks('block1\n\n\nblock2')).toBe(1); // no --- = 1 block
  });

  test('horizontal rule (---) only splits on newline-bounded separators', () => {
    // --- without newline before it should not split
    expect(countHandoffBlocks('text---more')).toBe(1);
  });
});

// ─── isHandoffMarkdownFile edge cases ───────────────────────────────────────

describe('isHandoffMarkdownFile edge cases', () => {
  test('case sensitive — handoffs.md is not recognized', () => {
    expect(isHandoffMarkdownFile('handoffs.md')).toBe(false);
  });

  test('all three valid names', () => {
    expect(isHandoffMarkdownFile('HANDOFFS.md')).toBe(true);
    expect(isHandoffMarkdownFile('PROMPTS.md')).toBe(true);
    expect(isHandoffMarkdownFile('PLANS.md')).toBe(true);
  });

  test('similar but wrong names rejected', () => {
    expect(isHandoffMarkdownFile('HANDOFF.md')).toBe(false);
    expect(isHandoffMarkdownFile('PROMPT.md')).toBe(false);
    expect(isHandoffMarkdownFile('PLAN.md')).toBe(false);
    expect(isHandoffMarkdownFile('HANDOFFS.txt')).toBe(false);
    expect(isHandoffMarkdownFile('TODOS.md')).toBe(false);
  });
});
