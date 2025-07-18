declare module "pdf-parse" {
  export interface PDFInfo {
    PDFFormatVersion: string;
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  }

  export interface PDFMetadata {
    _metadata?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }

  export interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata | null;
    text: string;
    version: string;
  }

  function pdf(dataBuffer: Buffer | ArrayBuffer | Uint8Array): Promise<PDFData>;
  export default pdf;
}