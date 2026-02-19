/**
 * Formats a Date object into a string suitable for use in file names.
 * The format is: YYYYMMDD_HHMMSS
 * Example: 20240115_153045 for January 15, 2024 at 3:30:45 PM
 * @param date Date object to format
 * @return Formatted date string for file names
 * This function ensures that the date and time components are zero-padded to maintain a consistent length, which is important for sorting and readability in file systems.
 */
export function formatTimestampForFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}
