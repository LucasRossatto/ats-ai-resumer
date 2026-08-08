import { LoginAuthDto } from '@api/dto/auth/login-auth.dto';
import { RefreshTokenDto } from '@api/dto/auth/refresh-token.dto';
import { RegisterAuthDto } from '@api/dto/auth/register-auth.dto';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { AuthService } from '@application/services/auth.service';
import { ResponseService } from '@application/services/response.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request as ExpressRequest, Response } from 'express';
import {
  CurrentUserId,
  IsAdmin,
} from '@application/decorators/current-user.decorator';
import { ChangePasswordDto } from '@api/dto/auth/change-password.dto';
import { UpdatePasswordDto } from '@api/dto/auth/update-password.dto';
import { UpdateProfileDto } from '@api/dto/update-profile.dto';

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: '1',
})
@UseGuards(ThrottlerGuard)
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async register(@Body() registerDto: RegisterAuthDto) {
    const result = await this.authService.register(registerDto);
    return this.responseService.created(
      result,
      'User registration initiated successfully',
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginDto: LoginAuthDto) {
    const result = await this.authService.login(loginDto);
    return this.responseService.success('Login successful', result);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out the current user' })
  @ApiResponse({ status: 200, description: 'User successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Request() req) {
    const result = await this.authService.logout(req.user.id);
    return this.responseService.success(result.message);
  }

  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for the current user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
    return this.responseService.success(result.message);
  }

  /**
   * Same operation as `POST change-password`, under the verb and the body the
   * settings page calls. Both delegate to the one service method: the password
   * rules and the refresh token revocation live in a single place.
   */
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the password of the current user' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({
    status: 400,
    description: 'New password is too weak or equal to the current one.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized, or current password is incorrect.',
  })
  async updatePassword(
    @CurrentUserId() userId: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return this.responseService.updated(
      { ok: true },
      'Password updated successfully',
    );
  }

  /**
   * The profile update of the logged-in user, under `/auth` like everything
   * else scoped to the current session, following the precedent of
   * `PATCH password`. `PUT /profile/me` remains and calls the same service
   * method, so the two paths cannot answer differently.
   */
  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the profile of the current user' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid profile data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateProfile(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.authService.updateCurrentUserProfile(userId, dto);
    return this.responseService.updated(user, 'Profile updated successfully');
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'New access token generated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(
      refreshTokenDto.refresh_token,
    );
    return this.responseService.success('Token refreshed successfully', result);
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth(@Res() res: Response) {
    const { redirectUrl, state } = this.authService.initiateGoogleAuth();
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    res.redirect(redirectUrl);
  }

  @Get('google/redirect')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  async googleAuthRedirect(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const storedState = req.cookies['oauth_state'];
    const result = await this.authService.handleGoogleRedirect(
      code,
      state,
      storedState,
    );

    // Clear the cookie after use
    res.clearCookie('oauth_state');

    return this.responseService.success(
      'Google authentication successful',
      result,
    );
  }

  /**
   * Declared before `:id`, which would otherwise match `/auth/me` first and
   * look up a user whose id is the literal string "me".
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the current user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getMe(@CurrentUserId() userId: string) {
    const user = await this.authService.getCurrentUser(userId);
    return this.responseService.retrieved(
      { user },
      'Current user retrieved successfully',
    );
  }

  /**
   * Readable by the owner of the account and by an admin, nobody else. Answers
   * with `CurrentUser`, never the `AuthUser` entity: that one carries the
   * password hash, the refresh token hash and the email blind index, and none
   * of them may leave the server.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by auth id (owner or admin)' })
  @ApiResponse({ status: 200, description: 'Returns the user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not your account.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getProfile(
    @Param('id') id: string,
    @CurrentUserId() requestingUserId: string,
    @IsAdmin() isAdmin: boolean,
  ) {
    const user = await this.authService.findAccountById(
      id,
      requestingUserId,
      isAdmin,
    );
    return this.responseService.retrieved(
      user,
      'User profile retrieved successfully',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete user (auth + profile) by auth id (owner or admin)',
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not your account.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUserId() requestingUserId: string,
    @IsAdmin() isAdmin: boolean,
  ) {
    const result = await this.authService.deleteByAuthId(
      id,
      requestingUserId,
      isAdmin,
    );
    return this.responseService.success(result.message);
  }
}
