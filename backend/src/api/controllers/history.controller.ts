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
import { HistoryService } from '@application/services/history.service';
import { ResponseService } from '@application/services/response.service';
import { History } from '@domain/entities/History';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'history',
  version: '1',
})
@UseInterceptors(LoggingInterceptor)
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the full activity timeline of the user, newest first',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns uploads, rewrites and analyses merged into one timeline, with the totals per event type.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getAll(
    @CurrentUserId() userId: string,
  ): Promise<SuccessResponseDto<History>> {
    const history = await this.historyService.getAll(userId);
    return this.responseService.retrieved(
      history,
      'History retrieved successfully',
    );
  }
}
