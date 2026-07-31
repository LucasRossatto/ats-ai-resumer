import {
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@constants';
import { UploadFileDto } from '@api/dto/upload/upload-file.dto';
import { SuccessResponseDto } from '@api/dto/common/api-response.dto';
import { MulterExceptionFilter } from '@application/filters/multer-exception.filter';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { UploadService } from '@application/services/upload.service';
import { ResponseService } from '@application/services/response.service';
import { ExtractedPdf } from '@infrastructure/pdf/pdf-extraction.service';

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'upload',
  version: '1',
})
@UseFilters(MulterExceptionFilter)
@UseInterceptors(LoggingInterceptor)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly responseService: ResponseService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Upload a PDF and extract its text' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({ status: 201, description: 'Text extracted successfully.' })
  @ApiResponse({ status: 400, description: 'Missing file or file is not a PDF.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 413, description: 'File exceeds 5MB.' })
  @ApiResponse({ status: 422, description: 'PDF is corrupted or unreadable.' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES, files: 1 },
      fileFilter: (_req, file, callback) => {
        callback(null, ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype));
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SuccessResponseDto<ExtractedPdf>> {
    const extracted = await this.uploadService.extractPdf(file);
    return this.responseService.created(extracted, 'PDF processed successfully');
  }
}
