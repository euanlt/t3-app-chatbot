declare module "pdf-parse/lib/pdf-parse.js" {
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
    _metadata?: any;
    metadata?: any;
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