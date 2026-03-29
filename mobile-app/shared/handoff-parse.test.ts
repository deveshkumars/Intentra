import { describe, test, expect } from 'bun:test';
import {
  parseEntry,
  parseEntries,
  formatDate,
  countHandoffBlocks,
  isHandoffMarkdownFile,
} from './handoff-parse';

describe('parseEntry', () => {
  test('extracts date and author from bold markdown line', () => {
    const raw = `**2026-03-29 — Gordon Beckler**\n\nNext actions:\n- Ship PR`;
    const e = parseEntry(raw);
    expect(e.date).toBe('2026-03-29');
    expect(e.author).toBe('Gordon Beckler');
    expect(e.summary).toContain('Next actions');
    expect(e.body).toContain('Ship PR');
  });

  test('plain date line without author', () => {
    const raw = `2026-01-15\n\nHello world from the team.`;
    const e = parseEntry(raw);
    expect(e.date).toBe('2026-01-15');
    expect(e.author).toBeNull();
    expect(e.summary).toContain('Hello world');
  });

  test('summary fallback when only short lines', () => {
    const raw = 'a\nb';
    const e = parseEntry(raw);
    expect(e.summary).toBe('(no content)');
  });
});

describe('parseEntries', () => {
  test('splits on --- and orders newest first', () => {
    const md = `first block\n---\n**2026-03-01 — A**\n\nOld entry.\n---\n**2026-03-28 — B**\n\nNew entry line here.`;
    const entries = parseEntries(md);
    expect(entries.length).toBe(3);
    expect(entries[0]!.summary).toContain('New entry');
    expect(entries[0]!.date).toBe('2026-03-28');
    expect(entries[entries.length - 1]!.body).toContain('first block');
  });

  test('empty string yields no entries', () => {
    expect(parseEntries('')).toEqual([]);
    expect(parseEntries('   \n')).toEqual([]);
  });

  test('CRLF line endings still split on ---', () => {
    const md =
      '**2026-03-01 — A**\r\n\r\nFirst block body line.\r\n---\r\n**2026-03-02 — B**\r\n\r\nSecond block body here.';
    const entries = parseEntries(md);
    expect(entries.length).toBe(2);
    expect(entries[0]!.summary).toContain('Second block');
    expect(countHandoffBlocks(md)).toBe(2);
  });
});

describe('formatDate', () => {
  test('formats ISO date string', () => {
    expect(formatDate('2026-03-29')).toMatch(/Mar/);
    expect(formatDate('2026-03-29')).toMatch(/2026/);
  });
});

describe('countHandoffBlocks', () => {
  test('counts --- separated blocks', () => {
    expect(countHandoffBlocks('a\n---\nb')).toBe(2);
    expect(countHandoffBlocks('only one')).toBe(1);
    expect(countHandoffBlocks('')).toBe(0);
    expect(countHandoffBlocks('  \n  ')).toBe(0);
  });
});

describe('isHandoffMarkdownFile', () => {
  test('recognizes narrative files', () => {
    expect(isHandoffMarkdownFile('HANDOFFS.md')).toBe(true);
    expect(isHandoffMarkdownFile('PROMPTS.md')).toBe(true);
    expect(isHandoffMarkdownFile('PLANS.md')).toBe(true);
    expect(isHandoffMarkdownFile('README.md')).toBe(false);
  });
});
