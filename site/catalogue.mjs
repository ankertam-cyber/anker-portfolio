export const ROW_SIZES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
export const CAPACITY = ROW_SIZES.reduce((a, b) => a + b, 0);
export function pageCount(entries) { return Math.max(1, Math.ceil(entries.length / CAPACITY)); }
export function pageEntries(entries, page) {
  const safe = Math.max(0, Math.min(pageCount(entries) - 1, Math.trunc(page) || 0));
  return entries.slice(safe * CAPACITY, (safe + 1) * CAPACITY);
}
export function seatCoordinates(index) {
  if (!Number.isInteger(index) || index < 0 || index >= CAPACITY) throw new RangeError('Seat outside cinema');
  let offset = index;
  for (let row = 0; row < ROW_SIZES.length; row++) {
    if (offset < ROW_SIZES[row]) return { row, column: offset, label: String.fromCharCode(65 + row) + String(offset + 1).padStart(2, '0') };
    offset -= ROW_SIZES[row];
  }
}
export function filterEntries(entries, query) {
  const q = query.trim().toLocaleLowerCase();
  return q ? entries.filter(p => [p.title, p.sourceTitle, p.year, p.sourceYear, p.category, p.location].filter(Boolean).join(' ').toLocaleLowerCase().includes(q)) : entries;
}
