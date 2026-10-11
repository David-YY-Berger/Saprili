// bisiyata dishmaya, leharbot ahava biyisral
const MM_PER_INCH = 25.4;

export const cmToMm = (cm: number): number => cm * 10;
export const mmToPx = (mm: number, dpi: number): number => (mm / MM_PER_INCH) * dpi;
export const pxToMm = (px: number, dpi: number): number => (px / dpi) * MM_PER_INCH;

/** CSS length in mm, rounded to 4 decimals to avoid floating-point noise in markup. */
export const mmToCss = (mm: number): string => `${Number(mm.toFixed(4))}mm`;
