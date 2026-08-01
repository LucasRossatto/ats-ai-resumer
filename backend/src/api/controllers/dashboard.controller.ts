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
import { DashboardService } from '@application/services/dashboard.service';
import { ResponseService } from '@application/services/response.service';
import { DashboardOverview } from '@domain/entities/Dashboard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'dashboard',
  version: '1',
})
@UseInterceptors(LoggingInterceptor)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the dashboard overview of the current user' })
  @ApiResponse({
    status: 200,
    description:
      'Returns totals, latest resume, score series, version stack, KPIs and activity.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getOverview(
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<DashboardOverview>> {
    const overview = await this.dashboardService.getOverview(userId);
    return this.responseService.retrieved(
      overview,
      'Dashboard retrieved successfully',
    );
  }
}
