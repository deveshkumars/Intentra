/**
 * Pure parsing for `.intentra` HANDOFFS / PROMPTS / PLANS markdown.
 * Shared by Expo HandoffScreen, Bun server (`/intentra/handoffs/summary`), and tests.
 * No React / Node-only APIs — safe for any TS consumer.
 */

export interface HandoffEntry {
  body: string;
  date: string | null;
  author: string | null;
  summary: string;
}

const HANDOFF_MARKDOWN_FILES = ['HANDOFFS.md', 'PROMPTS.md', 'PLANS.md'] as const;
export type HandoffMarkdownName = (typeof HANDOFF_MARKDOWN_FILES)[number];

export function isHandoffMarkdownFile(name: string): name is HandoffMarkdownName {
  return (HANDOFF_MARKDOWN_FILES as readonly string[]).includes(name);
}

/** Parse a date/author line like "**2026-03-29 — Gordon Beckler**" from the first lines */
export function parseEntry(raw: string): HandoffEntry {
  const lines = raw.trim().split('\n');
  let date: string | null = null;
  let author: string | null = null;
  let summaryStart = 0;

  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i]!.trim();
    const dateMatch = line.match(/\*{0,2}(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.+?)\*{0,2}$/);
    if (dateMatch) {
      date = dateMatch[1]!;
      author = dateMatch[2]!.replace(/\*+$/, '').trim();
      summaryStart = i + 1;
      break;
    }
    const plainDate = line.match(/^(\d{4}-\d{2}-\d{2})/);
    if (plainDate) {
      date = plainDate[1]!;
      summaryStart = i + 1;
      break;
    }
  }

  let summary = '';
  for (let i = summaryStart; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (!l) continue;
    const cleaned = l.replace(/^[>#*\-\s]+/, '').trim();
    if (cleaned.length > 5) {
      summary = cleaned.length > 120 ? cleaned.slice(0, 117) + '…' : cleaned;
      break;
    }
  }

  return { body: raw.trim(), date, author, summary: summary || '(no content)' };
}

/** Split markdown on `\n---\n`; newest block first */
export function parseEntries(content: string): HandoffEntry[] {
  const blocks = content.split(/\n---\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map(parseEntry).reverse();
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/** Count `---`-separated blocks */
export function countHandoffBlocks(content: string): number {
  if (!content.trim()) return 0;
  return content.split(/\n---\n/).filter(b => b.trim()).length;
}
