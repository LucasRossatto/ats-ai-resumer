import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@constants';
import { SuccessResponseDto } from '@api/dto/common/api-response.dto';
import { ApplyRewritesDto } from '@api/dto/resume/apply-rewrites.dto';
import { CreateResumeDto } from '@api/dto/resume/create-resume.dto';
import { DiffVersionsDto } from '@api/dto/resume/diff-versions.dto';
import { CurrentUserId } from '@application/decorators/current-user.decorator';
import { MulterExceptionFilter } from '@application/filters/multer-exception.filter';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { ResponseService } from '@application/services/response.service';
import {
  AppliedRewrites,
  CreatedResume,
  ResumeService,
  ResumeWithVersions,
  VersionDiff,
} from '@application/services/resume.service';
import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'resumes',
  version: '1',
})
@UseFilters(MulterExceptionFilter)
@UseInterceptors(LoggingInterceptor)
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly responseService: ResponseService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Upload a PDF and create a resume with its V1' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateResumeDto })
  @ApiResponse({ status: 201, description: 'Resume created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Missing file or file is not a PDF.',
  })
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
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateResumeDto,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<CreatedResume>> {
    const created = await this.resumeService.createFromUpload(
      file,
      body.title,
      userId,
    );
    return this.responseService.created(created, 'Resume created successfully');
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/rewrite')
  @ApiOperation({
    summary: 'Apply the bullet rewrites of an analysis as a new version',
  })
  @ApiResponse({
    status: 201,
    description: 'New version created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Analysis has no rewrites to apply.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Resume, analysis or version not found.',
  })
  async rewrite(
    @Param('id') id: string,
    @Body() body: ApplyRewritesDto,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<AppliedRewrites>> {
    const applied = await this.resumeService.applyRewrites(
      id,
      body.analysisId,
      userId,
    );
    return this.responseService.created(
      applied,
      'Rewrites applied successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List my resumes' })
  @ApiResponse({
    status: 200,
    description: 'Returns the resumes of the current user.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<Resume[]>> {
    const resumes = await this.resumeService.findAllByUser(userId);
    return this.responseService.retrieved(
      resumes,
      'Resumes retrieved successfully',
    );
  }

  @Get(':id/diff')
  @ApiOperation({ summary: 'Compare the text of two versions of a resume' })
  @ApiResponse({
    status: 200,
    description: 'Returns the diff parts and stats.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or missing query params.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resume or version not found.' })
  async diff(
    @Param('id') id: string,
    @Query() query: DiffVersionsDto,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<VersionDiff>> {
    const diff = await this.resumeService.diffVersions(
      id,
      query.from,
      query.to,
      userId,
      query.mode,
    );
    return this.responseService.retrieved(diff, 'Diff retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a resume with its versions' })
  @ApiResponse({
    status: 200,
    description: 'Returns the resume and its versions.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resume not found.' })
  async findOne(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<ResumeWithVersions>> {
    const result = await this.resumeService.findByIdWithVersions(id, userId);
    return this.responseService.retrieved(
      result,
      'Resume retrieved successfully',
    );
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: 'Get a single version of a resume' })
  @ApiResponse({ status: 200, description: 'Returns the version.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resume or version not found.' })
  async findVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<ResumeVersion>> {
    const version = await this.resumeService.findVersion(id, versionId, userId);
    return this.responseService.retrieved(
      version,
      'Version retrieved successfully',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resume not found.' })
  async remove(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.resumeService.delete(id, userId);
    return this.responseService.deleted('Resume deleted successfully');
  }
}
