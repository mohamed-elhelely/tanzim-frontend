/** Hands a downloaded file to the browser under the given name. */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** An export's file name stamped with the day it was taken: `datedFileName('stock', 'xlsx')` → `stock_2026-10-16.xlsx`. */
export function datedFileName(base: string, extension: string, day: Date | string = new Date()): string {
  return `${base}_${typeof day === 'string' ? day : localDay(day)}.${extension}`;
}

/** YYYY-MM-DD in the user's time zone (toISOString() would give the UTC day, wrong after midnight in Cairo). */
function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
