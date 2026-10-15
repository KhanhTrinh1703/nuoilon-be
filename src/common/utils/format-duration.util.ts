/**
 * Format a number of months as Vietnamese text.
 * 0 -> "0 tháng", 8 -> "8 tháng", 12 -> "1 năm", 18 -> "1 năm 6 tháng"
 */
export function formatMonthsDuration(totalMonths: number): string {
  const months = Math.max(0, Math.floor(totalMonths || 0));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} tháng`;
  if (remainingMonths === 0) return `${years} năm`;
  return `${years} năm ${remainingMonths} tháng`;
}
