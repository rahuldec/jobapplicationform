// Runs `worker` over `items` with at most `limit` in flight at once —
// used for bulk external fetches (Google Drive, PDF generation) where an
// unbounded Promise.all would open too many connections at once, and a
// plain sequential loop would leave most of Vercel's time budget unused.
export async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}
