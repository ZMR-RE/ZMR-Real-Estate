// Collect the complete property history rather than silently accepting the API's
// row cap. Callers must scope every page and order by date, then unique id.
interface HistoryPage<T> {
  data: T[] | null
  error: { message: string } | null
  count: number | null
}
export async function readMortgageHistory<T extends { id: string }>(
  fetchPage: (from: number, to: number) => PromiseLike<HistoryPage<T>>,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const rows: T[] = []
  const seen = new Set<string>()
  let expected: number | null = null
  const changed = () => ({data: null, error: {message: 'Could not load the complete mortgage history. It may have changed while loading. Reload before using its totals.'}})
  while (true) {
    const page = await fetchPage(rows.length, rows.length + 999)
    if (page.error) return {data: null, error: page.error}
    if (!page.data || page.count === null || !Number.isSafeInteger(page.count) || page.count < 0) return changed()
    if (expected !== null && page.count !== expected) return changed()
    expected = page.count
    for (const row of page.data) {
      if (seen.has(row.id)) return changed()
      seen.add(row.id)
      rows.push(row)
    }
    if (rows.length === expected) return {data: rows, error: null}
    if (page.data.length === 0 || rows.length > expected) return changed()
  }
}
