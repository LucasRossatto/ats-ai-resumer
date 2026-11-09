import { SuccessResponseDto } from '@api/dto/common/api-response.dto';
import { UpdateProfileDto } from '@api/dto/update-profile.dto';
import { Roles } from '@application/auth/decorators/roles.decorator';
import { RolesGuard } from '@application/auth/guards/roles.guard';
import {
  CurrentUserId,
  IsAdmin,
} from '@application/decorators/current-user.decorator';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { AuthService } from '@application/services/auth.service';
import { ProfileService } from '@application/services/profile.service';
import { ResponseService } from '@application/services/response.service';
import { CurrentUser } from '@domain/entities/Auth';
import { Role } from '@domain/entities/enums/role.enum';
import { Profile } from '@domain/entities/Profile';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Controller({
  path: 'profile',
  version: '1',
})
@UseInterceptors(LoggingInterceptor)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('all')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns all users',
    type: [Profile],
  })
  async getAll(): Promise<SuccessResponseDto<Profile[]>> {
    const profiles = await this.profileService.find();
    return this.responseService.retrieved(
      profiles,
      'All profiles retrieved successfully',
    );
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admins')
  @ApiOperation({ summary: 'Get all admin users' })
  @ApiResponse({
    status: 200,
    description: 'Returns all admin users',
    type: [Profile],
  })
  async getAdmins(): Promise<SuccessResponseDto<Profile[]>> {
    const admins = await this.profileService.findByRole(Role.ADMIN);
    return this.responseService.retrieved(
      admins,
      'Admin profiles retrieved successfully',
    );
  }

  /**
   * Only the owner or an admin reads a profile. Anyone else gets the same 404
   * as for an id that does not exist, so the answer does not reveal which ids
   * are taken. There is no POST here: the profile is created at sign-up.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @IsAdmin() isAdmin: boolean,
  ) {
    if (!id) {
      throw new BadRequestException('Profile id is required');
    }

    const profile = await this.profileService.findById(id);
    if (!profile || (profile.authId !== userId && !isAdmin)) {
      throw new NotFoundException('Profile not found');
    }

    return this.responseService.retrieved(
      profile,
      'Profile retrieved successfully',
    );
  }

  /**
   * Answers with `CurrentUser` rather than the `Profile` entity, and delegates
   * to the same service method as `PATCH /auth/profile`. The client keeps one
   * object for the logged-in user instead of reconciling a profile against it.
   */
  @Put('me')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid profile data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateMyProfile(
    @Body() updates: UpdateProfileDto,
    @CurrentUserId() requestingUserId: string,
  ): Promise<SuccessResponseDto<CurrentUser>> {
    const user = await this.authService.updateCurrentUserProfile(
      requestingUserId,
      updates,
    );
    return this.responseService.updated(user, 'Profile updated successfully');
  }
}
