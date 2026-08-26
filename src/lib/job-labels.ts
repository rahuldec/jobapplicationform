const MAX_LABEL_LENGTH = 26;

// Real job titles are often "<Role> (<Department>)" or "<Role> — <Department>"
// repeated across many rows (eight "Assistant Professor (X)" postings isn't
// unusual for a college) — showing the full string on every row on the
// dashboard's job chart is what causes labels to visually stack on top of
// each other. Generic across any tenant's own naming convention: split each
// title into a prefix/qualifier pair on its own parenthetical or em-dash,
// and only if that *same* prefix repeats across more than one title, drop
// it and keep just the qualifier — a one-off title (e.g. "Deputy
// Superintendent") is left untouched since there's nothing to disambiguate
// it from. A plain hyphen is deliberately excluded from the split so a
// title like "Full-Time Assistant" isn't misread as prefix/qualifier.
const SPLIT_PATTERN = /^(.+?)\s*[(—]\s*([^()]+?)\)?\s*$/;

export function shortenJobLabels(titles: string[]): string[] {
  const parsed = titles.map((title) => {
    const match = title.match(SPLIT_PATTERN);
    return match ? { prefix: match[1].trim(), qualifier: match[2].trim() } : null;
  });

  const prefixCounts = new Map<string, number>();
  for (const p of parsed) {
    if (p) prefixCounts.set(p.prefix, (prefixCounts.get(p.prefix) ?? 0) + 1);
  }

  return titles.map((title, i) => {
    const p = parsed[i];
    const shortened = p && (prefixCounts.get(p.prefix) ?? 0) > 1 ? p.qualifier : title;
    return shortened.length > MAX_LABEL_LENGTH ? `${shortened.slice(0, MAX_LABEL_LENGTH - 1)}…` : shortened;
  });
}
