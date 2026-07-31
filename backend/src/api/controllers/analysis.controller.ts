import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessResponseDto } from '@api/dto/common/api-response.dto';
import { AnalyzeResumeDto } from '@api/dto/resume/analyze-resume.dto';
import { CurrentUserId } from '@application/decorators/current-user.decorator';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { AnalysisService } from '@application/services/analysis.service';
import { ResponseService } from '@application/services/response.service';
import { Analysis } from '@domain/entities/Analysis';

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'resumes',
  version: '1',
})
@UseInterceptors(LoggingInterceptor)
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly responseService: ResponseService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':id/analyzer')
  @ApiOperation({ summary: 'Analyze a resume version and store the result' })
  @ApiResponse({ status: 201, description: 'Analysis created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resume or version not found.' })
  @ApiResponse({ status: 503, description: 'The analysis model is unavailable.' })
  async analyze(
    @Param('id') id: string,
    @Body() body: AnalyzeResumeDto,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<Analysis>> {
    const analysis = await this.analysisService.analyzeResume(id, userId, {
      targetRole: body.targetRole,
      versionId: body.versionId,
    });
    return this.responseService.created(
      analysis,
      'Resume analyzed successfully',
    );
  }

  @Get(':id/analysis')
  @ApiOperation({ summary: 'List every analysis of a resume, newest first' })
  @ApiResponse({ status: 200, description: 'Returns the analyses of the resume.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resume not found.' })
  async findAll(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<Analysis[]>> {
    const analyses = await this.analysisService.findAllByResume(id, userId);
    return this.responseService.retrieved(
      analyses,
      'Analyses retrieved successfully',
    );
  }

  @Get(':id/versions/:versionId/analysis')
  @ApiOperation({ summary: 'Get the latest analysis of a resume version' })
  @ApiResponse({ status: 200, description: 'Returns the analysis.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Resume, version or analysis not found.',
  })
  async findByVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<Analysis>> {
    const analysis = await this.analysisService.findLatestByVersion(
      id,
      versionId,
      userId,
    );
    return this.responseService.retrieved(
      analysis,
      'Analysis retrieved successfully',
    );
  }
}
