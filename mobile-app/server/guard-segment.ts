/**
 * Split a compound shell-like command on `&&` and `;` outside quotes.
 * Does not split on `|`, newlines, or subshells — see ADR-002.
 */

export function splitGuardSegments(input: string): string[] {
  const s = input.trim();
  if (!s) return [];

  const out: string[] = [];
  let cur = '';
  let i = 0;
  let quote: "'" | '"' | null = null;

  const pushCur = () => {
    const t = cur.trim();
    if (t) out.push(t);
    cur = '';
  };

  while (i < s.length) {
    const c = s[i]!;

    if (quote === "'") {
      cur += c;
      if (c === "'") quote = null;
      i++;
      continue;
    }

    if (quote === '"') {
      if (c === '\\' && s[i + 1]) {
        cur += c + s[i + 1]!;
        i += 2;
        continue;
      }
      cur += c;
      if (c === '"') quote = null;
      i++;
      continue;
    }

    if (c === "'" || c === '"') {
      quote = c as "'" | '"';
      cur += c;
      i++;
      continue;
    }

    if (c === '&' && s[i + 1] === '&') {
      pushCur();
      i += 2;
      while (s[i] === ' ') i++;
      continue;
    }

    if (c === ';') {
      pushCur();
      i++;
      while (s[i] === ' ') i++;
      continue;
    }

    cur += c;
    i++;
  }

  pushCur();
  return out;
}
