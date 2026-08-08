import { Module } from '@nestjs/common';
import { PdfExtractionService } from '@infrastructure/pdf/pdf-extraction.service';
import { StructuredParserService } from '@infrastructure/ai/structured-parser.service';
import { UploadService } from '@application/services/upload.service';

@Module({
  providers: [UploadService, PdfExtractionService, StructuredParserService],
  exports: [UploadService, StructuredParserService],
})
export class UploadModule {}
