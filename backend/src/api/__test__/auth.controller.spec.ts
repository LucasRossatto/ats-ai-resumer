import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from '@api/controllers/auth.controller';
import { AuthService } from '@application/services/auth.service';
import { ResponseService } from '@application/services/response.service';
import { Role } from '@domain/entities/enums/role.enum';

const userId = 'auth-1';

const currentUser = {
  id: userId,
  email: 'lucas@example.com',
  name: 'Lucas',
  roles: [Role.USER],
  createdAt: new Date('2026-01-01T09:00:00Z'),
};

/**
 * Stands in for the JWT guard and puts on the request what the real strategy
 * would, so `@CurrentUserId()` resolves.
 */
class StubAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = {
      id: userId,
      email: currentUser.email,
      roles: currentUser.roles,
    };
    return true;
  }
}

describe('AuthController', () => {
  let app: INestApplication;
  let authService: any;

  beforeEach(async () => {
    authService = {
      getCurrentUser: jest.fn().mockResolvedValue(currentUser),
      findByAuthId: jest.fn().mockResolvedValue({ id: 'other-user' }),
      changePassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password changed successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ResponseService,
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(StubAuthGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
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
      expect(authService.findByAuthId).not.toHaveBeenCalled();
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

  describe('GET /auth/:id', () => {
    it('still reaches the lookup by id for any other path', async () => {
      await request(app.getHttpServer()).get('/auth/other-user').expect(200);

      expect(authService.findByAuthId).toHaveBeenCalledWith('other-user');
      expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });
  });
});
