import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { LoggerService } from '@application/services/logger.service';

export interface ExtractedPdf {
  text: string;
  meta: {
    numPages: number;
  };
}

/** A resume longer than this is not a resume; it also bounds the extraction cost. */
export const MAX_PDF_PAGES = 10;

export class PdfTooLongError extends Error {
  constructor() {
    super(`The PDF has more than ${MAX_PDF_PAGES} pages`);
    this.name = 'PdfTooLongError';
  }
}

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

@Injectable()
export class PdfExtractionService {
  constructor(private readonly logger: LoggerService) {}

  async extractText(buffer: Buffer): Promise<ExtractedPdf> {
    const context = { module: 'PdfExtractionService', method: 'extractText' };
    const parser = new PDFParse({ data: buffer });

    try {
      // pageJoiner defaults to '\n-- page_number of total_number --', which would
      // leak page markers into the extracted resume text.
      const result = await parser.getText({
        pageJoiner: '',
        first: MAX_PDF_PAGES,
      });

      if (result.total > MAX_PDF_PAGES) {
        throw new PdfTooLongError();
      }

      const numPages = result.pages?.length ?? result.total ?? 0;

      this.logger.logger(
        `PDF text extracted - pages: ${numPages}, characters: ${result.text.length}`,
        context,
      );

      return {
        text: result.text,
        meta: { numPages },
      };
    } catch (error) {
      if (error instanceof PdfTooLongError) {
        throw error;
      }
      this.logger.err(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : error}`,
        context,
      );
      throw new PdfExtractionError('Could not read the PDF file');
    } finally {
      await parser.destroy();
    }
  }
}
