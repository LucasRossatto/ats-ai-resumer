import { Module } from '@nestjs/common';
import { PdfExtractionService } from '@infrastructure/pdf/pdf-extraction.service';
import { UploadService } from '@application/services/upload.service';

@Module({
  providers: [UploadService, PdfExtractionService],
  exports: [UploadService],
})
export class UploadModule {}
