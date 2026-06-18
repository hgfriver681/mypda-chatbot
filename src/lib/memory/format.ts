// Pure presentation helpers for the memory UI (kept out of components so they
// can be unit-tested without a DOM, matching the repo's logic-only test setup).

export function relativeTime(
  value: string | Date,
  now: Date = new Date(),
): string {
  const then = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function collectCategories(
  memories: { categories: string[] }[],
): string[] {
  const set = new Set<string>();
  for (const m of memories) for (const c of m.categories) set.add(c);
  return [...set].sort();
}
