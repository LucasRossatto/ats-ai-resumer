import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AuthController } from '@api/controllers/auth.controller';
import { AuthService } from '@application/services/auth.service';
import { ResponseService } from '@application/services/response.service';
import { Role } from '@domain/entities/enums/role.enum';
import { HTTP_REQUEST_DURATION_METRIC } from '@infrastructure/metrics/metrics.module';
import { getToken } from '@willsoto/nestjs-prometheus';

const userId = 'auth-1';

const currentUser = {
  id: userId,
  email: 'lucas@example.com',
  name: 'Lucas',
  roles: [Role.USER],
  createdAt: new Date('2026-01-01T09:00:00Z'),
};

/** Roles the stub guard puts on the request, per test. */
let callerRoles: Role[] = [Role.USER];

/**
 * Stands in for the JWT guard and puts on the request what the real strategy
 * would, so `@CurrentUserId()` and `@IsAdmin()` resolve.
 */
class StubAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = {
      id: userId,
      email: currentUser.email,
      roles: callerRoles,
    };
    return true;
  }
}

describe('AuthController', () => {
  let app: INestApplication;
  let authService: any;

  beforeEach(async () => {
    callerRoles = [Role.USER];

    authService = {
      getCurrentUser: jest.fn().mockResolvedValue(currentUser),
      findAccountById: jest.fn().mockResolvedValue(currentUser),
      deleteByAuthId: jest
        .fn()
        .mockResolvedValue({ message: 'User deleted successfully' }),
      updateCurrentUserProfile: jest.fn().mockResolvedValue(currentUser),
      register: jest.fn().mockResolvedValue({
        access_token: 'access',
        refresh_token: 'refresh',
        user: currentUser,
      }),
      login: jest.fn().mockResolvedValue({
        access_token: 'access',
        refresh_token: 'refresh',
        user: currentUser,
      }),
      logout: jest.fn().mockResolvedValue({ message: 'bye' }),
      refreshToken: jest.fn().mockResolvedValue({
        access_token: 'access2',
        refresh_token: 'refresh2',
      }),
      handleGoogleRedirect: jest.fn().mockResolvedValue({
        access_token: 'access',
        refresh_token: 'grefresh',
      }),
      changePassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password changed successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ResponseService,
        { provide: AuthService, useValue: authService },
        {
          provide: getToken(HTTP_REQUEST_DURATION_METRIC),
          useValue: { labels: () => ({ observe: jest.fn() }) },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(StubAuthGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    /** Mirrors the pipe `main.ts` installs, so the DTO rules apply here too. */
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /auth/me', () => {
    it('resolves to the current user route and not to the :id route', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(200);

      expect(authService.getCurrentUser).toHaveBeenCalledWith(userId);
    });

    it('answers with the user wrapped in the standard envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(200);

      expect(response.body.data.user).toMatchObject({
        id: userId,
        email: 'lucas@example.com',
        name: 'Lucas',
        roles: [Role.USER],
      });
    });

    it('reads the id from the token, never from the path', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(200);

      expect(authService.getCurrentUser).toHaveBeenCalledWith(userId);
      expect(authService.getCurrentUser).not.toHaveBeenCalledWith('me');
    });
  });

  describe('PATCH /auth/password', () => {
    const body = {
      currentPassword: 'CurrentPassword123',
      newPassword: 'NewPassword456',
    };

    it('passes the credentials of the token holder to the service', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .send(body)
        .expect(200);

      expect(authService.changePassword).toHaveBeenCalledWith(
        userId,
        body.currentPassword,
        body.newPassword,
      );
    });

    it('answers with the ok flag the settings page expects', async () => {
      const response = await request(app.getHttpServer())
        .patch('/auth/password')
        .send(body)
        .expect(200);

      expect(response.body.data).toEqual({ ok: true });
    });

    it('rejects a body missing the current password', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .send({ newPassword: body.newPassword })
        .expect(400);

      expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('rejects a field that is not part of the contract', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .send({ ...body, role: 'admin' })
        .expect(400);

      expect(authService.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/register', () => {
    const signup = {
      name: 'Lucas',
      email: 'lucas@example.com',
      password: 'Password123',
    };

    it('accepts a sign-up without lastname and age', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(signup)
        .expect(201);

      expect(authService.register).toHaveBeenCalledWith(signup);
    });

    it('still accepts them when the caller sends them', async () => {
      const full = { ...signup, lastname: 'Rossatto', age: 28 };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(full)
        .expect(201);

      expect(authService.register).toHaveBeenCalledWith(full);
    });

    it('keeps rejecting a sign-up with no name', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: signup.email, password: signup.password })
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('answers with the tokens and the same user shape as /auth/me', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(signup)
        .expect(201);

      expect(response.body.data).toMatchObject({
        access_token: 'access',
        user: { id: userId, email: currentUser.email },
      });
      expect(response.body.data).not.toHaveProperty('refresh_token');
    });
  });

  describe('refresh token cookie', () => {
    const setCookie = (res: request.Response) =>
      ([] as string[]).concat(res.headers['set-cookie'] ?? []).join(';');

    it('login sets an httpOnly cookie and keeps the token out of the body', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: currentUser.email, password: 'Password123!' })
        .expect(201);

      expect(setCookie(res)).toMatch(/refresh_token=refresh;.*HttpOnly/);
      expect(setCookie(res)).toContain('Path=/api/v1/auth');
      expect(res.body.data.access_token).toBe('access');
      expect(res.body.data).not.toHaveProperty('refresh_token');
    });

    it('register sets the cookie and keeps the token out of the body', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Lucas',
          email: 'lucas@example.com',
          password: 'Password123',
        })
        .expect(201);

      expect(setCookie(res)).toContain('refresh_token=refresh');
      expect(res.body.data).not.toHaveProperty('refresh_token');
    });

    it('refresh reads the cookie, rotates it and answers only the access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', 'refresh_token=old')
        .expect(201);

      expect(authService.refreshToken).toHaveBeenCalledWith('old');
      expect(setCookie(res)).toContain('refresh_token=refresh2');
      expect(res.body.data).toEqual({ access_token: 'access2' });
    });

    it('refresh without the cookie is 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .expect(401);

      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('logout clears the cookie on the same path', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(201);

      expect(setCookie(res)).toMatch(/refresh_token=;/);
      expect(setCookie(res)).toContain('Path=/api/v1/auth');
    });

    it('google callback sets the cookie and redirects without a token in the URL', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/google/redirect?code=c&state=s')
        .set('Cookie', 'oauth_state=s')
        .expect(302);

      expect(setCookie(res)).toContain('refresh_token=grefresh');
      expect(res.headers.location).toMatch(/\/auth\/callback$/);
    });

    it('google callback goes back to the app when consent is denied (no code)', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/google/redirect?error=access_denied')
        .expect(302);

      expect(res.headers.location).toContain('?error=oauth_failed');
      expect(authService.handleGoogleRedirect).not.toHaveBeenCalled();
    });

    it('google callback goes back to the app when Google rejects the code', async () => {
      authService.handleGoogleRedirect.mockRejectedValue(
        new Error('invalid_grant'),
      );
      const res = await request(app.getHttpServer())
        .get('/auth/google/redirect?code=c&state=s')
        .expect(302);

      expect(res.headers.location).toContain('?error=oauth_failed');
    });

    it('google callback redirects with an error on a bad state', async () => {
      authService.handleGoogleRedirect.mockRejectedValue(
        new UnauthorizedException(),
      );
      const res = await request(app.getHttpServer())
        .get('/auth/google/redirect?code=c&state=s')
        .expect(302);

      expect(res.headers.location).toContain('?error=invalid_state');
    });
  });

  describe('PATCH /auth/profile', () => {
    it('updates the profile of the caller, not of an id in the body', async () => {
      await request(app.getHttpServer())
        .patch('/auth/profile')
        .send({ name: 'Lucas Rossatto' })
        .expect(200);

      expect(authService.updateCurrentUserProfile).toHaveBeenCalledWith(
        userId,
        {
          name: 'Lucas Rossatto',
        },
      );
    });

    it('answers with the current user, so the client refreshes one object', async () => {
      const response = await request(app.getHttpServer())
        .patch('/auth/profile')
        .send({ name: 'Lucas Rossatto' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: userId,
        email: currentUser.email,
      });
    });

    it('rejects a field outside the profile contract, email included', async () => {
      await request(app.getHttpServer())
        .patch('/auth/profile')
        .send({ name: 'Lucas', email: 'other@example.com' })
        .expect(400);

      expect(authService.updateCurrentUserProfile).not.toHaveBeenCalled();
    });

    it('is not swallowed by the :id route', async () => {
      await request(app.getHttpServer())
        .patch('/auth/profile')
        .send({ name: 'Lucas' })
        .expect(200);

      expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/:id', () => {
    it('still reaches the lookup by id for any other path', async () => {
      await request(app.getHttpServer()).get('/auth/other-user').expect(200);

      expect(authService.findAccountById).toHaveBeenCalledWith(
        'other-user',
        userId,
        false,
      );
    });

    it('hands the service the admin flag of the caller', async () => {
      callerRoles = [Role.USER, Role.ADMIN];

      await request(app.getHttpServer()).get('/auth/other-user').expect(200);

      expect(authService.findAccountById).toHaveBeenCalledWith(
        'other-user',
        userId,
        true,
      );
    });

    it('answers with the current user shape, never the auth entity', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/other-user')
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: userId,
        email: currentUser.email,
      });
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty(
        'currentHashedRefreshToken',
      );
    });
  });

  describe('DELETE /auth/:id', () => {
    it('tells the service who is asking and whether they are admin', async () => {
      await request(app.getHttpServer()).delete('/auth/other-user').expect(200);

      expect(authService.deleteByAuthId).toHaveBeenCalledWith(
        'other-user',
        userId,
        false,
      );
    });

    it('reports the refusal of the service as a 403', async () => {
      authService.deleteByAuthId.mockRejectedValue(
        new ForbiddenException('You may only access your own account'),
      );

      await request(app.getHttpServer()).delete('/auth/other-user').expect(403);
    });
  });
});
