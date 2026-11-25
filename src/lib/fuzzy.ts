// Lightweight typo-tolerant matcher shared by server search and client autocomplete.
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

/** Damerau-Levenshtein (optimal string alignment) with early exit above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = new Array(b.length + 1).fill(0);
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

function allowedTypos(len: number) {
  return len >= 8 ? 2 : len >= 5 ? 1 : 0;
}

/**
 * Score how well query tokens match a haystack's tokens. Every query token must match
 * (exact, prefix, compact form, or within a small edit distance). Returns 0 for no match.
 */
export function matchScore(queryTokens: string[], hayTokens: string[], hayCompact?: string): number {
  if (!queryTokens.length) return 0;
  let total = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const h of hayTokens) {
      if (h === q) { best = 10; break; }
      if (h.startsWith(q) && q.length >= 2) best = Math.max(best, 7 + Math.min(2, q.length / 4));
      else if (q.length >= 4 && h.includes(q)) best = Math.max(best, 5);
      else {
        const tol = allowedTypos(q.length);
        if (tol) {
          const cmp = h.length > q.length + tol ? h.slice(0, q.length + 1) : h;
          const d = editDistance(q, cmp, tol);
          if (d <= tol) best = Math.max(best, 6 - d * 1.5);
        }
      }
    }
    if (!best && hayCompact && q.length >= 3 && hayCompact.includes(q)) best = 5; // "allbirds" vs "all birds"
    if (!best) return 0;
    total += best;
  }
  return total / queryTokens.length;
}
