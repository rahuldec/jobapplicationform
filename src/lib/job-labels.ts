const MAX_LABEL_LENGTH = 20;

// Real job titles are often "<Role> — <Department>" or "<Role> (<Department>)",
// sometimes with a trailing batch/cohort tag too, e.g.
// "Assistant Professor — Commerce (2026 Intake)" — repeated across many rows
// (eight postings for one role isn't unusual for a college) is what causes
// labels to visually stack on top of each other on the dashboard's job
// chart. Generic across any tenant's own naming convention: split each
// title into a prefix/qualifier pair, and only if that *same* prefix
// repeats across more than one title, drop it and keep just the qualifier —
// a one-off title (e.g. "Deputy Superintendent") is left untouched since
// there's nothing to disambiguate it from.
//
// The em-dash and parenthetical forms are tried as two separate, ordered
// patterns rather than one pattern treating "(" and "—" as interchangeable
// delimiters — combining them let a trailing "(2026 Intake)" tag get
// mistaken for the department itself. For the em-dash form, a trailing
// parenthetical is stripped as a decoration *after* the qualifier is
// found, not treated as a competing split point. A plain hyphen is
// deliberately excluded so "Full-Time Assistant" isn't misread as
// prefix/qualifier.
const DASH_PATTERN = /^(.+?)\s+—\s+(.+?)(?:\s*\([^()]*\))?\s*$/;
const TRAILING_PAREN_PATTERN = /^(.+?)\s*\(([^()]+)\)\s*$/;

function splitTitle(title: string): { prefix: string; qualifier: string } | null {
  const dashMatch = title.match(DASH_PATTERN);
  if (dashMatch) return { prefix: dashMatch[1].trim(), qualifier: dashMatch[2].trim() };
  const parenMatch = title.match(TRAILING_PAREN_PATTERN);
  if (parenMatch) return { prefix: parenMatch[1].trim(), qualifier: parenMatch[2].trim() };
  return null;
}

export function shortenJobLabels(titles: string[]): string[] {
  const parsed = titles.map(splitTitle);

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
