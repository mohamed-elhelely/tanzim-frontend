/**
 * Code 128 (set B) barcodes as bar widths, for printing labels without a library. Set B covers printable
 * ASCII (space to `~`), which is what SKUs and most retail codes use.
 *
 * Each symbol is six alternating bar/space widths in modules (eleven modules in all); the stop symbol has seven
 * (thirteen modules). Index = symbol value; 103–105 are the A/B/C start codes, 106 is stop.
 */
export const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const;

const START_B = 104;
const STOP = 106;

/** Whether `text` can be drawn with set B (printable ASCII only, not empty). */
export function canEncodeCode128(text: string): boolean {
  return text.length > 0 && [...text].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126);
}

/** Symbol values: start B, the characters, the mod-103 check symbol, stop. */
export function code128Values(text: string): number[] {
  if (!canEncodeCode128(text)) {
    throw new Error(`Code 128 set B can't encode "${text}"`);
  }
  const data = [...text].map((char) => char.charCodeAt(0) - 32);
  const checksum = data.reduce((sum, value, index) => sum + value * (index + 1), START_B) % 103;
  return [START_B, ...data, checksum, STOP];
}

/** Bars as `{ x, width }` in modules (spaces are the gaps), and the total width including the quiet zones. */
export function code128Bars(text: string, quietZone = 10): { bars: { x: number; width: number }[]; width: number } {
  const bars: { x: number; width: number }[] = [];
  let x = quietZone;
  for (const value of code128Values(text)) {
    [...CODE128_PATTERNS[value]].forEach((digit, index) => {
      const width = Number(digit);
      if (index % 2 === 0) {
        bars.push({ x, width });
      }
      x += width;
    });
  }
  return { bars, width: x + quietZone };
}
