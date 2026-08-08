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
import { InsightsService } from '@application/services/insights.service';
import { ResponseService } from '@application/services/response.service';
import { InsightsOverview } from '@domain/entities/Insights';

@ApiTags('insights')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'insights',
  version: '1',
})
@UseInterceptors(LoggingInterceptor)
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the aggregated insights over the analysis history',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns averages, score trend, recurring issues, keyword frequency and per-resume performance.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getOverview(
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<InsightsOverview>> {
    const overview = await this.insightsService.getOverview(userId);
    return this.responseService.retrieved(
      overview,
      'Insights retrieved successfully',
    );
  }
}
