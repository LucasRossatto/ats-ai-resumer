import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { LoggerService } from '@application/services/logger.service';

export interface ExtractedPdf {
  text: string;
  meta: {
    numPages: number;
  };
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
      const result = await parser.getText({ pageJoiner: '' });
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
