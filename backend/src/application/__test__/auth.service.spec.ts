import { NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@application/services/auth.service';
import { LoggerService } from '@application/services/logger.service';
import { Role } from '@domain/entities/enums/role.enum';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { ProfileDomainService } from '@domain/services/profile-domain.service';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: any;
  let profileRepository: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AuthDomainService,
        ProfileDomainService,
        { provide: 'IAuthRepository', useValue: authRepository },
        { provide: 'IProfileRepository', useValue: profileRepository },
        { provide: CommandBus, useValue: { execute: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        {
          provide: LoggerService,
          useValue: { logger: jest.fn(), warning: jest.fn(), err: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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
});
