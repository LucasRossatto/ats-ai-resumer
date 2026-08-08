import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

/**
 * The native bcrypt exports are non-configurable, so they cannot be spied on
 * in place and the module is replaced wholesale instead.
 */
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import { AuthService } from '@application/services/auth.service';
import { LoggerService } from '@application/services/logger.service';
import { ProfileService } from '@application/services/profile.service';
import { Role } from '@domain/entities/enums/role.enum';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { ProfileDomainService } from '@domain/services/profile-domain.service';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: any;
  let profileRepository: any;
  let profileService: any;
  let commandBus: any;

  const userId = 'auth-1';

  const auth = {
    id: userId,
    email: 'lucas@example.com',
    password: '$2b$10$hashedpassword',
    currentHashedRefreshToken: '$2b$10$hashedrefreshtoken',
    role: [Role.USER],
    createdAt: new Date('2026-01-01T09:00:00Z'),
  };

  const profile = {
    id: 'profile-1',
    authId: userId,
    name: 'Lucas',
    age: 28,
  };

  beforeEach(async () => {
    authRepository = {
      findById: jest.fn().mockResolvedValue(auth),
    };

    profileRepository = {
      findByAuthId: jest.fn().mockResolvedValue(profile),
    };

    profileService = {
      updateMyProfile: jest.fn().mockResolvedValue(profile),
    };

    commandBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AuthDomainService,
        ProfileDomainService,
        { provide: ProfileService, useValue: profileService },
        { provide: 'IAuthRepository', useValue: authRepository },
        { provide: 'IProfileRepository', useValue: profileRepository },
        { provide: CommandBus, useValue: commandBus },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        {
          provide: LoggerService,
          useValue: { logger: jest.fn(), warning: jest.fn(), err: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('changePassword', () => {
    const currentPassword = 'CurrentPassword123';
    const newPassword = 'NewPassword456';

    beforeEach(() => {
      authRepository.findById.mockResolvedValue({
        ...auth,
        password: 'hashed-current',
      });
      authRepository.update = jest.fn().mockResolvedValue(auth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('stores the new password and revokes the refresh token', async () => {
      await service.changePassword(userId, currentPassword, newPassword);

      expect(authRepository.update).toHaveBeenCalledWith(userId, {
        password: 'hashed-new',
        currentHashedRefreshToken: null,
      });
    });

    it('reads the record with the password column included', async () => {
      await service.changePassword(userId, currentPassword, newPassword);

      expect(authRepository.findById).toHaveBeenCalledWith(userId, true);
    });

    it('rejects a wrong current password as unauthorized', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(userId, 'WrongPassword123', newPassword),
      ).rejects.toThrow(UnauthorizedException);
      expect(authRepository.update).not.toHaveBeenCalled();
    });

    it('reports a weak new password as a bad request, not a server error', async () => {
      await expect(
        service.changePassword(userId, currentPassword, 'weak'),
      ).rejects.toThrow(BadRequestException);
      expect(authRepository.update).not.toHaveBeenCalled();
    });

    it('refuses a new password equal to the current one', async () => {
      await expect(
        service.changePassword(userId, currentPassword, currentPassword),
      ).rejects.toThrow(BadRequestException);
      expect(authRepository.update).not.toHaveBeenCalled();
    });

    it('rejects a token whose auth record is gone', async () => {
      authRepository.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user behind the token', async () => {
      const currentUser = await service.getCurrentUser(userId);

      expect(currentUser).toEqual({
        id: userId,
        email: 'lucas@example.com',
        name: 'Lucas',
        roles: [Role.USER],
        createdAt: new Date('2026-01-01T09:00:00Z'),
      });
      expect(authRepository.findById).toHaveBeenCalledWith(userId);
      expect(profileRepository.findByAuthId).toHaveBeenCalledWith(userId);
    });

    it('never leaks the credentials of the auth record', async () => {
      const currentUser = await service.getCurrentUser(userId);

      expect(currentUser).not.toHaveProperty('password');
      expect(currentUser).not.toHaveProperty('currentHashedRefreshToken');
    });

    it('re-reads the record instead of trusting the claims of the token', async () => {
      authRepository.findById.mockResolvedValue({
        ...auth,
        role: [Role.USER, Role.ADMIN],
      });

      const currentUser = await service.getCurrentUser(userId);

      expect(currentUser.roles).toEqual([Role.USER, Role.ADMIN]);
    });

    it('answers with a null name when the profile is not created yet', async () => {
      profileRepository.findByAuthId.mockResolvedValue(null);

      const currentUser = await service.getCurrentUser(userId);

      expect(currentUser.name).toBeNull();
      expect(currentUser.email).toBe('lucas@example.com');
    });

    it('rejects a token whose auth record is gone', async () => {
      authRepository.findById.mockResolvedValue(null);

      await expect(service.getCurrentUser(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(profileRepository.findByAuthId).not.toHaveBeenCalled();
    });
  });

  describe('account authorization', () => {
    const owner = userId;
    const stranger = 'auth-2';

    beforeEach(() => {
      commandBus.execute.mockResolvedValue(undefined);
    });

    describe('findAccountById', () => {
      it('lets the owner read its own account', async () => {
        const account = await service.findAccountById(owner, owner, false);

        expect(account.id).toBe(owner);
      });

      it('lets an admin read somebody else', async () => {
        await expect(
          service.findAccountById(owner, stranger, true),
        ).resolves.toBeDefined();
      });

      it('refuses a plain user reading somebody else', async () => {
        await expect(
          service.findAccountById(owner, stranger, false),
        ).rejects.toThrow(ForbiddenException);
      });

      it('refuses before reading, so a 403 cannot be told from a 404', async () => {
        await expect(
          service.findAccountById('auth-unknown', stranger, false),
        ).rejects.toThrow(ForbiddenException);
        expect(authRepository.findById).not.toHaveBeenCalled();
      });
    });

    describe('deleteByAuthId', () => {
      it('lets the owner delete its own account', async () => {
        await service.deleteByAuthId(owner, owner, false);

        expect(commandBus.execute).toHaveBeenCalled();
      });

      it('lets an admin delete somebody else', async () => {
        await service.deleteByAuthId(owner, stranger, true);

        expect(commandBus.execute).toHaveBeenCalled();
      });

      it('refuses a plain user deleting somebody else', async () => {
        await expect(
          service.deleteByAuthId(owner, stranger, false),
        ).rejects.toThrow(ForbiddenException);
      });

      it('refuses before touching the repositories or the command bus', async () => {
        await expect(
          service.deleteByAuthId(owner, stranger, false),
        ).rejects.toThrow(ForbiddenException);

        expect(authRepository.findById).not.toHaveBeenCalled();
        expect(commandBus.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateCurrentUserProfile', () => {
    const updates = { name: 'Lucas Rossatto' };

    it('delegates the write to the profile service, scoped to the caller', async () => {
      await service.updateCurrentUserProfile(userId, updates);

      expect(profileService.updateMyProfile).toHaveBeenCalledWith(
        updates,
        userId,
      );
    });

    it('answers with the current user rather than the profile entity', async () => {
      profileService.updateMyProfile.mockResolvedValue({
        ...profile,
        name: 'Lucas Rossatto',
      });

      const currentUser = await service.updateCurrentUserProfile(
        userId,
        updates,
      );

      expect(currentUser).toEqual({
        id: userId,
        email: 'lucas@example.com',
        name: 'Lucas Rossatto',
        roles: [Role.USER],
        createdAt: new Date('2026-01-01T09:00:00Z'),
      });
      expect(currentUser).not.toHaveProperty('authId');
    });

    it('refuses to write when the auth record is gone', async () => {
      authRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateCurrentUserProfile(userId, updates),
      ).rejects.toThrow(NotFoundException);
      expect(profileService.updateMyProfile).not.toHaveBeenCalled();
    });
  });
});
