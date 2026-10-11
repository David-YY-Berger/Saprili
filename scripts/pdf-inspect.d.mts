// bisiyata dishmaya, leharbot ahava biyisral
export interface PdfInspectionOptions {
  pageCount: number;
  widthMm: number;
  heightMm: number;
  toleranceMm?: number;
}

export interface PdfInspectionResult {
  pageCount: number;
  widthMm: number;
  heightMm: number;
  hasEmbeddedFont: boolean;
}

export function inspectPdf(
  input: Uint8Array | string,
  options: PdfInspectionOptions,
): Promise<PdfInspectionResult>;
