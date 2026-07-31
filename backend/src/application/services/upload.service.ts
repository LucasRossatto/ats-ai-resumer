import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  PDF_MAGIC_NUMBER,
} from '@constants';
import { LoggerService } from '@application/services/logger.service';
import {
  ExtractedPdf,
  PdfExtractionError,
  PdfExtractionService,
} from '@infrastructure/pdf/pdf-extraction.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly pdfExtractionService: PdfExtractionService,
    private readonly logger: LoggerService,
  ) {}

  async extractPdf(file: Express.Multer.File): Promise<ExtractedPdf> {
    const context = { module: 'UploadService', method: 'extractPdf' };

    this.validate(file, context);

    this.logger.logger(
      `Starting PDF extraction for file: ${file.originalname} (${file.size} bytes)`,
      context,
    );

    try {
      return await this.pdfExtractionService.extractText(file.buffer);
    } catch (error) {
      if (error instanceof PdfExtractionError) {
        throw new UnprocessableEntityException(
          'The PDF file is corrupted, encrypted or unreadable',
        );
      }
      throw error;
    }
  }

  private validate(
    file: Express.Multer.File,
    context: { module: string; method: string },
  ): void {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      this.logger.warning(
        `Upload rejected - unsupported mime type: ${file.mimetype}`,
        context,
      );
      throw new BadRequestException('Only PDF files are accepted');
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      this.logger.warning(
        `Upload rejected - file too large: ${file.size} bytes`,
        context,
      );
      throw new PayloadTooLargeException('The file must be at most 5MB');
    }

    if (!this.hasPdfSignature(file.buffer)) {
      this.logger.warning(
        `Upload rejected - content is not a PDF: ${file.originalname}`,
        context,
      );
      throw new BadRequestException('Only PDF files are accepted');
    }
  }

  private hasPdfSignature(buffer: Buffer): boolean {
    return (
      Buffer.isBuffer(buffer) &&
      buffer.subarray(0, PDF_MAGIC_NUMBER.length).toString('latin1') ===
        PDF_MAGIC_NUMBER
    );
  }
}
