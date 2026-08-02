import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessResponseDto } from '@api/dto/common/api-response.dto';
import { CurrentUserId } from '@application/decorators/current-user.decorator';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { ResponseService } from '@application/services/response.service';
import { VersionsService } from '@application/services/versions.service';
import { VersionList } from '@domain/entities/Version';

@ApiTags('versions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'versions',
  version: '1',
})
@UseInterceptors(LoggingInterceptor)
export class VersionsController {
  constructor(
    private readonly versionsService: VersionsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List every resume version of the user, newest first',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns each version with its resume, its score when analyzed, and the totals per source type.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getAll(
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<VersionList>> {
    const versions = await this.versionsService.getAll(userId);
    return this.responseService.retrieved(
      versions,
      'Versions retrieved successfully',
    );
  }
}
